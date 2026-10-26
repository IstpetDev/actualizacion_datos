# ADR-0020 — Retirada del control de clasificación docente

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

El issue #80 unifica #81: `EsDocente` se persiste pero ninguna regla lo consume. «Aplica rol docente» sugiere cambios de permisos o requisitos inexistentes. Spec-0004 v0.1 aprobó retirar su representación en la pantalla conservando la compatibilidad.

## Opciones

1. Darle efectos de negocio: exige definir nuevas reglas, fuera del alcance aprobado.
2. Retirar el check y la columna docente, conservando el dato y la API.
3. Borrar también el atributo: rompe compatibilidad y contradice la semilla `DOCENTE (esDocente)` solicitada.

## Decisión

Se adopta la opción 2, aprobada mediante «continua con lo que propones» en esta conversación, junto con spec-0004 v0.1. La pantalla no muestra el check ni la columna docente. Editar o desactivar un tipo conserva su atributo; los tipos nuevos creados manualmente usan `false`, y la semilla `DOCENTE` usa `true`.

## Consecuencias

El atributo no cambia permisos, requisitos, secciones ni exportaciones. Se evita sugerir una regla que no existe y se conservan datos y contratos. Una futura regla docente necesita su propia spec y decisión; este ADR no la anticipa.

## ADR relacionados

- ADR-0010 — Tipos institucionales.
- ADR-0019 — Semillas de tipos institucionales.
