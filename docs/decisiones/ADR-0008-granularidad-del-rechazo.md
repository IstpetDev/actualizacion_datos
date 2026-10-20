# ADR-0008 — Granularidad del rechazo

- **Estado:** Propuesto
- **Fecha:** 2026-10-20

## Contexto

El flujo de estados es borrador, enviado y, luego, aprobado o devuelto. Un rechazo vuelve al usuario con observaciones. Falta definir sobre qué se rechaza: eso afecta el modelo de datos, la pantalla del supervisor y lo que debe corregir el usuario. Solo se conserva la última versión aprobada. Lo decide quien desarrolle.

## Opciones

1. **Por dato (campo):** el supervisor marca los campos incorrectos con su observación. El usuario corrige solo eso. Más preciso, pero más complejo.
2. **Por archivo:** se rechazan documentos concretos; los datos de texto se aprueban en conjunto.
3. **General:** se devuelve toda la actualización con una observación única. Más simple, pero obliga a revisar todo de nuevo.

## Decisión

Pendiente. La toma quien desarrolle.

## Consecuencias

A completar al decidir. Puntos a considerar: modelo de observaciones, qué queda editable tras la devolución, qué ve el usuario y cómo se combina con campos configurables.

## ADR relacionados

- ADR-0009 — Campos configurables por institución.
