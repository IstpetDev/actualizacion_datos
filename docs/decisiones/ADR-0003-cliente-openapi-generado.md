# ADR-0003 — Cliente OpenAPI generado en el frontend

- **Estado:** Vigente
- **Fecha:** 2026-10-20

## Contexto

El frontend Angular 22 consume la API del backend. Mantener a mano los tipos y llamadas HTTP genera desajustes entre ambos. La plantilla `plantilla-dotnet-angular` ya resuelve esto con un cliente generado por NSwag. Esta decisión fue propuesta por Claude y aprobada por el usuario.

## Opciones

1. **Cliente generado con NSwag** a partir de `openapi/v1.json`, versionado en el repositorio.
2. **Cliente generado en cada compilación del frontend** y sin versionar. Evita archivos grandes en el repo, pero exige que el frontend pueda compilar el backend o tenga acceso al contrato en cada build.
3. **Cliente escrito a mano.** Sin herramientas, pero propenso a desajustes.

## Decisión

Se adopta la opción 1.

- El backend genera `openapi/v1.json` durante su compilación.
- NSwag genera el cliente del frontend a partir de ese archivo.
- El cliente generado **se versiona** en el repositorio.
- El CI regenera el cliente y compara con lo versionado; si hay diferencias, el check falla (en PR a `develop` y a `main`).
- Los cambios de `openapi/v1.json` y del cliente van en el mismo PR que cambia la API.

## Consecuencias

- El frontend siempre compila contra un contrato revisado en el PR.
- Los PR que cambian la API incluyen archivos generados, más largos de revisar.
- Un contrato desactualizado rompe `ci-ok`.
- Depende de NSwag y de que el backend compile para regenerar el contrato.

## ADR relacionados

- ADR-0001 — Clean Architecture en el backend.
- ADR-0005 — CI por niveles y filtro por rutas.
