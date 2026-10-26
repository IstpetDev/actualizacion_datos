# ADR-0016 — Interfaz para probar la API en desarrollo

- **Estado:** Propuesto
- **Fecha:** 2026-10-22

## Contexto

El backend usa `Microsoft.AspNetCore.OpenApi` (nativo de .NET 9 y 10), que solo genera el documento `/openapi/v1.json` y lo expone únicamente en `Development` (commit `2dcdca4`). No trae una interfaz para leer y llamar a los endpoints, como hacía Swashbuckle con Swagger UI. Hoy, para probar la API a mano, hay que importar el JSON en Postman o Bruno, o escribir scripts.

Restricciones:

- La sesión es una cookie `istpet_auth` con `SameSite=Strict` (ADR-0007). La interfaz debe servirse desde el mismo origen que la API para que, tras `POST /api/auth/login`, las llamadas siguientes lleven la cookie.
- La interfaz no debe existir en producción: el repositorio es público y no se publica la superficie de la API (mismo criterio que `/openapi/v1.json`).
- El contrato versionado `openapi/v1.json` y el cliente NSwag (ADR-0003) no deben cambiar por agregar una interfaz.

## Opciones

1. **Scalar (`Scalar.AspNetCore`).** Es la opción que propone la plantilla de .NET 9 y 10. Se integra con una línea sobre el documento de `Microsoft.AspNetCore.OpenApi`, sirve sus recursos embebidos (no depende de un CDN) y permite probar peticiones con cookie desde el mismo origen. Agrega una dependencia NuGet.
2. **Swagger UI (`Swashbuckle.AspNetCore.SwaggerUI`) apuntando a `/openapi/v1.json`.** Conocida por el equipo, pero mezcla dos ecosistemas (Swashbuckle ya no es el generador) y su mantenimiento depende de terceros.
3. **Sin interfaz; usar Postman, Bruno o Insomnia importando `/openapi/v1.json`.** Sin dependencias nuevas, pero cada persona configura su herramienta y la cookie a mano.

## Decisión

Se propone la **opción 1**, con estas reglas:

| # | Regla |
|---|---|
| 1 | `app.MapScalarApiReference()` se registra solo dentro de `if (app.Environment.IsDevelopment())`, junto a `app.MapOpenApi()`. |
| 2 | Ruta: `/scalar/v1`, en el mismo origen y puerto que la API (en Docker de desarrollo, `http://127.0.0.1:${BACKEND_PUERTO}/scalar/v1`). |
| 3 | Una prueba verifica que `/scalar/v1` responde 404 en `Production` y 200 en `Development`. |
| 4 | La versión del paquete se fija en `Directory.Packages.props` como las demás y la actualiza Dependabot. |

Queda en Propuesto hasta que quien desarrolla la cierre.

## Consecuencias

- Se puede probar el flujo completo desde el navegador: llamar a `POST /api/auth/login` y luego a cualquier endpoint con la sesión activa.
- Una dependencia más en la WebApi, que también se incluye en la imagen de producción aunque ahí no se registre la ruta.
- No cambia `openapi/v1.json` ni el cliente generado.
- No resuelve la falta de autorización en algunos grupos de endpoints. La interfaz la hace más visible en desarrollo, pero no la agrava: esos endpoints ya se pueden llamar con cualquier cliente HTTP.

## ADR relacionados

- ADR-0003 — Cliente OpenAPI generado en el frontend.
- ADR-0007 — Autenticación con cédula (cookie `SameSite=Strict`).
