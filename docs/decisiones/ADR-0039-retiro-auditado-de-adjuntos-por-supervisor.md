# ADR-0039 — Retiro auditado de adjuntos por supervisor con eliminación física

- **Estado:** Vigente por pedido explícito #139
- **Fecha:** 2026-10-28

## Contexto

Durante la revisión del expediente por parte del supervisor, este puede detectar adjuntos ilegibles, erróneos o pertenecientes a trámites no correspondientes. Se requiere que el supervisor pueda retirar el adjunto del expediente exigiendo una justificación obligatoria que deje constancia en la auditoría.
Se evaluaron dos alternativas para el ciclo de vida del binario: conservarlo como archivo histórico de auditoría o eliminarlo físicamente del disco para optimizar el almacenamiento del servidor y los volúmenes de Docker.

## Opciones

1. **Opción A (Conservación histórica):** Desvincular el adjunto de la sección y marcarlo como retirado en base de datos, conservando el binario en disco para trazabilidad forense. Desventaja: acumulación indefinida de archivos huérfanos que consumen espacio en disco y backups.
2. **Opción B (Eliminación física con auditoría de metadatos):** Registrar previamente en la tabla de `Auditorias` todos los metadatos del archivo (identificador, nombre original, tamaño, hash SHA-256, persona, institución), el actor (supervisor) y la justificación obligatoria. Acto seguido, desvincular el archivo de la entidad correspondiente, eliminar el registro de `archivos_adjuntos` y borrar inmediatamente el archivo binario del disco (`IAlmacenArchivos.EliminarAsync`).

## Decisión

Se adopta la **Opción B (Eliminación física con auditoría de metadatos)** por instrucción explícita del solicitante en el Issue #139:

1. **Autorización y validación:** Solo usuarios con rol `Supervisor` o `Admin` pueden ejecutar el retiro sobre expedientes de su misma institución. El motivo es obligatorio (mínimo 5 caracteres no vacíos).
2. **Auditoría inmutable:** Antes de la eliminación, se registra en la entidad `Auditoria` el evento `"RetiroAdjuntoSupervisor"`, guardando el ID del supervisor, fecha UTC, institución, documento de la persona afectada, nombre del archivo, hash SHA-256 y el motivo ingresado.
3. **Desvinculación:** Se limpia la referencia en la sección correspondiente (ficha personal, documentos personales, formación académica, capacitaciones, experiencia laboral, referencias personales o cuenta bancaria).
4. **Eliminación física y trazabilidad en consola:** Se invoca `_almacenArchivos.EliminarAsync` borrando el archivo físico `.bin` del disco (volumen Docker o directorio local) y se emite un mensaje informativo en consola/logs indicando la ruta del archivo eliminado.
5. **Fotos de perfil:** En sincronía con esta política de ahorro de espacio, cuando el usuario desvincula o reemplaza su foto de perfil, el archivo físico anterior también se elimina de disco sin dejar copias huérfanas.

## Consecuencias

- **Positivas:** Se evita el crecimiento innecesario de almacenamiento en los volúmenes Docker y copias de seguridad.
- **Trazabilidad:** La auditoría conserva la constancia completa de qué archivo existió, su huella SHA-256, quién lo retiró y la justificación obligatoria, sin necesidad de almacenar el binario descartado.
- **Riesgos mitigados:** Aislamiento multitenant estricto (rechaza retiros entre instituciones distintas) y validación obligatoria del motivo antes de cualquier acción.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0008 — Granularidad del rechazo.
- ADR-0031 — Seguridad en origen, auditoría de infraestructura y verificación de despliegue.
