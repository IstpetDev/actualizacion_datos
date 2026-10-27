# ADR-0026 — Manejo global de errores y contrato uniforme

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

En el sistema actual se identificaron dos problemas críticos relacionados con la comunicación de errores:
1. **Frontend:** 37 llamadas a servicios en componentes leían `err?.message || '...'`. En el cliente TypeScript generado por NSwag, la propiedad `message` de una excepción 400 es literalmente la cadena `"Bad Request"` (el texto del estado HTTP) y no el cuerpo retornado por el servidor. Como consecuencia, el usuario final observaba mensajes genéricos («Bad Request») sin conocer el motivo real del rechazo ni el campo específico que falló (issue #89).
2. **Backend:** No existía un pipeline global de manejo de excepciones (`IExceptionHandler`, `AddProblemDetails`, `UseExceptionHandler`). `Program.cs` duplicaba bloques `try / catch (ReglaNegocioException)` en 32 endpoints, y los endpoints de hoja de vida dependían de `AccesoEndpoints.EjecutarAsync`. Cualquier excepción no capturada (como `ArgumentException` de entidades de dominio, `DbUpdateException` por unicidad, o errores de deserialización JSON) retornaba un 500 sin cuerpo estructurado o un 400 vacío, sin correlación de auditoría ni `traceId`.

## Opciones

1. **ProblemDetails estricto (RFC 9457):** Reemplazar por completo el contrato por el estándar RFC 9457 (`title`, `detail`, `status`, `instance`, `extensions`).
   - *Ventajas:* Estándar IETF reconocido.
   - *Desventajas:* Rompe retrocompatibilidad con todas las pruebas y consumidores que esperan el campo `mensaje`, exigiendo refactorizaciones extensas en endpoints y contratos ya aprobados.
2. **Extensión retrocompatible de `MensajeRespuesta` con `codigo`, `errores` y `traceId`:** Mantener `Mensaje` como primer parámetro en `MensajeRespuesta`, añadiendo parámetros opcionales `Codigo`, `Errores` (`Dictionary<string, string[]>`) y `TraceId`.
   - *Ventajas:* 100% retrocompatible con el código existente (`new MensajeRespuesta("...")`), unifica el contrato de la API en `openapi/v1.json`, expone errores por campo y correlación de incidentes mediante `traceId`.

## Decisión

Se adopta la opción 2 junto con una arquitectura de manejo global:

1. **Contrato de Error Backend:**
   - Se extiende el registro `MensajeRespuesta` en `ModelosComunes.cs`:
     ```csharp
     public sealed record MensajeRespuesta(
         string Mensaje,
         string? Codigo = null,
         Dictionary<string, string[]>? Errores = null,
         string? TraceId = null);
     ```
2. **Manejador Global de Excepciones:**
   - Se implementa `IExceptionHandler` (`ManejadorGlobalExcepciones`) registrado con `builder.Services.AddExceptionHandler<ManejadorGlobalExcepciones>()`, `builder.Services.AddProblemDetails()` y `app.UseExceptionHandler()`.
   - Mapeo unificado:
     - `ReglaNegocioException`: HTTP 400 (o 403 si corresponde a períodos fuera de campaña).
     - `RecursoNoEncontradoException`: HTTP 404.
     - `CuentaBancariaNoDisponibleException`: HTTP 503.
     - `ArgumentException` / `ArgumentNullException`: HTTP 400 con el mensaje de validación.
     - `DbUpdateException`: HTTP 409 cuando se trate de violación de llave única (código Postgres 23505) o 400 para referencias inválidas (23503), con mensajes amigables sin filtrar SQL.
     - `BadHttpRequestException` / formato JSON inválido: HTTP 400 informando formato no válido.
     - Excepciones no controladas: HTTP 500 con mensaje genérico («Ha ocurrido un error inesperado en el servidor.»), código `ERROR_INTERNO` y el `traceId` correspondiente. Se registran en el log del servidor con su `traceId` y tipo de excepción, sin datos personales y sin filtrar stack traces ni detalles internos al cliente en producción.
3. **Frontend Unificado:**
   - Se robustece la función [`mensajeError(error, alternativa)`](../../../src/Frontend/src/app/core/auth/mensaje-error.ts) para extraer de forma uniforme el mensaje desde respuestas de NSwag, objetos de error, respuestas HTTP o excepciones de red (estado 0 -> mensaje claro de desconexión; estado 5xx -> mensaje con código de referencia `traceId`).
   - Se reemplazan todos los accesos `err?.message` en suscripciones de componentes por `mensajeError`.
   - Se incluye soporte accesible para notificaciones de error (`role="alert"` / avisos visibles).

## Consecuencias

- Cualquier error del backend es informado al usuario con su causa real en lugar de mensajes genéricos como «Bad Request».
- Los endpoints del backend quedan limpios de bloques `try/catch` redundantes.
- Los errores 500 no controlados contienen un `traceId` correlacionable en los logs del servidor para facilitar soporte y diagnóstico sin exponer información confidencial ni datos personales.
- El cliente OpenAPI y TypeScript permanece tipado y sincronizado.

## ADR relacionados

- [ADR-0001](ADR-0001-clean-architecture-backend.md) — Clean Architecture en el backend.
- [ADR-0003](ADR-0003-cliente-openapi-generado.md) — Cliente OpenAPI generado en el frontend.
- [ADR-0007](ADR-0007-autenticacion-con-cedula.md) — Autenticación con cédula, cambio obligatorio y correo.
