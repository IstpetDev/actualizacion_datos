# Issue #105 — Evidencia de resolución de alertas CodeQL y auditoría de producción

- **Fecha:** 2026-10-27
- **Rama:** `fix/105-alertas-codeql-auditoria-produccion` (hacia `develop`)
- **Issue:** #105 (`fix: resolver alertas codeql y auditar infraestructura de producción`)
- **Bloqueo resuelto:** Desbloqueo del [PR #104](https://github.com/IstpetDev/actualizacion_datos/pull/104) para liberación a `main`.

---

## 1. Resolución de alertas de CodeQL (SSRF / CWE-918)

### Diagnóstico y causa raíz
CodeQL reportaba dos alertas críticas `js/request-forgery` en:
- `scripts/verificar-catalogos-produccion.mjs:157`
- `scripts/verificar-validacion-ficha.mjs:158`

En ambos scripts de pruebas locales E2E, un servidor HTTP efímero recibía `peticion.url` y ejecutaba directamente:
```javascript
const proxy = request(new URL(peticion.url, backend), ...);
```
El motor de análisis estático de CodeQL detectaba un flujo de datos sin sanitizar (*taint flow*) desde `peticion.url` hasta el argumento de destino de `http.request`. Al crearse el objeto `URL` combinando la entrada de la petición con la base, existía el riesgo teórico de SSRF en caso de recibir URLs absolutas con esquemas externos o rutas manipuladas.

### Solución implementada
1. **Extracción y deduplicación:** Se creó el módulo común `scripts/servidor-pruebas-e2e.mjs` con la función `crearServidorPruebas({ backend, dist })`, retirando el servidor inline duplicado en ambos scripts de verificación.
2. **Validación estricta de rutas:**
   - Se rechazan inmediatamente peticiones con URLs malformadas, absolutas (con esquema) o relativas al protocolo (`//`).
   - Se parsea la ruta de forma segura contra un origen loopback fijo (`http://127.0.0.1`).
   - Solo se permite el reenvío proxy si la ruta pertenece estrictamente a `/api/*` o `/health`.
3. **Destino fijo y desacoplado:**
   - La llamada `request(opcionesProxy)` utiliza un objeto de configuración donde `protocol`, `hostname` (`127.0.0.1`) y `port` son propiedades fijas extraídas del backend local.
   - Ninguna propiedad de host o puerto del socket saliente depende de la entrada de la petición, erradicando el riesgo de SSRF y rompiendo el flujo de taint en CodeQL.
4. **Protección de archivos estáticos:** Se bloquea cualquier intento de Path Traversal (`..` o secuencias `%2e`) al servir los recursos del SPA.
5. **Pruebas unitarias automatizadas:** Se implementó `scripts/pruebas/servidor-pruebas-e2e.test.mjs` cubriendo 9 escenarios:
   - Proxy legítimo de `/health`.
   - Proxy legítimo de `/api/prueba` con query params.
   - Rechazo con HTTP 400 de URLs externas absolutas con esquema (`http://malicious-host.com/...`).
   - Rechazo con HTTP 400 de URLs relativas al protocolo (`//evil.com/...`).
   - Servicio correcto de archivos estáticos del frontend.
   - Fallback SPA a `index.html` para rutas del cliente.
   - Bloqueo de Path Traversal (`/../../../etc/passwd`) con HTTP 403.
   - Preservación de métodos HTTP, cabeceras (`Cookie`, etc.) y cuerpo en peticiones POST.
   - Respuesta HTTP 502 Bad Gateway cuando el backend no está disponible.

---

## 2. Auditoría y robustecimiento de infraestructura de producción

### Hallazgos y correcciones aplicadas

| Componente | Hallazgo previo | Corrección implementada |
|---|---|---|
| **Cookies y HTTPS** (`Program.cs`) | `CookieSecurePolicy.SameAsRequest`. Al terminar Cloudflare Tunnel TLS y hablar Nginx por HTTP al backend, la cookie `istpet_auth` no se emitía como `Secure` en producción, incumpliendo ADR-0007. Tampoco había `UseForwardedHeaders`. | Se activó `app.UseForwardedHeaders()` con `ForwardedHeadersOptions` (`XForwardedFor \| XForwardedProto`, limpiando `KnownIPNetworks` y `KnownProxies` para Docker). En producción se fijó `CookieSecurePolicy.Always`. |
| **Nginx Proxy** (`deploy/nginx/default.conf`) | Se enviaba `proxy_set_header X-Forwarded-Proto $scheme;` (que evalúa a `http`), sobreescribiendo el protocolo HTTPS original de Cloudflare Tunnel. | Se agregó el mapeo `map $http_x_forwarded_proto $forwarded_proto` para preservar el esquema HTTPS enviado por el túnel hacia el backend. |
| **Health Checks en CI** (`deploy.yml`, `rollback.yml`) | Solo se probaba `curl.exe http://127.0.0.1:8088/health` a fuego, ignorando la variable `${PUERTO_PUBLICO}` y sin validar el Frontend. | Se implementó verificación dinámica que lee `PUERTO_PUBLICO` (con respaldo a `8088`) y comprueba tanto la API (`/health`) como el Frontend (`/`). |
| **Seguridad SSH** (`conectar-servidor`, workflows) | Se usaba `StrictHostKeyChecking=no`. | Se actualizó a `StrictHostKeyChecking=accept-new` en `.github/actions/conectar-servidor/action.yml`, `deploy.yml` y `rollback.yml`, protegiendo contra suplantación o MITM si la clave del host cambiase. |
| **Filtro de CI** (`filtrar-rutas.sh`) | Cambios en `scripts/` no disparaban el job `workflows`. | Se incluyó `scripts/*` en el disparador del job `workflows` y se añadió su prueba en `filtrar-rutas.test.sh`. |

### Compatibilidad y limitaciones de Rollback
- `rollback.yml` permite levantar imágenes anteriores registradas en el host mediante `docker compose -f docker-compose.prod.yml up -d --remove-orphans`.
- **Advertencia documentada:** La reversión de contenedores **no revierte migraciones de base de datos** ya aplicadas por Entity Framework Core. Antes de desplegar versiones con cambios de esquema no retrocompatibles, debe garantizarse el respaldo de la base de datos de producción mediante `pg_dump` según [`docs/procedimientos/restauracion-base-de-datos.md`](../procedimientos/restauracion-base-de-datos.md).

---

## 3. Comandos y resultados de verificación

1. **Pruebas del servidor de pruebas E2E:**
   ```bash
   node scripts/pruebas/servidor-pruebas-e2e.test.mjs
   ```
   *Salida:* `9/9 casos exitosos (HTTP 200, 400, 403, 502, SPA fallback).`

2. **Pruebas de filtrado de rutas y scripts de CI:**
   ```bash
   bash .github/scripts/pruebas/filtrar-rutas.test.sh
   bash .github/scripts/pruebas/validar-rama.test.sh
   ```
   *Salida:* `Resultado: 16 casos, todos correctos.`

3. **Análisis de workflows y scripts con Actionlint y Shellcheck:**
   ```bash
   actionlint
   shellcheck .github/scripts/*.sh .github/scripts/pruebas/*.sh
   ```
   *Salida:* `0 advertencias, 0 errores.`

4. **Sintaxis de Docker Compose de producción:**
   ```powershell
   $env:POSTGRES_DB="test"; $env:POSTGRES_USER="test"; $env:POSTGRES_PASSWORD="test"; docker compose -f docker-compose.prod.yml config
   ```
   *Salida:* `Validación de orquestación de producción exitosa (código de salida 0).`

5. **Compilación y Pruebas Unitarias del Backend (.NET 10 SDK):**
   ```bash
   dotnet test src/Backend --filter "Categoria!=Integracion"
   ```
   *Salida:*
   - `Istpet.ActualizacionDatos.Domain.Tests`: 102 aprobadas, 0 fallidas.
   - `Istpet.ActualizacionDatos.Application.Tests`: 112 aprobadas, 0 fallidas.
   - `Istpet.ActualizacionDatos.WebApi.Tests`: 282 aprobadas, 0 fallidas.
   - **Total:** 496 pruebas aprobadas, 0 fallidas.

6. **Regeneración de Contrato OpenAPI y Cliente Frontend:**
   *Salida:* `Build succeeded. 0 Warning(s), 0 Error(s). Sin diferencias en openapi/v1.json ni api-client.`
