# ADR-0041 — Transferencia de imágenes por SCP y carga local con `docker load -i`

- **Estado:** Vigente por pedido explícito #161
- **Fecha:** 2026-10-29

## Contexto

Desde el 29/10/2026, el job `transferir` de `.github/workflows/deploy.yml` comenzó a quedarse colgado en el paso «Transferir imágenes Docker al servidor» durante la carga de `imagen-backend.tar.gz`, agotando el tiempo límite de 10 minutos sin emitir salida (#161).

La evidencia recopilada en las ejecuciones de GitHub Actions demostró que:

1. **Bloqueo por falta de `EOF` en `stdin` sobre OpenSSH para Windows:** En la ejecución con límite de tiempo de 10 minutos (`run 40894890535`), las líneas `Loaded image: actualizacion-datos-backend:...` aparecieron exactamente 48 ms antes del mensaje de cancelación por timeout del paso (`14:58:20.1365` frente a `14:58:20.1839`). Esto confirma que los 134 MB del archivo `.tar.gz` ya se habían transferido y el demonio `dockerd` ya había extraído las capas minutos antes, pero el cliente `docker.exe` en el servidor Windows permanecía bloqueado leyendo `os.Stdin` a la espera del indicador de fin de entrada (`EOF`). Cuando el runner de GitHub cortó el proceso `ssh` local por timeout, el cierre abrupto de la sesión SSH cerró por fin la tubería en Windows, destrabando `docker load`.
2. **Comportamiento conocido de `Win32-OpenSSH`:** Al ejecutar `ssh usuario@servidor "docker load" < archivo.tar.gz` contra un servidor Windows con `OpenSSH Server`, el mensaje `SSH_MSG_CHANNEL_EOF` enviado por el cliente al terminar de leer el archivo local puede no cerrar el descriptor de escritura de la tubería estándar entregada al subproceso `docker.exe` (o a los procesos intermedios del shell), dejando la petición HTTP chunked hacia `//./pipe/docker_engine` abierta indefinidamente.
3. **Procesos huérfanos:** Las ejecuciones canceladas manualmente mientras `docker load` esperaba `EOF` podían dejar procesos `docker.exe` colgados en el servidor.
4. **Acumulación de nodos en la tailnet:** El diagnóstico con `tailscale status` mostró decenas de nodos `github-runnervm*` desconectados acumulados de despliegues anteriores, producto de usar un `TAILSCALE_AUTHKEY` creado sin la propiedad efímera (*Ephemeral*).

## Opciones

1. **Mantener la redirección por `stdin` (`ssh ... "docker load" < archivo.tar.gz`) e intentar ajustar `sshd` en Windows:**
   - *Ventajas:* No escribe un archivo temporal en el directorio de despliegue.
   - *Desventajas:* Queda expuesto al manejo de tuberías y `ConPTY` de `Win32-OpenSSH` y de Docker Desktop ante actualizaciones del sistema operativo; oculta en un único comando cuánto tiempo toma la red frente al disco, e impide reintentar la carga en Docker sin volver a transmitir los 134 MB por la VPN.
2. **Copiar el artefacto `.tar.gz` mediante `scp` y cargarlo desde archivo local con `docker load -i` (`ssh -n`):**
   - *Ventajas:* No depende en absoluto de la propagación de `EOF` por `stdin` en SSH (`scp` escribe un archivo con tamaño conocido y `docker load -i` lo abre directamente en el sistema de archivos local de Windows, mientras `ssh -n` redirige `stdin` desde `/dev/null`). Separa en el log los tiempos de red (`scp`) y de importación en Docker (`docker load -i`), permite reintentar `docker load -i` sin retransmitir el archivo y garantiza que cualquier fallo devuelva un error inmediato y claro.
   - *Desventajas:* Requiere escribir temporalmente el `.tar.gz` (~134 MB para backend y ~21 MB para frontend) en `${DIR}` y eliminarlo al terminar.

## Decisión

Se adopta la **Opción 2** para la etapa `transferir` de `.github/workflows/deploy.yml`:

1. **Preparación del directorio y limpieza de procesos `docker load` huérfanos:** Antes de iniciar la copia de imágenes, se garantiza la creación del directorio `${DIR}/deploy/nginx` y se terminan en el servidor cualesquiera procesos `docker.exe` rezagados cuya línea de comandos corresponda a `docker load` de ejecuciones canceladas anteriores.
2. **Transferencia por `scp` y carga con `docker load -i`:** Para cada archivo (`imagen-backend.tar.gz` e `imagen-frontend.tar.gz`):
   - Se copia el archivo comprimido a `${DIR}/${archivo}` con `scp`, registrando en el log su tamaño y el tiempo exacto de transferencia por red.
   - Se ejecuta `ssh -n ... "docker load -i \"${DIR}/${archivo}\""` (con hasta 2 intentos locales ante fallos transitorios sin volver a transferir el archivo por red), registrando por separado el tiempo de carga en Docker.
3. **Eliminación garantizada del archivo temporal:** Inmediatamente después de la carga (haya tenido éxito o haya agotado sus reintentos), se elimina `${DIR}/${archivo}` en el servidor con `Remove-Item -Force -ErrorAction SilentlyContinue` antes de evaluar la salida del paso, evitando dejar archivos residuales en el disco `C:`.
4. **Clave efímera en Tailscale:** Se documenta en `README.md` que `TAILSCALE_AUTHKEY` debe generarse con las opciones **Reusable** y **Ephemeral** activadas (y etiqueta de ACL), de modo que la tailnet elimine automáticamente los nodos `github-runnervm*` al finalizar cada job.

## Consecuencias

- **Fiabilidad:** El despliegue deja de depender del cierre de `stdin` en `Win32-OpenSSH`, eliminando los bloqueos de 10 minutos en `docker load` y completando la transferencia y carga en menos de 5 minutos.
- **Observabilidad:** Los logs de GitHub Actions muestran por separado la duración de la copia por red (`scp`) y la duración de la descompresión e importación en Docker (`docker load -i`).
- **Limpieza en disco y red:** Los archivos `.tar.gz` temporales se borran siempre al concluir cada imagen, y los procesos `docker load` huérfanos previos se limpian automáticamente antes de cargar.

## ADR relacionados

- [ADR-0011](ADR-0011-despliegue-a-produccion.md) — Despliegue automático a producción (actualiza el mecanismo concreto del punto 4 de transferencia por tubería `stdin` a `scp` + `docker load -i`).
- [ADR-0015](ADR-0015-despliegue-por-etapas.md) — Despliegue dividido en etapas.
- [ADR-0031](ADR-0031-auditoria-infraestructura-y-seguridad-en-despliegue.md) — Seguridad en origen, auditoría de infraestructura y verificación de despliegue.
