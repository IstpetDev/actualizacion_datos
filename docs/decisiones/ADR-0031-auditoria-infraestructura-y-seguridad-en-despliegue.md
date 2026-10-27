# ADR-0031 — Seguridad en origen, auditoría de infraestructura y verificación de despliegue

- **Estado:** Vigente
- **Fecha:** 2026-10-27

## Contexto

El PR #104 (liberación a `main`) y la auditoría solicitada en el issue #105 identificaron alertas de seguridad estática y oportunidades de robustecimiento en la infraestructura de despliegue y pruebas:

1. **Alertas CodeQL SSRF (`js/request-forgery`):** Los scripts de pruebas E2E `scripts/verificar-catalogos-produccion.mjs` y `scripts/verificar-validacion-ficha.mjs` utilizaban `request(new URL(peticion.url, backend), ...)` en proxies HTTP locales efímeros. Aunque estaban destinados a pruebas, CodeQL detectó que la URL de destino derivaba directamente de la petición entrante sin sanitización estricta de origen ni rutas relativas/absolutas.
2. **Propagación de HTTPS y cookies de sesión:** La aplicación corre detrás de Nginx y Cloudflare Tunnel. Kestrel no invocaba `UseForwardedHeaders`, la política de cookies de sesión usaba `CookieSecurePolicy.SameAsRequest`, y Nginx reescribía `X-Forwarded-Proto $scheme` al esquema local (HTTP). Por tanto, en el acceso público por HTTPS la cookie de autenticación `istpet_auth` no se marcaba con el atributo `Secure`, contradiciendo el [ADR-0007](ADR-0007-autenticacion-con-cedula.md).
3. **Comprobación de salud en despliegue y reversión:** `deploy.yml` y `rollback.yml` consultaban únicamente `http://127.0.0.1:8088/health`, ignorando la variable `PUERTO_PUBLICO` de Compose y sin comprobar el servicio del Frontend (SPA en `/`).
4. **Verificación de claves de host SSH:** Las conexiones SSH y transferencias SCP hacia el servidor institucional usaban `-o StrictHostKeyChecking=no`, omitiendo la verificación de identidad del host dentro de la red privada Tailscale.
5. **Persistencia y límites de la reversión (rollback):** El procedimiento de rollback recrea contenedores con imágenes anteriores pero no revierte migraciones de base de datos ya aplicadas en PostgreSQL, lo cual exige documentar explícitamente los límites de compatibilidad y la estrategia de respaldo.

## Opciones

### Alertas SSRF en scripts de prueba
1. Descartar las alertas como falso positivo en GitHub Security. (Rechazada: no previene reaparición en futuros análisis ni mejora la seguridad del código).
2. Unificar el proxy de pruebas en un módulo común que valide estrictamente el origen, impida manipulación de host/esquema, bloquee rutas maliciosas (ej. secuencias de escape, traversal, URLs absolutas o relativas de protocolo) y fije el destino a `127.0.0.1` con puerto numérico. (Adoptada).

### Manejo de HTTPS y cabeceras reenviadas
1. Forzar `CookieSecurePolicy.Always` incondicionalmente en todos los entornos. (Complicaría entornos de desarrollo local sin certificados TLS locales).
2. Configurar `ForwardedHeadersOptions` en Kestrel para procesar `X-Forwarded-For` y `X-Forwarded-Proto` desde proxies confiables, preservar en Nginx el protocolo original (`$http_x_forwarded_proto` o `$scheme`) y aplicar `CookieSecurePolicy.Always` en producción (con fallback a `SameAsRequest` en desarrollo o configurable mediante `Autenticacion:CookieSecurePolicy`). (Adoptada).

### Verificación de despliegue y reversión
1. Mantener consulta fija a `8088/health`. (Rechazada: falsa sensación de éxito si el frontend falla o el puerto cambia).
2. Detectar dinámicamente `PUERTO_PUBLICO` desde el archivo `.env` del servidor (fallback a `8088`), validar tanto `/health` (backend) como `/` (frontend SPA) y comprobar el estado de salud de todos los contenedores con `docker compose ps`. (Adoptada).

### Identidad SSH en Tailscale
1. Mantener `StrictHostKeyChecking=no`. (Inseguro ante suplantación interna).
2. Configurar `StrictHostKeyChecking accept-new` en `~/.ssh/config` dentro de la acción de conexión. La red Tailscale autentica y cifra el túnel WireGuard de nodo a nodo; `accept-new` registra la clave del host en la primera conexión y aborta si la clave cambia. (Adoptada).

## Decisión

Se aprueban e implementan las siguientes directrices de arquitectura e infraestructura:

1. **Proxy seguro y unificado para pruebas E2E:** Se extrae la lógica de proxy a `scripts/servidor-pruebas-e2e.mjs`. Se valida que la URL entrante resuelva únicamente en origen local, se rechazan URLs absolutas o de protocolo relativo (`//`), se sanitiza el `pathname` impidiendo path traversal (`..`, `%2e%2e`), se restringen las rutas de proxy a `/health` y `/api/*`, y la petición saliente utiliza opciones explícitas con `hostname: "127.0.0.1"` y puerto numérico.
2. **Propagación confiable de HTTPS y cookies `Secure`:**
   - En `Istpet.ActualizacionDatos.WebApi/Program.cs` se registra `UseForwardedHeaders` con `ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto` y se limpian `KnownNetworks`/`KnownProxies` para la red bridge de contenedores.
   - La política de cookies de sesión `istpet_auth` se establece en `CookieSecurePolicy.Always` en producción, garantizando el atributo `Secure` en navegadores públicos según ADR-0007.
   - En `deploy/nginx/default.conf`, se mapea `$http_x_forwarded_proto` para respetar el protocolo enviado por Cloudflare Tunnel (`https`).
3. **Verificación integral en CI/CD:** Los jobs de verificación de `deploy.yml` y `rollback.yml` leen `PUERTO_PUBLICO` de `.env` (defecto 8088), validan `/health` (API) y `/` (Frontend) vía curl, y verifican que ningún contenedor quede en estado fallido.
4. **Política de SSH con `accept-new`:** La acción `.github/actions/conectar-servidor` configura `~/.ssh/config` con `StrictHostKeyChecking accept-new` e `IdentitiesOnly yes`, eliminando el flag `-o StrictHostKeyChecking=no` en los workflows.
5. **Límites de Rollback y compatibilidad de esquema:** Se formaliza que `rollback.yml` realiza reversión exclusivamente a nivel de imágenes de aplicación y proxy. Si un despliegue incluyó migraciones con cambios destructivos en la base de datos, la reversión de imagen requiere restaurar previamente el respaldo de PostgreSQL correspondiente. Las migraciones en `develop` deben procurar compatibilidad hacia atrás cuando sea viable.

## Consecuencias

- **Seguridad:** Desaparecen las alertas CodeQL `js/request-forgery`. Las cookies en producción se emiten siempre con `Secure`, `HttpOnly` y `SameSite=Strict`.
- **Mantenibilidad:** El código del servidor efímero de pruebas no está duplicado en múltiples scripts y cuenta con pruebas automatizadas unitarias de seguridad.
- **Operaciones:** Despliegues y reversiones ofrecen mayor observabilidad al validar tanto la API como la interfaz de usuario en el puerto efectivamente configurado.
- **Respaldo:** Operaciones debe verificar la existencia de un respaldo reciente de PostgreSQL antes de aplicar despliegues que contengan migraciones de base de datos.

## ADR relacionados

- [ADR-0005](ADR-0005-ci-por-niveles.md) — CI por niveles y análisis estático con CodeQL.
- [ADR-0007](ADR-0007-autenticacion-con-cedula.md) — Autenticación con cédula, cookies `HttpOnly` y `Secure`.
- [ADR-0011](ADR-0011-despliegue-a-produccion.md) — Despliegue automático a producción.
- [ADR-0015](ADR-0015-despliegue-por-etapas.md) — Despliegue dividido en etapas.
- [ADR-0017](ADR-0017-acceso-a-postgres-por-tunel-ssh.md) — Acceso a PostgreSQL por túnel SSH.
- [ADR-0021](ADR-0021-carga-de-catalogos-en-produccion.md) — Carga de catálogos en producción.
