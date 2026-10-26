# ADR-0008 — Granularidad del rechazo

- **Estado:** Vigente
- **Fecha:** 2026-10-21

## Contexto

El flujo de estados es borrador, enviado y, luego, aprobado o devuelto. Un rechazo vuelve al usuario con observaciones. Faltaba definir sobre qué se rechaza: eso afecta el modelo de datos, la pantalla del supervisor y lo que debe corregir el usuario. Solo se conserva la última versión aprobada. La decisión la tomó quien desarrolla, en el issue #4.

Como referencia, el sistema de RRHH que se usaba con enlace mágico devuelve la solicitud completa con una única observación general (estado «requiere corrección»).

## Opciones

1. **Por dato (campo):** el supervisor marca los campos incorrectos con su observación. El usuario corrige solo eso. Más preciso, pero más complejo.
2. **Por archivo:** se rechazan documentos concretos; los datos de texto se aprueban en conjunto.
3. **General:** se devuelve toda la actualización con una observación única. Más simple, pero obliga a revisar todo de nuevo.
4. **General con marcas opcionales:** observación general obligatoria y, si el supervisor quiere, observaciones adicionales sobre campos o archivos concretos.

## Decisión

Se adopta la **opción 4, general con marcas opcionales**:

- Se aprueba o se devuelve **la actualización completa**. No hay aprobaciones parciales.
- Para devolver hace falta una **observación general** no vacía (RF-FLU-003). Además, el supervisor puede añadir cero o más **marcas**, cada una con un destino y un texto obligatorio. El destino es un campo (identificado por su clave) o un archivo (identificado por su id).
- Tras la devolución, **toda** la actualización vuelve a ser editable, no solo lo marcado. Las marcas sirven de guía al usuario y no restringen la edición.
- El usuario ve la observación general y las marcas junto a cada campo o archivo (RF-FLU-004). Al volver a enviar, las observaciones de esa devolución se conservan como historial de la revisión, nunca como historial de datos (RF-FLU-005 sigue vigente).
- Modelo: `Observacion` (actualización, ronda de revisión, texto, autor, fecha, `institucion_id`) y `MarcaObservacion` (observación, tipo de destino `campo` | `archivo`, clave del destino, texto).

## Consecuencias

- La pantalla del supervisor y el flujo de estados son tan sencillos como un rechazo general. Las marcas se añaden sin cambiar el flujo.
- El usuario sabe qué corregir sin que el sistema tenga que aprobar partes por separado.
- La clave del campo es un texto, no una columna, así que funciona igual con campos fijos o configurables (ADR-0009).
- Se pierde la posibilidad de aprobar solo una parte. Si se necesitara, haría falta un ADR nuevo que pase a la opción 1 o 2.
- Una marca puede apuntar a un archivo que el usuario después reemplaza. La marca sigue en el historial de revisión y simplemente deja de tener un archivo asociado visible.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0009 — Campos configurables por institución.
