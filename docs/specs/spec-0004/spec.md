# Tipos institucionales base y clasificación docente — Spec

**ID:** spec-0004; issue #80 (unifica #81)

**Versión:** 0.1

**Estado:** Aprobado

**Revisor funcional:** Responsable funcional del issue #80

**Fecha:** 2026-10-26

**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

Una institución nueva no tiene tipos de funcionario ni de documento. El admin debe crearlos antes de configurar los requisitos. Además, «Aplica rol docente» sugiere un efecto que no existe y el formulario de documentos vuelve a proponer orden 1 después de cada alta.

La versión aprobada entrega catálogos institucionales iniciales editables, retira el control docente de la pantalla y sugiere un orden libre al crear documentos. La aprobación funcional de la lista y de la retirada del control consta al final del documento.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Issue | https://github.com/IstpetDev/actualizacion_datos/issues/80 | Semilla por institución e idempotente; decisión funcional de la lista y del campo docente; corrección del orden. Etiqueta `decision` ya presente. |
| Spec previa | `docs/specs/spec-0003/spec.md`, v0.4 aprobada; v0.5 en revisión | Configuración institucional de documentos y requisitos; cinco documentos acordados en el escenario 3. Las propuestas de la v0.5 no se consideran aprobadas. |
| ADR vigente | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Aislamiento por institución. |
| ADR vigente | ADR-0010, Vigente, `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md`, decisiones 6 y 7 | Tipos institucionales y requisitos por tipo de funcionario o para todos. |
| ADR abierto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | No se cierra ni se resuelve con este cambio. |
| Alta institucional | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioInstituciones.cs`, `CrearInstitucionAsync` | Actualmente guarda institución, administradores y auditoría sin estos catálogos. |
| Semilla existente | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/20261022172301_AgregarSemillasAcademicasYCapacitacion.cs` | Precedente de datos iniciales versionados; son catálogos compartidos, distintos de los tipos institucionales. |
| Pantalla | `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts` | Muestra el control y la clasificación docente; reinicia el orden en 1. |

## Alcance

**Incluye:** nuevas instituciones y completar tipos faltantes en instituciones existentes; conservar personalizaciones; orden sugerido; retirada del control y de la columna docente de la pantalla de configuración.

**Excluye:** sembrar requisitos, imponer documentos obligatorios, modificar permisos o secciones de hoja de vida, asignar automáticamente tipos a personas y cambiar contratos públicos de la API. Los títulos académicos siguen en su sección existente y no se duplican como documento personal.

## Configuración funcional aprobada

Tipos de funcionario activos: `DOCENTE` («Docente», `EsDocente = true`) y `ADMINISTRATIVO` («Administrativo», `EsDocente = false`).

Tipos de documento activos, con estos valores iniciales configurables:

| Orden | Código | Nombre | Instrucción por defecto | Exige vencimiento |
|---|---|---|---|---|
| 1 | `CEDULA` | Cédula | Adjunte una copia legible de ambos lados de su cédula. | Sí |
| 2 | `PAPELETA_VOTACION` | Papeleta de votación | Adjunte una copia legible de su papeleta de votación. | No |
| 3 | `ANTECEDENTES_PENALES` | Certificado de antecedentes penales | Adjunte su certificado de antecedentes penales. | No |
| 4 | `DECLARACION_JURAMENTADA` | Declaración juramentada | Adjunte su declaración juramentada notariada. | No |
| 5 | `MECANIZADO_IESS` | Mecanizado del IESS | Adjunte el mecanizado del IESS correspondiente a su historia laboral. | No |
| 6 | `CERTIFICADO_MEDICO` | Certificado médico | Adjunte su certificado médico e indique su fecha de vencimiento. | Sí |

Estas marcas son una propuesta de configuración funcional, no una interpretación normativa. El admin puede ajustarlas. Crear el catálogo no crea requisitos ni exige su carga a las personas.

Para la parte 2 se propone la **opción B en la interfaz**: retirar el check «Aplica rol docente» y la columna de clasificación docente. Conservar el atributo persistido y la API por compatibilidad y para la semilla solicitada en el issue; editar o desactivar un tipo existente debe preservar su valor. Crear un tipo desde la pantalla usa el valor por defecto `false`. No se añade ninguna regla basada en `EsDocente`.

## Requisitos verificables

| ID | Condición y comportamiento observable | Fuente |
|---|---|---|
| RF-TIP-001 | Al crear una institución mediante el flujo existente, quedan guardados sus dos tipos de funcionario y seis tipos de documento base, con los valores aprobados. Si el alta falla, no queda una institución parcialmente inicializada. | Issue #80, parte 1 |
| RF-TIP-002 | Repetir la semilla no duplica códigos dentro de una institución. Solo agrega los faltantes; no sobrescribe nombres, instrucciones, vencimientos, órdenes, clasificación docente ni estados existentes, incluidos los inactivos. | Issue #80, parte 1 |
| RF-TIP-003 | Instituciones existentes reciben solo los tipos faltantes. Los catálogos de dos instituciones son independientes y el admin conserva la edición y desactivación actuales. | Issue #80; ADR-0004 |
| RF-TIP-004 | Al abrir o reiniciar el formulario para un documento nuevo, se propone `máximo(0, órdenes de todos los documentos cargados) + 1`, incluidos los inactivos. Con lista vacía propone 1; tras crear se recalcula con la lista actualizada. El admin puede modificar la sugerencia y editar mantiene el orden guardado. | Issue #80, «Aprovechar para corregir» |
| RF-TIP-005 | La pantalla deja de mostrar el check y la columna docente. Editar o desactivar un tipo no cambia su atributo `EsDocente`. No cambian permisos, requisitos, exportación ni secciones. | Issue #80, parte 2; propuesta B para aprobación |
| RF-TIP-006 | La lista base y el tratamiento del atributo docente quedan documentados en ADR antes de las tareas dependientes, sin cerrar ADR propuestos por iniciativa del agente. | Issue #80, ambas partes; AGENTS.md |

## Escenarios del proceso

### Escenario 1 — Institución nueva

- **Actor y precondición:** superadmin autorizado; institución aún inexistente.
- **Disparador:** alta institucional mediante el flujo actual.
- **Secuencia:** se crea la institución; su admin abre la configuración y ve los dos tipos de funcionario y los seis documentos.
- **Resultado:** valores iniciales de la lista aprobada; ningún requisito creado automáticamente.
- **Error:** si el alta falla, no se conserva una institución con semilla parcial.

### Escenario 2 — Repetición y personalización

- **Actor y precondición:** admin de una institución inicializada; otra institución independiente.
- **Secuencia:** cambia una instrucción, desactiva un tipo y se vuelve a ejecutar la semilla; en una institución existente con catálogo parcial se agregan los faltantes.
- **Resultado:** no hay duplicados, no se revierte ninguna personalización ni se reactiva un tipo; la otra institución no cambia.

### Escenario 3 — Altas consecutivas y edición

- **Actor y precondición:** admin; documentos con órdenes 1, 4 y 7, incluido uno inactivo.
- **Secuencia:** abre el formulario y recibe 8; crea el documento y recibe 9 para el siguiente. Edita el documento de orden 4 y conserva 4. Con catálogo vacío recibe 1.
- **Resultado:** se evita volver a proponer 1 después de cada creación; no se renumeran datos existentes ni se obliga a usar la sugerencia.

### Escenario 4 — Tipos de funcionario

- **Actor y precondición:** admin; tipo `DOCENTE` con atributo interno verdadero.
- **Secuencia:** abre la configuración, edita el nombre y desactiva el tipo.
- **Resultado:** no aparecen el check ni la columna docente; el atributo conserva `true` y no adquiere efectos de negocio.

## Datos, seguridad e integraciones

Solo se crean datos de configuración institucional, sin datos personales ni servicios externos. Se conservan permisos, aislamiento y auditoría del flujo actual. Las pruebas usarán instituciones y personas ficticias. La API conserva sus contratos; si la aprobación exige cambiarlos, se regenerarán OpenAPI y el cliente en el mismo cambio.

## Criterios de aceptación

- [ ] RF-TIP-001: una institución nueva contiene los tipos aprobados, con instrucciones y vencimientos correctos.
- [ ] RF-TIP-002 y 003: doble ejecución, catálogo parcial, personalización, desactivación y aislamiento verificados.
- [ ] RF-TIP-004: orden sugerido verificado al cargar, crear, reiniciar y editar, con lista vacía y tipos inactivos.
- [ ] RF-TIP-005: pantalla sin el control ni columna docente; ediciones preservan el dato interno.
- [ ] RF-TIP-006: decisiones en ADR; issue conserva etiqueta `decision`.
- [ ] Compilación y pruebas de backend y frontend ejecutadas; salida real registrada; checks del HEAD final correctos y PR sin conflictos antes de integrar y cerrar #80.

## Puntos que requieren decisión

| ID | Decisión pendiente | Impacto | Quién decide |
|---|---|---|---|
| PD-TIP-01 | Aprobar o ajustar la lista exacta, instrucciones, vencimientos y ausencia de requisitos automáticos de esta propuesta. | Define la semilla y su ADR. | Responsable funcional |
| PD-TIP-02 | Aprobar la opción B en la interfaz conservando el atributo y la API, o solicitar una alternativa. | Define la pantalla y su ADR; la opción A requeriría concretar la regla de negocio. | Responsable funcional |

## Revisión funcional

**Versión revisada:** 0.1

**Decisión:** Aprobado; PD-TIP-01 y PD-TIP-02 resueltos con la propuesta de esta versión

**Aprobó:** Responsable solicitante del issue #80 en esta conversación

**Fecha y evidencia de aprobación:** 2026-10-26; respuesta «continua con lo que propones» tras presentar la versión 0.1 y sus decisiones

**Ajustes solicitados:** Ninguno

La aprobación explícita registrada habilita `plan.md`, `tasks.md`, `test-e2e.md` y la implementación. Los ADR-0019 y ADR-0020 registran las decisiones correspondientes sin cerrar ADR propuestos anteriores.
