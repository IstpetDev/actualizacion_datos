# ADR-0004 — Multitenancy: esquema único con `institucion_id`

- **Estado:** Vigente
- **Fecha:** 2026-10-20

## Contexto

La primera versión es para una institución, pero el producto debe adaptarse a otras sin una migración dolorosa. El superadmin crea instituciones y los datos de cada una deben quedar aislados. Los datos son personales y su protección es prioritaria. Esta propuesta fue de Claude.

## Opciones

1. **Esquema único** con columna `institucion_id` en las tablas que lo requieran y un filtro global en el acceso a datos.
2. **Un esquema por institución** en la misma base de datos.
3. **Una base de datos por institución.** Mayor aislamiento, pero más costo operativo desde el inicio.

## Decisión

Se adopta la opción 1, diseñada para poder migrar a la opción 3 si hiciera falta. Toda entidad perteneciente a una institución lleva `institucion_id`, y el acceso a datos aplica un filtro global por la institución del usuario autenticado. El superadmin es el único rol que opera entre instituciones.

## Consecuencias

- Operación sencilla: una base, un conjunto de migraciones.
- El aislamiento depende del filtro global; debe probarse que ninguna consulta lo omite.
- Un olvido de `institucion_id` en una entidad nueva sería una fuga de datos entre instituciones.
- Migrar a una base por institución es posible, pero costoso si el código asume una sola base.

## ADR relacionados

- ADR-0001 — Clean Architecture en el backend.
- ADR-0006 — Almacenamiento de archivos (carpeta por institución).
- ADR-0009 — Campos configurables por institución.
