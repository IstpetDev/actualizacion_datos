# Evidencia de resolución — Issue #105

Este directorio recopila las evidencias de resolución técnica de las alertas de CodeQL (`js/request-forgery`), la corrección de seguridad en cabeceras HTTP y cookies, y la auditoría verificable de la infraestructura de producción conforme al [ADR-0031](../../decisiones/ADR-0031-auditoria-infraestructura-y-seguridad-en-despliegue.md).

---

## 1. Resolución de alertas CodeQL (`js/request-forgery`)

### Causa raíz identificada
CodeQL reportó dos alertas críticas de Server-Side Request Forgery en:
- `scripts/verificar-catalogos-produccion.mjs:157`
- `scripts/verificar-validacion-ficha.mjs:158`

El analizador estático detectó que `peticion.url` (origen de entrada no confiable) se pasaba como primer argumento a `new URL(peticion.url, backend)` y la instancia resultante se enviaba a `http.request(...)`. En JavaScript, `new URL("//malicioso.test/api", "http://127.0.0.1")` resuelve hacia el host externo ignorando el host base, lo cual constituye una vulnerabilidad SSRF cuando se usa en un proxy.

### Solución implementada
1. **Módulo seguro unificado (`scripts/servidor-pruebas-e2e.mjs`):**
   - Se eliminó la duplicación del proxy en ambos scripts de verificación.
   - La función `validarRutaProxy(urlEntrante)` rechaza esquemas absolutos (`http://`, `https://`), rutas relativas de protocolo (`//`), directory traversal (`/../`, `%2e%2e`) y limita estrictamente el tráfico a `/health` o rutas bajo `/api/`.
   - La petición de proxy saliente utiliza un objeto de opciones con `hostname: "127.0.0.1"` fijado como literal de cadena y puerto numérico, imposibilitando físicamente que un atacante desvíe la petición a otro destino.
2. **Pruebas automatizadas del proxy (`scripts/servidor-pruebas-e2e.test.mjs`):**
   - 5 pruebas unitarias e integración en Node.js validan la admisión de rutas legítimas y el bloqueo de intentos de SSRF, path traversal y accesos indebidos fuera de la API.

---

## 2. Seguridad en origen, HTTPS y cookies (`Program.cs` y Nginx)

### Causa raíz identificada
- Nginx recibía tráfico de Cloudflare Tunnel en HTTP (puerto 80) y sobreescribía `X-Forwarded-Proto $scheme` (con valor `http`), borrando el esquema `https` original del cliente.
- ASP.NET Core no ejecutaba `UseForwardedHeaders`, por lo que Kestrel consideraba la petición siempre insegura (`Request.IsHttps == false`).
- La cookie de sesión `istpet_auth` utilizaba `CookieSecurePolicy.SameAsRequest`, saliendo sin la directiva `Secure` en navegadores públicos.

### Solución implementada
1. En `deploy/nginx/default.conf` se mapea `$http_x_forwarded_proto $forwarded_proto` para preservar `https` cuando Cloudflare Tunnel o el balanceador lo reporten.
2. En `Program.cs` se agregó `builder.Services.Configure<ForwardedHeadersOptions>(...)` y `app.UseForwardedHeaders()`, limpiando `KnownIPNetworks` y `KnownProxies` para operar correctamente en la red interna de Docker.
3. Se estableció `CookieSecurePolicy.Always` por defecto en entornos productivos (configurable vía `Autenticacion:CookieSecurePolicy`).
4. Se incorporó una suite de pruebas en `SeguridadInfraestructuraTests.cs`:
   - `Con_Politica_Always_Cookie_Siempre_Tiene_Atributo_Secure`: verifica que la cookie siempre lleve `Secure`, `HttpOnly` y `SameSite=Strict`.
   - `Con_Forwarded_Proto_Https_UseForwardedHeaders_Aplica_Https_Y_Secure`: verifica la interpretación de la cabecera `X-Forwarded-Proto: https`.
   - `Recorrido_Completo_Mismo_Origen_Cookie_Segura_Login_Sesion_Y_Archivos`: verifica el recorrido integral de inicio de sesión con datos ficticios, lectura de sesión, subida y descarga de archivo adjunto, y cierre de sesión.

---

## 3. Verificación de despliegue y reversión (`deploy.yml` y `rollback.yml`)

1. **Detección dinámica de puerto:** Se eliminó la referencia fija a `8088`. Ambos workflows obtienen `PUERTO_PUBLICO` de `.env` (defecto 8088).
2. **Validación integral de servicios:** Se comprueban tanto el backend (`/health`) como el frontend SPA (`/`), además de listar el estado de salud de los contenedores (`docker compose ps`).
3. **Identidad SSH en Tailscale:** La acción `.github/actions/conectar-servidor` configura `StrictHostKeyChecking accept-new` e `IdentityFile ~/.ssh/id_rsa`, eliminando el flag inseguro `StrictHostKeyChecking=no` en todos los comandos de los workflows.
4. **Validación sintáctica:** `docker compose -f docker-compose.prod.yml config` fue validado exitosamente con variables de entorno ficticias.
