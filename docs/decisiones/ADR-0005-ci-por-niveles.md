# ADR-0005 — CI por niveles y filtro por rutas

- **Estado:** Vigente
- **Fecha:** 2026-10-20

## Contexto

Un CI lento desincentiva los PR pequeños. A la vez, `main` debe tener controles más estrictos. El CI se implementa con GitHub Actions a partir de `plantilla-ci-cd`. "Aviso" significa que el check se ejecuta pero no bloquea.

## Opciones

1. **Mismos checks completos en todos los PR.** Simple, pero lento en `develop`.
2. **CI por niveles:** ligero y filtrado por rutas en PR a `develop`, completo en PR a `main`.

## Decisión

Se adopta la opción 2, con la siguiente tabla.

| Check | PR a `develop` | PR a `main` |
|---|---|---|
| Política de ramas y título (Conventional Commits) | Bloquea | Bloquea |
| Escaneo de secretos | Bloquea (diff del PR) | Bloquea (historial) |
| Compilación | Debug, solo lo que cambió (filtro por rutas) | Release, backend y frontend |
| Pruebas | Unitarias de .NET y Angular | Unitarias e integración con PostgreSQL en contenedor |
| Formato y lint | Aviso | Bloquea |
| Dependencias vulnerables | Aviso | Bloquea si altas o críticas |
| Cliente OpenAPI al día | Bloquea | Bloquea |
| Build de imágenes Docker | No corre | Bloquea (sin publicar) |
| CodeQL | No corre | Bloquea |
| Validación de workflows (actionlint) | Solo si cambian | Bloquea |
| `ci-ok` | Requerido | Requerido |

Velocidad: cachés de NuGet y pnpm, cancelación de ejecuciones previas del mismo PR, backend y frontend en paralelo, y ejecución completa semanal sobre `develop`. Las acciones de terceros se fijan por hash de commit. El despliegue no forma parte de este ADR.

## Consecuencias

- Los PR a `develop` son rápidos; los problemas más caros se detectan al llegar a `main`.
- Un cambio solo en `src/Frontend` no compila el backend, y viceversa.
- `ci-ok` agrupa los checks requeridos: falla si alguno falla o se cancela y acepta `skipped` solo cuando el filtro lo omitió.
- Fijar acciones por hash exige actualizarlas de forma deliberada (Dependabot).

## ADR relacionados

- ADR-0002 — Monorepo y ramas `main` / `develop`.
- ADR-0003 — Cliente OpenAPI generado en el frontend.
