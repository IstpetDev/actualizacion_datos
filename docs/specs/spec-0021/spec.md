# Subíndices libres configurables por sección — Spec

**ID:** spec-0021 / Issue #171  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante  
**Revisor funcional:** Solicitante del proyecto (aprobación funcional explícita en sesión del 2026-11-05)  
**Fecha:** 2026-11-05  
**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

Actualmente, el administrador institucional puede abrir o cerrar secciones de la hoja de vida, exigir tipos de documento en la sección 6 (`Documentos personales`) y registrar capacitaciones institucionales obligatorias en la sección 3 (`Capacitaciones`). Sin embargo, en las secciones multi-registro (`Formación académica`, `Experiencia laboral`, `Capacitaciones` y `Referencias`) no existe un mecanismo para que el administrador cree subíndices o apartados libres —por ejemplo, exigir al personal docente diferenciar cargas como «Títulos de 3er Nivel», «Títulos de 4to Nivel», «Título SENESCYT» o «Docencia Superior»— dentro de una sección.

Con este cambio:
- El **administrador institucional** configura subíndices de texto libre por sección (`formacion`, `experiencia`, `capacitaciones`, `referencias`), indicando descripción opcional, orden, si es obligatorio u opcional, y si aplica a todo el personal o a un `TipoFuncionario` específico.
- El **usuario** visualiza en cada sección los subíndices que le aplican (diferenciados con su estado `Cargado` o `Pendiente` y su carácter obligatorio u opcional), puede iniciar el registro directamente sobre un subíndice o elegirlo en el formulario, y conserva intactos sus registros previos sin subíndice.
- El **sistema** bloquea el envío a revisión si falta algún subíndice obligatorio aplicable en una sección abierta (exigiendo además respaldo adjunto en secciones documentales).
- El **supervisor** visualiza en la revisión del expediente a qué subíndice corresponde cada ítem y cuáles subíndices obligatorios continúan pendientes.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Solicitud funcional aprobada | Sesión del 2026-11-05 / Issue #171 | Subíndices de nombre libre configurables por cada sección multi-ítem, diferenciados para carga del usuario y sin dañar datos existentes. |
| ADR-0004 (Vigente) | `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Aislamiento por `institucion_id` y filtro global de EF Core. |
| ADR-0009 (Propuesto) | `docs/decisiones/ADR-0009-campos-configurables.md` | Permanece en estado `Propuesto` (punto abierto para columnas dinámicas arbitrarias; no se cierra ni se usa aquí). |
| ADR-0010 (Vigente) | `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Estructura tipada de `TituloAcademico`, `TituloEnCurso`, `Capacitacion`, `ExperienciaLaboral` y `ReferenciaPersonal` heredando de `RegistroHojaDeVida`. |
| ADR-0028 (Vigente) | `docs/decisiones/ADR-0028-secciones-habilitadas-por-institucion.md` | Las reglas de envío solo exigen requisitos pertenecientes a secciones abiertas en la institución. |
| ADR-0043 (Vigente) | `docs/decisiones/ADR-0043-subindices-configurables-por-seccion.md` | Entidad transversal `SubindiceSeccion` y FK anulable `subindice_seccion_id` en los cinco registros multi-ítem. |

## Alcance

**Incluye:**
- CRUD administrativo de `SubindiceSeccion` con baja lógica (`Activo = false`) para las secciones `formacion`, `experiencia`, `capacitaciones` y `referencias`.
- Asociación opcional (`SubindiceSeccionId`) en `TituloAcademico`, `TituloEnCurso`, `Capacitacion`, `ExperienciaLaboral` y `ReferenciaPersonal`.
- Regla de completitud al enviar (`ReglaSubindicesSeccionObligatorios`) y actualización del cálculo de completitud por sección en `ServicioSecciones`.
- Interfaz de administración (pestaña `7. Subíndices por Sección`), interfaz de carga diferenciada en las cuatro secciones del usuario e interfaz de visualización en revisión del supervisor.

**Excluye:**
- Campos dinámicos o formularios con columnas arbitrarias (tema de `ADR-0009`, que sigue `Propuesto`).
- Modificaciones sobre `FichaPersonal` (registro único por persona), `DocumentosPersonales` (ya cubierto por `TipoDocumento` + `RequisitoDocumento`) o `CuentaBancaria` (registro único).

**Límites del proceso:** Inicia cuando el administrador configura subíndices en su institución y culmina cuando el usuario clasifica sus registros, envía su hoja de vida validada y el supervisor revisa el expediente. No interviene ningún sistema externo.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-SUB-001 | Dado un administrador autenticado en su institución, cuando crea o actualiza un subíndice indicando `seccion` (`formacion`, `experiencia`, `capacitaciones` o `referencias`), `nombre` libre (1..150 caracteres), `descripcion` opcional (máx. 500), `tipoFuncionarioId` opcional, `esObligatorio`, `orden` y `activo`, el sistema persiste el registro aislado por `institucion_id`. | Alta | Issue #171 / ADR-0043 |
| RF-SUB-002 | Dado un subíndice activo existente, cuando el administrador intenta crear o activar otro subíndice en la misma institución, sección y alcance (`tipoFuncionarioId`) con el mismo nombre (insensible a mayúsculas/minúsculas), el sistema rechaza la operación con HTTP 409 (`ConflictoEstadoException`). | Alta | ADR-0043 |
| RF-SUB-003 | Dado un subíndice con registros asociados, cuando el administrador lo elimina/desactiva (`DELETE /api/configuracion/subindices/{id}`), el sistema marca `Activo = false` sin borrar ni desvincular los registros históricos de las personas. | Alta | Issue #171 / ADR-0043 |
| RF-SUB-004 | Dada una persona en campaña abierta con sección habilitada, cuando consulta su hoja de vida (`GET /api/mis-datos/hoja-de-vida`), el sistema devuelve `subindicesSeccion` con los subíndices activos que aplican a su `TipoFuncionarioId` (o generales) y su estado (`cargado` o `pendiente`), además de cualquier subíndice inactivo referenciado por sus propios ítems. | Alta | Issue #171 / ADR-0043 |
| RF-SUB-005 | Dada una persona editando un registro de formación (`TituloAcademico` o `TituloEnCurso`), capacitación, experiencia laboral o referencia, cuando envía `subindiceSeccionId` nulo o perteneciente a un subíndice válido de esa misma sección e institución aplicable a la persona, el sistema guarda el vínculo; si el subíndice pertenece a otra sección, otra institución o no aplica a su tipo de funcionario, responde HTTP 400/404. | Alta | ADR-0043 |
| RF-SUB-006 | Dada una persona que solicita faltantes o envía su hoja de vida a revisión, cuando existe un subíndice activo con `esObligatorio = true` aplicable a su `TipoFuncionarioId` en una sección abierta y la persona no registra al menos un ítem vinculado a dicho subíndice (con `archivoId != null` en formación, capacitaciones y experiencia), el sistema reporta el faltante `<seccion>.subindice.<id>` e impide el envío con HTTP 400. Si la sección está cerrada, no bloquea el envío. | Alta | Issue #171 / ADR-0028 / ADR-0043 |
| RF-SUB-007 | Dado un supervisor o administrador revisando una hoja de vida (`GET /api/revision/{documento}/hoja-de-vida`), la interfaz muestra el nombre del subíndice en cada ítem clasificado y señala los subíndices obligatorios pendientes de la sección. | Media | Issue #171 |

## Escenarios del proceso

### Escenario 1 — Configuración de subíndices libres por el administrador

- **Actor y precondición:** Usuario con rol `Admin` autenticado en la institución `00000000-0000-0000-0000-000000000001`, con tipo de funcionario `DOCENTE` activo.
- **Disparador:** Abre «Configuración de Requisitos» -> pestaña «7. Subíndices por Sección» y registra en `Experiencia laboral` los subíndices «Títulos de 3er Nivel», «Títulos de 4to Nivel» y «Título SENESCYT» marcados como obligatorios para `DOCENTE`.
- **Secuencia:** El frontend invoca `POST /api/configuracion/subindices`; el backend valida sección, longitud y unicidad, guarda en `subindices_seccion` y retorna `201 Created`.
- **Resultado:** Los tres subíndices aparecen ordenados en la tabla del administrador y quedan activos para el personal `DOCENTE`.
- **Variantes y errores:** Si intenta crear otro subíndice activo con igual nombre, sección y alcance, recibe `409 Conflict`. Si intenta usar la sección `ficha` o `documentos`, recibe `400 Bad Request`.

### Escenario 2 — Carga diferenciada y validación de envío del usuario

- **Actor y precondición:** Persona ficticia `0000000001` (`docente@ejemplo.test`) con `TipoFuncionario = DOCENTE`, campaña activa y sección `Experiencia laboral` abierta; ya tenía una experiencia previa registrada antes del cambio (`subindiceSeccionId = null`).
- **Disparador:** Ingresa a «4. Experiencia Laboral».
- **Secuencia:** Visualiza su experiencia previa intacta y un bloque de subíndices requeridos con estado `Pendiente`. Pulsa «+ Registrar en este subíndice» sobre «Títulos de 3er Nivel», completa los campos, adjunta respaldo PDF y guarda.
- **Resultado:** El subíndice pasa a `Cargado` y el registro muestra la etiqueta del subíndice. Si intenta enviar a revisión faltando «Títulos de 4to Nivel», el validador informa el faltante específico de esa sección.

### Escenario 3 — Revisión por el supervisor y desactivación sin pérdida

- **Actor y precondición:** Supervisor autenticado en la misma institución revisando el expediente de `0000000001`.
- **Disparador:** Abre la pestaña de la sección en el expediente.
- **Secuencia:** Observa el resumen de subíndices configurados y la insignia del subíndice en cada ítem cargado. Si posteriormente el admin desactiva el subíndice, deja de exigirse para nuevos envíos pero el ítem histórico conserva su etiqueta.
- **Resultado:** Cero pérdida de trazabilidad ni ruptura de expedientes previos.

## Datos, seguridad e integraciones

- **Datos capturados:** Configuración institucional (`seccion`, `nombre`, `descripcion`, `tipo_funcionario_id`, `es_obligatorio`, `orden`, `activo`) y referencia opcional `subindice_seccion_id` en registros de hoja de vida. Ejemplos siempre ficticios (`0000000001`, `usuario@ejemplo.test`).
- **Seguridad y permisos:** Escritura en `/api/configuracion/subindices` restringida a `Admin` (sobre su propia institución en sesión) y `Superadmin` (con contexto institucional explícito). Lectura de subíndices aplicables para el titular mediante `/api/mis-datos/hoja-de-vida` y para `Supervisor`/`Admin` mediante `/api/revision/{documento}/hoja-de-vida`.
- **Integraciones externas:** Ninguna.

## Criterios de aceptación

- [x] `RF-SUB-001`, `RF-SUB-002`, `RF-SUB-003`: El admin puede listar, crear, editar y desactivar subíndices libres en `formacion`, `experiencia`, `capacitaciones` y `referencias` con aislamiento multi-institución.
- [x] `RF-SUB-004`, `RF-SUB-005`: El usuario ve los subíndices aplicables en cada sección, registra o edita ítems asociándolos a un subíndice y conserva sus ítems previos con `subindiceSeccionId = null`.
- [x] `RF-SUB-006`: `ValidadorCompletitudEnvio` y `ServicioSecciones` exigen los subíndices obligatorios activos aplicables únicamente cuando la sección está abierta.
- [x] `RF-SUB-007`: El supervisor visualiza el subíndice asociado a cada ítem y los subíndices pendientes en el expediente.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-01 | `ADR-0009` («Campos configurables por institución») permanece en estado `Propuesto`. | Ninguno sobre este alcance: este cambio no agrega campos dinámicos arbitrarios, sino clasificación por subíndices resuelta en `ADR-0043`. | Equipo de desarrollo (cuando se aborde `ADR-0009`). |

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** Aprobado  
**Aprobó:** Solicitante del proyecto  
**Fecha y evidencia de aprobación:** 2026-11-05 — Confirmación explícita en sesión («listo empieza con la implementacion del plan, si quiero que los subindices sean libres»).  
**Ajustes solicitados:** Ninguno.
