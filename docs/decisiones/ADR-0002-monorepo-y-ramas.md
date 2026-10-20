# ADR-0002 — Monorepo y ramas `main` / `develop`

- **Estado:** Vigente
- **Fecha:** 2026-10-20

## Contexto

Backend y frontend evolucionan juntos y comparten el contrato OpenAPI. El repositorio es público y lo mantiene un equipo pequeño. La política de ramas parte de `plantilla-ci-cd`.

## Opciones

1. **Monorepo** (`src/Backend`, `src/Frontend`, `openapi/`, `docs/`) con dos ramas permanentes, `main` y `develop`.
2. **Dos repositorios** (backend y frontend). Despliegues independientes, pero el contrato OpenAPI y las specs quedarían repartidos y habría que sincronizar versiones.
3. **Una sola rama** con ramas de funcionalidad. Más simple, pero sin una rama estable que proteger.

## Decisión

Se adopta la opción 1.

- `main` es la rama estable y solo recibe PR desde `develop` y `hotfix/*`.
- `develop` es la rama de integración y recibe PR desde `feature/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`, `test/*` y `ci/*`.
- **Excepción:** `develop` también acepta PR desde `main`, únicamente para devolver un hotfix y que `develop` no pierda esa corrección.
- Nadie hace `push` directo a `main` ni a `develop`.
- El título del PR sigue `tipo: resumen en minúsculas`, con tipos `feat`, `fix`, `docs`, `chore`, `refactor`, `test` y `ci`.

La política se aplica con un workflow que valida rama de origen, destino y título.

## Consecuencias

- Un solo PR puede cambiar backend, frontend y contrato de forma coherente.
- El CI debe filtrar por rutas para no compilar lo que no cambió (ver ADR-0005).
- Las reglas de protección de GitHub se configuran a mano y quedan documentadas en CONTRIBUTING.
- La excepción de `main` hacia `develop` debe usarse solo para hotfix.

## ADR relacionados

- ADR-0005 — CI por niveles y filtro por rutas.
