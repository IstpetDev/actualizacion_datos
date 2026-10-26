# ADR-0010 — Hoja de vida estructurada y catálogos

- **Estado:** Vigente
- **Fecha:** 2026-10-22

## Contexto

El producto existe para que el personal de la institución actualice su **hoja de vida**. Hoy los datos de la actualización se guardan en `personas.datos_personales_json`, un texto sin estructura, y los archivos solo llevan una `clave_destino` libre. Con eso no se puede:

- exportar un Excel o un `.zip` ordenado por secciones (RF-EXP-001, RF-EXP-002);
- marcar una observación sobre un título o un certificado concreto (ADR-0008);
- devolver los datos al sistema de talento humano de la institución, que ya guarda la hoja de vida en tablas (`profesores`, `titulos_profesores`, `titulos_en_curso`, `cursos_profesores`, `certificados_experiencia_laboral`, `doc_tipo_documento`, `doc_requisito_funcionario`, `doc_funcionario_documento` y catálogos como `grados_academicos`, `universidades`, `campo_*_unesco`, `etnias`, `parroquias`).

El sistema de talento humano es la fuente de la estructura. No es la fuente de datos: aquí no se copian registros reales (AGENTS.md). La decisión la pidió quien desarrolla el 2026-10-22, con la condición de explicar el porqué de cada punto.

ADR-0009 (Propuesto) sigue abierto. Este ADR **no** lo cierra: elige secciones fijas para la hoja de vida y respeta sus cuatro restricciones (clave estable por campo, tipos de documento como datos con `institucion_id`, validaciones en un solo lugar de la capa de aplicación, exportación que recorre la definición).

## Opciones

1. **Seguir con un JSON libre por persona.** Sin migraciones nuevas, pero sin integridad, sin catálogos, sin marcas por ítem y con una exportación que tendría que interpretar texto.
2. **Copiar las tablas del sistema de talento humano tal cual** (nombres, claves `VARCHAR(14)` por cédula, una tabla por catálogo). Facilita una sincronización 1:1, pero arrastra problemas del origen: la cédula como clave primaria, columnas sin uso aquí (sueldos, vacaciones, verificación interna), límites por tipo de documento que contradicen ADR-0006, y no tiene `institucion_id`.
3. **Modelo propio, por secciones, inspirado en el origen**, con `institucion_id` y `persona_id` en cada registro, claves GUID, catálogos compartidos y un código externo para mapear con el sistema de origen.

## Decisión

Se adopta la **opción 3**. Cada punto, con su razón:

| # | Decisión | Por qué |
|---|---|---|
| 1 | La hoja de vida se divide en secciones fijas: **ficha personal** (1 a 1 con la persona), **títulos obtenidos**, **títulos en curso**, **capacitaciones**, **experiencia laboral** y **documentos personales**. | Son las secciones que usan las cuatro plantillas de hoja de vida del sistema de talento humano (instrucción formal, experiencia, capacitación, anexos). Fijarlas permite validar, marcar y exportar sin interpretar texto. |
| 2 | La ficha personal es una entidad aparte (`FichaPersonal`), no columnas nuevas en `Persona`. | `Persona` ya concentra acceso, autenticación y estado del flujo. Separar los datos de la hoja de vida evita que cada campo nuevo toque la entidad de seguridad. |
| 3 | Toda entidad de la hoja de vida hereda de `EntidadInstitucional` y lleva `persona_id`. | ADR-0004: el filtro global solo protege lo que tiene `institucion_id`. Un registro sin él sería una fuga entre instituciones. |
| 4 | Claves GUID; la cédula no es clave. | La cédula puede repetirse entre instituciones (PD-09) y es un dato personal; no debe viajar como identificador en rutas ni índices externos. |
| 5 | Los catálogos nacionales o universales (estado civil, tipo de sangre, etnia, nacionalidad indígena, discapacidad, país, provincia, cantón, parroquia, nivel y grado académico, campos UNESCO, universidad, tipo y financiamiento de beca, tipo de capacitación) van en **una sola tabla** `elementos_catalogo`, con un tipo, un código, un padre opcional y un `codigo_externo`. **No** llevan `institucion_id`. | Son listas oficiales (INEC, SENESCYT, CINE-UNESCO) iguales para cualquier institución; repetirlas por institución no aísla nada. Una tabla con jerarquía (`padre_id`) cubre país → provincia → cantón → parroquia, nivel → grado y amplio → específico → detallado sin 18 tablas casi idénticas. `codigo_externo` guarda el identificador del sistema de origen para importar y exportar. Contrapartida: la base no impide que, por ejemplo, `etnia_id` apunte a una parroquia; esa comprobación se hace en la capa de aplicación. |
| 6 | **Tipos de documento**, **tipos de funcionario** y **requisitos de documento** son datos **por institución** (`institucion_id`). | ADR-0009 exige que el tipo de documento sea un dato por institución. Los tipos de funcionario del origen (por ejemplo, instructor de escuela de conducción) son propios de cada institución, y de ellos depende qué documentos se piden. |
| 7 | Los requisitos se definen por tipo de funcionario (o para todos, si va vacío). No se replican los filtros por departamento ni por cargo del origen. | Este sistema no gestiona departamentos ni cargos. Si hicieran falta, se agregan con otro ADR. |
| 8 | No se replican el formato ni el tamaño máximo por tipo de documento (`formatos_permitidos`, `tamanio_max_mb`). | ADR-0006 (Vigente) ya fija PDF, JPG y PNG y 10 MB para todo archivo. Un límite por tipo sería otra decisión. |
| 9 | Un solo documento vigente por persona y tipo; no se replican `es_actual`, `estado` (Vigente, PorVencer, Vencido) ni los campos de verificación. | RF-FLU-005: no hay historial. La verificación la cubre el flujo de revisión (ADR-0008), no una marca por documento. Las alertas de vencimiento no están en el alcance. |
| 10 | Cada título, capacitación, experiencia o documento referencia su archivo de respaldo con `archivo_id` (FK a `archivos_adjuntos`, `SET NULL` al borrar el archivo). | Sustituye las rutas o URL de texto del origen (`archivo_titulo`, `url_documento`). El archivo sigue las reglas de ADR-0006 y se descarga solo por el backend. |
| 11 | La persona edita los registros en el lugar (no hay copia «propuesta» separada de la «aprobada»). Antes de cada cambio se comprueba que su actualización esté en borrador o devuelta. | El origen guarda un JSON de datos propuestos y lo aplica al aprobar; eso duplica el modelo. Como solo se conserva la última versión aprobada (RF-FLU-005), basta con bloquear la edición fuera de borrador o devuelto. Consecuencia en «Consecuencias». |
| 12 | Los datos de licencia de conducir (categoría y puntos) son campos opcionales del documento personal. | El origen los exige al instructor práctico. Se guardan como datos opcionales del documento, sin lógica propia, hasta que la spec lo pida. |
| 13 | **No** se replican las tablas de titulación ni complexivo (`titul_*`) ni los cambios a `contratos_asignaturas`. | Son la planificación académica de la institución (módulos, mallas, horarios, cronogramas), no datos que la persona actualice sobre sí misma. |
| 14 | `personas.datos_personales_json` se mantiene mientras el frontend lo use y mientras ADR-0009 siga abierto. | Retirarlo ahora rompe las pantallas ya publicadas. Se decidirá con ADR-0009 si queda como campos adicionales o se elimina. |

## Consecuencias

- La exportación, las marcas de observación y una futura sincronización con el sistema de talento humano tienen una estructura estable sobre la que trabajar.
- Los catálogos hay que **cargarlos**: la migración crea las tablas pero solo siembra listas cortas y estables. Universidades, campos UNESCO y división política se importan aparte, desde fuentes oficiales, con `codigo_externo`.
- Una persona aprobada que empieza otra actualización modifica directamente sus datos. Mientras esa actualización no se apruebe, lo que se exporte de ella no será lo aprobado. Se registra como punto abierto en spec-0003.
- Más tablas y más endpoints que mantener. Cada una necesita prueba de aislamiento por institución.
- Si ADR-0009 se decide por campos configurables, la ficha personal es la candidata a volverse configurable; las secciones con varios registros (títulos, capacitaciones) probablemente se mantengan fijas.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0008 — Granularidad del rechazo.
- ADR-0009 — Campos configurables por institución (Propuesto; este ADR respeta sus restricciones y no lo cierra).
