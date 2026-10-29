# ADR-0011 — Despliegue automático a producción

- **Estado:** Vigente
- **Fecha:** 2026-10-22

## Contexto

La aplicación requiere desplegarse de manera continua, automatizada y desatendida en un único servidor de producción ubicado en la red privada de la institución educativa. 

Restricciones y antecedentes:
- El repositorio es público (`IstpetDev/actualizacion_datos`). Por seguridad, está prohibido usar GitHub Self-Hosted Runners porque cualquier PR externo desde un fork podría ejecutar código arbitrario dentro del servidor institucional (regla establecida en AGENTS.md y README.md).
- La arquitectura elegida previamente es la **Opción B: Empuje por red privada**.
- El [ADR-0007](ADR-0007-autenticacion-con-cedula.md) exige autenticación mediante cookie de sesión `HttpOnly`, `Secure` y `SameSite=Strict`. Esto impone que el Frontend (SPA Angular) y la API (.NET) se sirvan bajo el mismo origen exacto.
- No se cuenta con un registro privado de contenedores ni se desea depender de registros externos de terceros para almacenar las imágenes de producción.
- Las migraciones de base de datos no deben ser silenciosas ni aplicarse sobre servicios en ejecución: si una migración falla, el despliegue debe abortar de inmediato sin reemplazar los contenedores actuales.
- Se requiere un mecanismo de reversión (*rollback*) ante incidentes sin intervención manual compleja.

## Opciones

### Conexión a la red privada desde GitHub Actions
1. **Abrir puertos en el router hacia el servidor:** Inseguro, expone SSH a escaneos y ataques de fuerza bruta en internet.
2. **WireGuard manual:** Eficiente, pero requiere configuración de túneles punto a punto y gestión de claves complejas en el servidor.
3. **Tailscale (VPN Mesh WireGuard sobre Zero Trust):** Rápido de configurar, ya activo en la infraestructura institucional (`istpet-dev-server`), dispone de la acción oficial `tailscale/github-action` con claves efímeras por workflow y comunicación segura cifrada punto a punto sin abrir puertos de entrada.

### Origen único y exposición web
1. **Cloudflare Tunnel directo a los puertos locales de frontend y backend por subdominios (`app.` y `api.`):** Rápido, pero rompe `SameSite=Strict` de las cookies al ser orígenes distintos.
2. **Proxy inverso Nginx local integrado en Docker Compose:** Unifica el Frontend (`/`) y la API (`/api/`, `/health`) bajo un solo puerto local. Cloudflare Tunnel apunta exclusivamente a este proxy, ofreciendo un único origen canónico para el navegador, compresión gzip, cabeceras de seguridad y compatibilidad total con `SameSite=Strict`.

### Distribución de imágenes
1. **Registro de imágenes (GHCR / Docker Hub):** Requiere autenticación, gestión de permisos y almacenamiento en la nube.
2. **Transferencia directa por SSH (`docker save | ssh ... docker load`):** Construcción en el runner efímero de GitHub, empaquetado en tar cifrado por SSH y carga directa en el Docker Engine del servidor. Cero dependencias externas y etiquetas vinculadas al SHA del commit.

## Decisión

Se adopta el **Despliegue Automático por Empuje a Red Privada (Opción B)** con los siguientes puntos concretos:

1. **Un solo entorno:** Producción. Las pruebas unitarias y de integración se ejecutan previamente en local y en el pipeline de CI (`ci.yml`).
2. **Disparador:** El despliegue se ejecuta automáticamente al fusionar cambios en la rama `main` mediante el workflow `.github/workflows/deploy.yml`.
3. **VPN Tailscale:** GitHub Actions se conecta a la red privada institucional mediante la acción oficial de Tailscale utilizando una clave de autenticación efímera guardada en los secretos de GitHub.
4. **Transferencia directa de imágenes:** Las imágenes Docker de Backend y Frontend se compilan en el runner de GitHub Actions, se etiquetan con el SHA del commit (`${{ github.sha }}`) y `latest`, y se transfieren por tubería comprimida SSH (`docker save ... | gzip | ssh ... "gunzip | docker load"`), sin registro intermedio.
5. **Proxy inverso Nginx:** El stack de producción incluye un servicio `proxy` (Nginx Alpine) que recibe las peticiones en el puerto local asignado, redirigiendo `/api/` y `/health` al backend y las demás rutas al frontend. Cloudflare Tunnel expone este proxy al dominio público institucional, garantizando un único origen (`SameSite=Strict`).
6. **Migraciones explícitas:** El contenedor del backend incorpora el argumento `--migrar` (o flag de migración). Antes de levantar o recrear los contenedores web, el workflow ejecuta `docker compose run --rm backend --migrar`. Si la migración arroja un código de error, el despliegue se detiene inmediatamente y los contenedores productivos no se tocan.
7. **Reversión (*Rollback*):** El servidor conserva las últimas 5 imágenes etiquetadas por commit SHA. Un workflow manual (`.github/workflows/rollback.yml`) permite indicar un tag o commit anterior para levantar dicha versión sin alterar la base de datos.
8. **Configuración de Correo (SMTP):** La comunicación de códigos de verificación y recuperación de contraseña (ADR-0007) se canaliza mediante el servidor SMTP institucional de Microsoft 365 (`smtp.office365.com:587`, STARTTLS), cuyas credenciales se configuran en el `.env` del servidor a través de los secretos del GitHub Environment `produccion`.

## Consecuencias

- **Seguridad:** Ningún puerto se abre en el router ni en el firewall perimetral. El servidor no aloja ningún GitHub Runner y no corre riesgo frente a PRs externos.
- **Rendimiento y Almacenamiento:** El envío por SSH mediante `docker save | gzip | ssh` consume ancho de banda de subida en el runner de GitHub; para evitar que el disco del servidor se llene, el despliegue ejecuta una rutina de limpieza automática que conserva únicamente las 5 imágenes más recientes.
- **Trazabilidad:** Cada versión en ejecución en el servidor corresponde con exactitud matemática al SHA del commit desplegado.
- **Mantenimiento:** La actualización de variables y credenciales sensibles (claves de BD, SMTP, certificados) reside exclusivamente en el archivo `.env` del servidor o en el entorno protegido de GitHub Actions, nunca en el repositorio.

## ADR relacionados

- [ADR-0002](ADR-0002-monorepo-y-ramas.md) — Monorepo y ramas `main` / `develop`.
- [ADR-0005](ADR-0005-ci-por-niveles.md) — CI por niveles y filtro por rutas.
- [ADR-0006](ADR-0006-almacenamiento-de-archivos.md) — Almacenamiento de archivos.
- [ADR-0007](ADR-0007-autenticacion-con-cedula.md) — Autenticación con cédula, cambio obligatorio y correo.
- [ADR-0015](ADR-0015-despliegue-por-etapas.md) — Despliegue dividido en etapas.
- [ADR-0041](ADR-0041-transferencia-imagenes-scp-docker-load.md) — Transferencia de imágenes por SCP y carga local con `docker load -i` (actualiza el punto 4 para evitar bloqueos por falta de `EOF` en `stdin` sobre OpenSSH para Windows).
