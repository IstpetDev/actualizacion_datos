# Auditoría de Infraestructura de Producción y Recorrido de Despliegue

Documento técnico elaborado en atención al issue #105 y sustentado en el [ADR-0031](decisiones/ADR-0031-auditoria-infraestructura-y-seguridad-en-despliegue.md).

---

## 1. Trayecto completo de producción

### Diagrama del flujo de tráfico

```
[ Navegador Web ]
       │  (HTTPS con Cookie SameSite=Strict, Secure, HttpOnly)
       ▼
[ Cloudflare Tunnel (cloudflared) ] (Terminación TLS institucional)
       │  (HTTP / localhost con X-Forwarded-Proto: https, X-Forwarded-For: IP)
       ▼
[ Proxy Nginx (Docker Compose, PUERTO_PUBLICO) ]
       ├── /api/*   ──────► [ Backend (.NET 10 WebApi) ]
       │                         │
       │                         ├── (EF Core / Npgsql) ──► [ PostgreSQL 17 (postgres-datos) ]
       │                         └── (I/O Local)        ──► [ Volumen archivos-almacenados ]
       ├── /health  ──────► [ Backend (.NET 10 WebApi) /health ]
       └── /*       ──────► [ Frontend (Angular SPA) ]
```

### 1.1. Origen único y cookies de sesión
- **Dominio y puerto:** Cloudflare Tunnel enruta el dominio público institucional hacia el puerto loopback de Nginx (`127.0.0.1:${PUERTO_PUBLICO:-8088}`).
- **Mismo origen:** Tanto el Frontend como la API residen bajo el mismo origen HTTP canónico. Esto satisface la directiva `SameSite=Strict` de la cookie de autenticación `istpet_auth` ([ADR-0007](decisiones/ADR-0007-autenticacion-con-cedula.md)).
- **HTTPS y cabeceras reenviadas:** Cloudflare Tunnel transmite el protocolo original en `X-Forwarded-Proto: https`. Nginx preserva esta cabecera mediante la directiva `map $http_x_forwarded_proto $forwarded_proto`. Kestrel procesa `UseForwardedHeaders` (limpiando `KnownIPNetworks` y `KnownProxies`), garantizando que la cookie de sesión se emita siempre con la directiva `Secure`.

### 1.2. Almacenamiento y persistencia
- **Base de datos (PostgreSQL 17):** Los datos se almacenan en el volumen nombrado `postgres-datos` montado en `/var/lib/postgresql/data`. El puerto de PostgreSQL (`PUERTO_POSTGRES:-5433`) está enlazado únicamente a `127.0.0.1` para mantenimiento mediante túnel SSH ([ADR-0017](decisiones/ADR-0017-acceso-a-postgres-por-tunel-ssh.md)).
- **Archivos adjuntos:** Se almacenan en el volumen nombrado `archivos-almacenados` montado en `/datos/archivos` del contenedor backend. La aplicación valida el tamaño máximo (10 MB según [ADR-0006](decisiones/ADR-0006-almacenamiento-de-archivos.md)) y Nginx permite hasta 15 MB (`client_max_body_size 15M`).

---

## 2. Flujo de despliegue y reversión (GitHub Actions → Servidor)

### 2.1. Despliegue automático (`deploy.yml`)
El flujo se organiza en etapas encadenadas ([ADR-0015](decisiones/ADR-0015-despliegue-por-etapas.md)):

1. **Construir (`construir`):** Runners efímeros de GitHub Actions compilan en paralelo las imágenes Docker de `backend` y `frontend` sin acceso a secretos, empaquetándolas en `imagen-backend.tar.gz` e `imagen-frontend.tar.gz`.
2. **Transferir (`transferir`):** Conecta a la red privada vía Tailscale, carga las imágenes en el Docker Engine del servidor por SSH y transfiere `docker-compose.prod.yml` y la configuración de Nginx.
3. **Migrar (`migrar`):** 
   - Ejecuta `docker compose run --rm backend --migrar`. Si falla, el despliegue aborta inmediatamente sin afectar los contenedores en servicio.
   - Ejecuta `docker compose run --rm backend --cargar-catalogos` ([ADR-0021](decisiones/ADR-0021-carga-de-catalogos-en-produccion.md)) para asegurar que los 21 tipos de catálogos y sus relaciones estén íntegros antes del cambio.
4. **Desplegar (`desplegar`):** Levanta la versión con el tag del commit mediante `docker compose up -d --remove-orphans`.
5. **Verificar (`verificar`):** Espera a que los contenedores se estabilicen, detecta dinámicamente el `PUERTO_PUBLICO` desde `.env` y comprueba tanto `/health` (backend) como `/` (frontend SPA), verificando además el estado de salud de los servicios con `docker compose ps`.
6. **Limpiar (`limpiar`):** Ejecuta `docker image prune -f` conservando las últimas versiones para posibilitar reversiones.

### 2.2. Reversión manual (`rollback.yml`)
- Se dispara con `workflow_dispatch` indicando el commit SHA deseado.
- Verifica la presencia local de las imágenes con dicho tag.
- Recrea los contenedores con `TAG=<sha> docker compose -f docker-compose.prod.yml up -d --remove-orphans`.
- Comprueba la salud del proxy, backend y frontend en el puerto configurado.

---

## 3. Matriz de comprobaciones de la auditoría

| Elemento auditado | Comprobado localmente (evidencia) | Confirmado en workflows (CI/CD) | Requiere prueba autorizada en entorno real |
|---|---|---|---|
| **Alertas CodeQL SSRF** | Proxy modular en `scripts/servidor-pruebas-e2e.mjs` con tests unitarios en `scripts/servidor-pruebas-e2e.test.mjs` pasando al 100%. | CodeQL scan sobre ramas de PR. | No. La corrección estática y dinámica es localmente reproducible. |
| **Cabecera Forwarded & Cookie Secure** | Pruebas de integración `SeguridadInfraestructuraTests.cs` simulando `X-Forwarded-Proto` y cookie `Secure`. | `dotnet test` en pipeline `ci.yml`. | Verificación visual de cookie en navegador tras despliegue de staging/producción. |
| **Sintaxis Compose de producción** | `docker compose -f docker-compose.prod.yml config` válido con variables ficticias. | N/A (se valida en runner antes de despliegue). | Ejecución con credenciales reales del servidor. |
| **Autenticación SSH y host key** | `StrictHostKeyChecking accept-new` configurado en `~/.ssh/config`. | Verificado en acción compuesta `.github/actions/conectar-servidor`. | Comprobación de huella digital de la máquina institucional por el operador. |
| **Smoke tests (API + Frontend)** | Scripts de prueba y servidor de prueba E2E validan endpoints y estáticos. | `deploy.yml` y `rollback.yml` comprueban `/health` y `/` sobre `PUERTO_PUBLICO`. | Confirmación de acceso externo a través del dominio público de Cloudflare. |
| **Persistencia de PostgreSQL y volumen** | Verificado en Compose y pruebas de integración con volúmenes locales. | `postgres-datos` y `archivos-almacenados` declarados como volúmenes persistentes externos a los contenedores. | Inspección física del sistema de archivos en el host de producción. |

---

## 4. Límites de la auditoría y compatibilidad de reversión (Rollback)

> [!WARNING]
> **Límites de reversión en base de datos:**
> El workflow `rollback.yml` reemplaza y reinicia los contenedores de aplicación (`backend`, `frontend`, `proxy`). **No realiza ni puede realizar marcha atrás automática de las migraciones de EF Core ya aplicadas en PostgreSQL**.

### Directrices operativas obligatorias
1. **Compatibilidad hacia atrás en migraciones:** Toda migración que introduzca cambios de esquema en `develop`/`main` debe procurar no romper la versión inmediata anterior (ej. agregar columnas opcionales o con valores por defecto antes de eliminar columnas obsoletas en una fase posterior).
2. **Respaldo previo:** Antes de autorizar un despliegue a producción que contenga migraciones no triviales de base de datos, el operador de infraestructura debe confirmar la existencia de un respaldo reciente (`pg_dump`) de la base de datos `actualizacion_datos`.
3. **Procedimiento de contingencia ante reversión destructiva:** Si una versión desplegada falla y sus migraciones alteraron tablas de forma incompatible con la versión anterior:
   1. Detener el backend: `docker compose -f docker-compose.prod.yml stop backend`.
   2. Restaurar el respaldo previo de PostgreSQL vía túnel SSH o cliente SQL local:
      ```bash
      pg_restore -h 127.0.0.1 -p 5433 -U <usuario> -d <base_datos> --clean respaldo_previo.dump
      ```
   3. Ejecutar el workflow `rollback.yml` con el SHA de la versión anterior.
4. **No suficiencia de `/health`:** Un código `200` en `/health` garantiza únicamente que el proceso Kestrel está en ejecución. No certifica por sí solo la operatividad del frontend, la persistencia en disco de archivos adjuntos, la vigencia del túnel Cloudflare ni la accesibilidad del dominio público. Por ello, la verificación se amplió a la interfaz web (`/`) y al listado de contenedores (`docker compose ps`).
