# ADR-0024 — Perfil profesional generado

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

RF-HDV-020 de spec-0003 permitía perfil escrito por la persona. El responsable funcional solicita generación automática en #88, aprobada en spec-0005 v0.1 mediante «si, continua». La exportación actual no tiene CV individual.

## Opciones

1. Guardar un texto automático: puede quedar desactualizado al editar el expediente.
2. Generar de manera determinista al revisar y exportar, sin persistirlo.

## Decisión

Opción 2. Una regla común cuenta títulos, estudios en curso, capacitaciones y experiencias del expediente y describe esos registros, sin inferir competencias, años o acreditaciones. No usa datos sensibles ni servicios externos. Se muestra en revisión, en una columna del Excel y en el CV HTML autocontenido por persona aprobada dentro del ZIP existente. El HTML codifica texto y mantiene permisos y enmascaramiento bancario.

La persona no edita el perfil y el request no lo admite, ni vacío ni nulo. La columna histórica se conserva temporalmente pero no se usa ni se expone. No se realiza borrado masivo y su eliminación física queda para una decisión posterior. La foto sigue opcional. Una nota de spec-0003 sustituye la parte de perfil de RF-HDV-020 sin aprobar otras propuestas de v0.5.

## Consecuencias

No se necesita guardar ni sincronizar el texto; revisión y exportación usan la misma regla. Se prueba perfil inyectado, texto legado, expediente vacío, cambios de conteos, HTML escapado y aislamiento. No se incorpora PDF ni IA.

## ADR relacionados

- ADR-0010 — Estructura del expediente.
- ADR-0013 — Cuenta enmascarada.
- ADR-0023 — Validación y dominios.
