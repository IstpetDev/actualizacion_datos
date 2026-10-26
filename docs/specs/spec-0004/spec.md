# Mensajes de error al usuario y manejo uniforme — Spec

**ID:** #89  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Joseph Baño (Administrador / Arquitecto de Producto)  
**Fecha:** 2026-10-26  
**Áreas afectadas:** `src/Backend`, `src/Frontend`

## Problema y resultado esperado

Actualmente, al ocurrir un error de validación o rechazo al enviar un formulario (por ejemplo, guardar un título en «2. Formación académica» o una capacitación con fecha de fin anterior a la de inicio en «3. Capacitaciones»), la interfaz del frontend muestra exclusivamente el mensaje genérico «Bad Request». El motivo real emitido por el backend se descarta debido a que los componentes leen `err?.message || '...'` directamente de la excepción del cliente OpenAPI generado (donde `message` corresponde al texto de estado HTTP). Además, en el backend no existe middleware global de excepciones, provocando que errores no capturados devuelvan respuestas 500 sin cuerpo ni correlación, o 400 sin especificar el campo con error.

El resultado esperado es un manejo uniforme en ambos lados:
- El backend procesa globalmente cualquier excepción, devolviendo un cuerpo unificado con código de estado HTTP adecuado, mensaje claro, posibles errores por campo y un `traceId` único.
- El frontend extrae e informa siempre el motivo real al usuario en alertas visibles y accesibles (`role="alert"`), señalando qué campo falló en lugar de mostrar «Bad Request» a secas, y suministrando el código `traceId` en errores inesperados.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Issue #89 | GitHub Issue #89 | Manejo de errores uniforme en backend y mensajes claros en la interfaz |
| ADR-0001 | `docs/decisiones/ADR-0001-clean-architecture-backend.md` | Clean Architecture en el backend |
| ADR-0003 | `docs/decisiones/ADR-0003-cliente-openapi-generado.md` | Cliente OpenAPI generado en el frontend |
| ADR-0007 | `docs/decisiones/ADR-0007-autenticacion-con-cedula.md` | Códigos de error y autenticación con cédula |
| ADR-0020 | `docs/decisiones/ADR-0020-manejo-global-de-errores-y-contrato-uniforme.md` | Manejo global de excepciones (`IExceptionHandler`) y contrato extendido de `MensajeRespuesta` |
| Comportamiento existente | `src/Frontend/src/app/core/auth/mensaje-error.ts` | Helper `mensajeError(err, alt)` para extraer mensajes del cuerpo de la respuesta |

## Alcance

**Incluye:**
- Middleware/Handler global de excepciones en el backend (`IExceptionHandler` + `AddProblemDetails`).
- Mapeo de excepciones de dominio, aplicación, base de datos y enlace JSON a códigos HTTP (400, 403, 404, 409, 500, 503) con cuerpo `MensajeRespuesta`.
- Generación de `traceId` en errores 500 y logging estructurado sin datos personales ni filtrado de stack traces en producción.
- Helper unificado de errores en el frontend (`mensajeError`) con soporte para respuestas NSwag, HttpErrorResponse, conectividad (estado 0) y errores de servidor (5xx).
- Sustitución de los 37 usos de `err?.message` en componentes y servicios del frontend.
- Avisos de error visibles y accesibles (`role="alert"`).

**Excluye:**
- Nuevas pantallas completas para visualización de logs de auditoría (se mantiene en logs del backend).
- Modificación del esquema de autenticación por cookies (ADR-0007).

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad | Fuente |
|---|---|---|---|
| RF-ERR-001 | Dado un error de validación o regla de negocio en el backend (ej. fecha fin anterior a fecha inicio), cuando la petición falla con HTTP 400, el sistema devuelve un cuerpo con el campo `mensaje` explicando el motivo comprensiblemente. | Alta | Issue #89, ADR-0020 |
| RF-ERR-002 | Dada una excepción no controlada en el backend, cuando ocurre la falla, el sistema responde HTTP 500 con un cuerpo JSON que contiene mensaje genérico, código de error interno y un `traceId` correlacionable en los logs del servidor. | Alta | Issue #89, ADR-0020 |
| RF-ERR-003 | Dado un fallo de guardado en el frontend, cuando el servidor retorna un error, la interfaz extrae el mensaje explicativo y lo presenta en una alerta accesible con `role="alert"`, sin mostrar la leyenda genérica «Bad Request». | Alta | Issue #89 |
| RF-ERR-004 | Dada una interrupción de red o fallo de conectividad (estado 0), cuando se intenta una petición, el sistema frontend muestra un mensaje informando el problema de conexión y sugiriendo verificar el acceso a internet. | Media | Issue #89 |
| RF-ERR-005 | Dado un error 500 del servidor, cuando se visualiza en el frontend, el sistema incluye el código de referencia (`traceId`) para que el usuario pueda reportarlo a soporte. | Media | Issue #89 |

## Escenarios del proceso

### Escenario 1 — Guardado con fechas incoherentes en Capacitaciones
- **Actor:** Usuario con rol `usuario`.
- **Disparador:** Intenta registrar una capacitación con fecha de fin anterior a la de inicio.
- **Secuencia:** El backend evalúa la regla de negocio y rechaza con HTTP 400 y mensaje `"La fecha de fin no puede ser anterior a la fecha de inicio."`. El frontend recibe la excepción, extrae el mensaje mediante `mensajeError` y renderiza el texto en la alerta del formulario.
- **Resultado:** El usuario ve exactamente la causa del rechazo sin texto «Bad Request».

### Escenario 2 — Error inesperado del servidor
- **Actor:** Cualquier usuario del sistema.
- **Disparador:** Ocurre un fallo inesperado no controlado durante una transacción.
- **Secuencia:** El `IExceptionHandler` captura la excepción, registra el log con `traceId` (sin stack trace en producción), y retorna HTTP 500 con `{ "mensaje": "Ha ocurrido un error inesperado en el servidor.", "traceId": "00-..." }`. El frontend muestra «Error inesperado en el servidor. Código de referencia: 00-...».

## Datos, seguridad e integraciones

- Los logs del servidor no contienen contraseñas, números de cédula ni datos personales reales.
- Se utilizan datos ficticios de prueba (cédulas inventadas `0000000000`, correos `usuario@ejemplo.test`).
- No se exponen stack traces ni sentencias SQL en las respuestas de producción.

## Puntos abiertos

1. Integración con las validaciones de campo específicas del issue #88 cuando se implemente la ficha personal.
