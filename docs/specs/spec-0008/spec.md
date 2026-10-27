# Capacitaciones obligatorias de la institución — Spec

**ID:** spec-0008; issue #92  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Por designar (responsable funcional del issue #92)  
**Fecha:** 2026-10-27  
**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

La institución da capacitaciones que **todas las personas deben cursar y de las que deben subir su certificado**. Hoy la sección «Capacitaciones» de la hoja de vida es libre: la persona registra lo que quiera y nada la obliga a subir las de la institución. El supervisor solo se entera de que falta una al revisar, y el admin no tiene forma de saber quién cumplió.

Resultado esperado: el `admin` define qué capacitaciones son obligatorias y a quién aplican; cada persona ve en su sección las que le corresponden, con su estado, y no puede enviar a revisión hasta cumplirlas; el `supervisor` revisa ese cumplimiento y el `admin` lo consulta y lo exporta.

Este cambio **modifica una regla aprobada**: RF-HDV-009 de spec-0003 dice «Ninguna otra sección es obligatoria». Esta spec agrega las capacitaciones obligatorias de la institución a la lista de obligatorios. Las capacitaciones personales y opcionales siguen igual.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Issue | [#92](https://github.com/IstpetDev/actualizacion_datos/issues/92) y su comentario | Petición, flujo propuesto, opciones A/B/C, preguntas abiertas y criterio de pruebas obligatorias. |
| Regla que cambia | `docs/specs/spec-0003/spec.md`, RF-HDV-009 | Lista cerrada de obligatorios para enviar. Esta spec la amplía; spec-0003 no se edita (ver «Qué no cambia»). |
| Regla que se conserva | `docs/specs/spec-0003/spec.md`, RF-HDV-002, 006, 024 | La capacitación es un ítem con identificador propio, con respaldo obligatorio (certificado). |
| Regla que se conserva | `docs/specs/spec-0003/spec.md`, RF-HDV-007, 012, 013 | Requisitos por tipo de funcionario o «todos», configurados por el `admin` de su institución. |
| Regla que se conserva | `docs/specs/spec-0003/spec.md`, RF-HDV-011, RF-HDV-015, RF-HDV-016 | Marcas por ítem del supervisor; aislamiento por institución; exportación por sección. |
| ADR | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Configuración y datos aislados por institución. |
| ADR | ADR-0006, Vigente, `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Reglas de los archivos de respaldo (el certificado). |
| ADR | ADR-0008, Vigente, `docs/decisiones/ADR-0008-granularidad-del-rechazo.md` | Se devuelve la actualización completa, con marcas opcionales por ítem; no hay aprobación parcial. |
| ADR | ADR-0010, Vigente, `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Hoja de vida estructurada; decisión 7: requisitos de documento por tipo de funcionario; decisión 10: respaldo por ítem. |
| ADR | ADR-0020, Vigente, `docs/decisiones/ADR-0020-retirada-del-control-docente.md` | `EsDocente` no tiene efecto de negocio. Esta spec no lo usa para decidir a quién aplica una capacitación. |
| ADR abierto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | No se cierra con este cambio; se cita porque trata de configuración por institución. |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/Capacitacion.cs` | La `Capacitacion` tiene evento, organizadora, tipo, participación, fechas, horas, lugar y financiamiento. **No** tiene noción de «requerida por la institución». |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/RequisitoDocumento.cs` | Mecanismo parecido para documentos: requisito por tipo de funcionario o para todos, obligatorio o no, activo o no. |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | El envío se valida con reglas independientes (`IReglaCompletitudEnvio`); una regla nueva se agrega sin tocar las demás. |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPersonas.cs` (líneas 177 a 193) | El `Cargo de Trabajo` de la nómina solo sirve, al cargar, para proponer el tipo de funcionario por coincidencia de nombre. **No se encontró un cargo persistido** en la persona (búsqueda en `Domain/`). |
| Dependencia | [#76](https://github.com/IstpetDev/actualizacion_datos/issues/76) (cerrado) y spec-0004 | El tipo de funcionario de cada persona ya se asigna y persiste; es la base para saber a quién aplica. |

**Confirmado en el código:** lo que dice la columna «Comportamiento existente». **Inferido, por confirmar:** que el `supervisor` pueda marcar una capacitación obligatoria con el mecanismo de RF-HDV-011, y que la exportación pueda incluir el cumplimiento sin cambiar su estructura.

**ADR:** no existe ninguno sobre capacitaciones obligatorias (búsqueda en `docs/decisiones/`). Hace falta uno nuevo; ver PD-CAP-01.

## Alcance

**Incluye:**
- El `admin` define, edita, desactiva y consulta las capacitaciones obligatorias de su institución.
- Definir a quién aplica cada una: a todas las personas o a un tipo de funcionario.
- La persona ve las obligatorias que le aplican, su estado y sube el certificado.
- Bloqueo del envío a revisión mientras falte alguna obligatoria que le aplica, indicando cuál.
- El `supervisor` ve el cumplimiento de cada obligatoria en la revisión y puede marcarla al devolver (RF-HDV-011).
- El `admin` ve un resumen de cumplimiento por capacitación y por persona.
- Inclusión del cumplimiento en la exportación (RF-HDV-016).

**Excluye:**
- Aplicar la obligatoriedad por **cargo** como texto libre de la nómina (ver PD-CAP-02): el cargo no está persistido.
- Recordatorios o avisos por correo a quien no ha subido la capacitación (PD-CAP-07).
- Exoneraciones por persona (PD-CAP-05), salvo que el revisor las incluya.
- Validar que el certificado sea auténtico o que las horas del certificado alcancen las esperadas.
- Cambiar las capacitaciones personales y opcionales, y los demás requisitos de envío de RF-HDV-009.
- Un catálogo de eventos de capacitación con inscripción, fechas de oferta o cupos.
- Cambiar roles, el flujo de estados o la política de una sola versión aprobada (RF-FLU-005).

**Límites del proceso:** empieza cuando el `admin` crea la capacitación obligatoria y termina cuando cada persona a la que aplica la tiene cumplida y aprobada, o queda pendiente. Ningún sistema externo participa.

## Requisitos verificables

Los requisitos siguientes son una **propuesta** que se apoya en las respuestas propuestas de los puntos PD-CAP-01 a 08. Cada una marcada «propuesta» cambia si el revisor responde distinto.

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-CAP-001 | Dado un `admin`, cuando crea o edita una capacitación obligatoria, el sistema la guarda solo para su institución con nombre, institución organizadora, horas esperadas (opcional) y a quién aplica. Un nombre no se repite dentro de la misma institución entre las activas. | Sin priorizar | Issue #92 punto 1; ADR-0004; RF-HDV-012 |
| RF-CAP-002 | Dado un `admin`, cuando define a quién aplica una capacitación obligatoria, puede elegir «todas las personas» o un tipo de funcionario de su institución. | Sin priorizar | Issue #92; RF-HDV-007 |
| RF-CAP-003 | Dado un `admin`, cuando desactiva una capacitación obligatoria, el sistema deja de exigirla a partir de ese momento y conserva los certificados ya subidos. | Sin priorizar | Propuesta; RF-HDV-012 |
| RF-CAP-004 | Dada una persona con tipo de funcionario, cuando abre su sección «Capacitaciones», el sistema muestra un bloque «Obligatorias de la institución» con las activas que le aplican (las de su tipo y las de «todas»), cada una con su estado: pendiente, cargada u observada. | Sin priorizar | Issue #92 punto 2; RF-HDV-007 |
| RF-CAP-005 | Dada una persona, cuando sube el certificado de una capacitación obligatoria, el sistema lo guarda como una `Capacitacion` suya vinculada a esa obligatoria, con sus propias fechas y horas, y aplica las reglas de archivo de ADR-0006. | Sin priorizar | Issue #92 opción B; RF-HDV-006, 024 |
| RF-CAP-006 | Dada una persona, cuando intenta vincular una segunda capacitación a la misma obligatoria, el sistema reemplaza la anterior; no guarda dos para la misma obligatoria. | Sin priorizar | Propuesta; RF-HDV-008 por analogía |
| RF-CAP-007 | Dado un `usuario` que envía a revisión, cuando le falta alguna obligatoria activa que le aplica, el sistema impide el envío y dice cuál falta. Si la obligatoria no le aplica, no la exige. | Sin priorizar | Issue #92 punto 3; RF-HDV-009 |
| RF-CAP-008 | Dado un `usuario` con una persona sin tipo de funcionario asignado, cuando envía, el sistema le exige solo las obligatorias de «todas las personas». | Sin priorizar | Propuesta; RF-HDV-007 |
| RF-CAP-009 | Dado un `supervisor`, cuando revisa una actualización enviada, ve para cada obligatoria que aplica a la persona su estado y el certificado, y al devolver puede marcarla con un texto obligatorio (RF-HDV-011). | Sin priorizar | Issue #92 punto 4; RF-HDV-011; ADR-0008 |
| RF-CAP-010 | Dado un `admin`, cuando consulta el cumplimiento, el sistema muestra por capacitación obligatoria cuántas personas la tienen cargada, aprobada y pendiente, y permite ver la lista de personas pendientes, solo de su institución. | Sin priorizar | Issue #92 punto 5; RF-HDV-015 |
| RF-CAP-011 | Dado un `admin`, cuando exporta, el Excel incluye por persona el estado de cada capacitación obligatoria que le aplica, y el `.zip` conserva el certificado ordenado por sección. | Sin priorizar | Issue #92 punto 5; RF-HDV-016 |
| RF-CAP-012 | Dada una capacitación obligatoria creada o activada **después** de que una persona envió o fue aprobada, cuando el `admin` la guarda, el sistema no cambia el estado de esa actualización ni la devuelve; la obligatoria aparece como pendiente para esa persona y se le exige en su siguiente envío o en la siguiente campaña (propuesta, PD-CAP-06). | Sin priorizar | Propuesta; RF-HDV-010, RF-FLU-005 |
| RF-CAP-013 | Dado un `usuario`, `supervisor` o `admin`, cuando consulta o modifica obligatorias o sus certificados, el sistema solo opera sobre las de su institución aunque conozca identificadores de otra. | Sin priorizar | RF-HDV-015; ADR-0004 |
| RF-CAP-014 | Dada una actualización enviada o aprobada, cuando el `usuario` intenta subir, cambiar o quitar el certificado de una obligatoria, el sistema lo rechaza, también por la API. | Sin priorizar | RF-HDV-010 |
| RF-CAP-015 | Dado un `usuario`, `supervisor` o `admin` sin permiso, cuando intenta crear, editar o desactivar una obligatoria, el sistema lo rechaza. Solo el `admin` (y el `superadmin`) las configura. | Sin priorizar | Roles de spec-0001 |

## Escenarios del proceso

### Escenario 1 — El admin define las obligatorias

- **Actor y precondición:** `admin` de la institución de prueba, con tipos de funcionario ya creados.
- **Disparador:** abre Configuración de requisitos y crea «Seguridad y salud en el trabajo» (organizadora «Institución de ejemplo», 20 horas) para todas las personas, y «Didáctica activa» solo para el tipo «Docente».
- **Secuencia:** guarda ambas (RF-CAP-001, 002); ve la lista de obligatorias con su alcance.
- **Resultado:** las dos quedan activas y aisladas a su institución.
- **Variantes y errores:** nombre repetido entre activas → rechazo con mensaje (RF-CAP-001); tipo de funcionario de otra institución → rechazo (RF-CAP-013); desactivar una la deja de exigir pero conserva los certificados (RF-CAP-003).

### Escenario 2 — La persona sube sus obligatorias y envía

- **Actor y precondición:** `usuario` de tipo «Docente», con campaña abierta y todo lo demás de RF-HDV-009 completo.
- **Disparador:** abre «Capacitaciones» e intenta enviar.
- **Secuencia:** ve las dos obligatorias como pendientes (RF-CAP-004); intenta enviar y el sistema se lo impide diciendo cuáles faltan (RF-CAP-007); sube el certificado de cada una con sus fechas y horas (RF-CAP-005); envía.
- **Resultado:** actualización enviada, edición bloqueada (RF-CAP-014).
- **Variantes y errores:** una persona de otro tipo no ve «Didáctica activa» y puede enviar sin ella (RF-CAP-007); una persona sin tipo solo ve las de «todas» (RF-CAP-008); un archivo no admitido por ADR-0006 se rechaza con mensaje.

### Escenario 3 — El supervisor revisa y devuelve

- **Actor y precondición:** `supervisor` con una actualización enviada.
- **Disparador:** abre la actualización.
- **Secuencia:** ve el estado y el certificado de cada obligatoria (RF-CAP-009); marca «Didáctica activa» como ilegible y devuelve con observación general.
- **Resultado:** la actualización vuelve a ser editable completa; la persona ve la marca sobre esa obligatoria, que figura como observada.
- **Variantes y errores:** devolver sin observación general se rechaza (RF-FLU-003).

### Escenario 4 — El admin consulta y exporta el cumplimiento

- **Actor y precondición:** `admin` con varias personas en estados distintos.
- **Disparador:** abre el resumen de cumplimiento y exporta.
- **Secuencia:** ve por obligatoria las cifras cargada, aprobada y pendiente y la lista de pendientes (RF-CAP-010); exporta (RF-CAP-011).
- **Resultado:** el Excel muestra el estado por persona y capacitación; el `.zip` trae los certificados por sección.
- **Variantes y errores:** el `admin` de otra institución no ve estos datos (RF-CAP-013).

### Escenario 5 — Obligatoria nueva con personas ya aprobadas

- **Actor y precondición:** `admin`; hay personas con actualización aprobada.
- **Disparador:** crea una obligatoria nueva para todas.
- **Secuencia:** guarda (RF-CAP-001).
- **Resultado:** las actualizaciones aprobadas no cambian de estado; el resumen del `admin` las muestra como pendientes (RF-CAP-012); en su siguiente envío se les exige.
- **Variantes y errores:** ninguna persona recibe un cambio de estado por la creación.

## Datos, seguridad e integraciones

- **Datos nuevos:** definición de la obligatoria (nombre, organizadora, horas esperadas, alcance, activa) y el vínculo entre la capacitación de la persona y la obligatoria que cumple. El certificado ya es un respaldo de `Capacitacion` (ADR-0006); no se crea un almacenamiento nuevo.
- **Quién ve qué:** la persona, solo lo suyo; el `supervisor`, las de las personas que revisa; el `admin`, las de su institución. Nada cruza instituciones (ADR-0004).
- **Auditoría:** crear, editar y desactivar una obligatoria queda registrado como los demás cambios de configuración. Cómo se audita es decisión del diseño, no de esta spec.
- **Datos personales:** los certificados son documentos de la persona. Los ejemplos de pruebas y capturas usan solo datos ficticios (documento `0000000000`, correo `usuario@ejemplo.test`).
- **Integraciones:** ninguna. No se define endpoint; los contratos van en el plan y se regeneran `openapi/v1.json` y el cliente del frontend en el mismo cambio.

## Criterios de aceptación

- [ ] El `admin` crea, edita y desactiva obligatorias solo de su institución (RF-CAP-001 a 003; escenario 1).
- [ ] La persona ve solo las obligatorias que le aplican, con su estado (RF-CAP-004, 008; escenarios 2 y 5).
- [ ] El envío se impide si falta una obligatoria que le aplica y se permite si no le aplica (RF-CAP-007; escenario 2).
- [ ] Subir el certificado crea la capacitación vinculada y una segunda reemplaza a la primera (RF-CAP-005, 006).
- [ ] El supervisor ve el cumplimiento y puede marcar una obligatoria al devolver (RF-CAP-009; escenario 3).
- [ ] El resumen del admin y la exportación muestran el cumplimiento por persona y por capacitación (RF-CAP-010, 011; escenario 4).
- [ ] Una obligatoria nueva no cambia el estado de actualizaciones enviadas o aprobadas (RF-CAP-012; escenario 5).
- [ ] Ninguna operación cruza instituciones ni se permite sin rol (RF-CAP-013, 015).
- [ ] Con actualización enviada o aprobada, la API rechaza cambiar certificados de obligatorias (RF-CAP-014).
- [ ] Las reglas actuales de envío de RF-HDV-009 y el guardado de borradores siguen funcionando; las pruebas existentes siguen en verde.
- [ ] Pruebas nuevas en xUnit y Vitest; `openapi/v1.json` y el cliente regenerados; CI del PR en verde; prueba E2E del flujo completo (admin configura, persona sube, supervisor revisa, admin ve el cumplimiento).

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-CAP-01 | **Modelo.** El issue plantea tres opciones: (A) reutilizar `tipos_documento` y `requisitos_documento`, (B) entidad propia vinculada a cada `Capacitacion`, (C) híbrido. Esta spec redacta los requisitos para el comportamiento descrito en el issue (horas, fechas y vigencia propias en «Capacitaciones»), sin escoger la opción técnica. | No puede diseñarse el plan ni las migraciones. | ADR nuevo, a redactar antes de las tareas; lo cierra quien desarrolla (AGENTS.md) |
| PD-CAP-02 | **¿Por tipo de funcionario, por cargo o por ambos?** El cargo de la nómina no está persistido: solo propone el tipo al cargar. Aplicarlo por cargo exigiría guardarlo. Propuesta de esta spec: **solo por tipo de funcionario o «todas»**, que es lo que ya existe. | RF-CAP-002, 008; si el revisor quiere cargo, hay que agregar el campo y cambiar la carga de nómina. | Revisor funcional |
| PD-CAP-03 | **¿«Todas las personas» sin excepción?** Propuesta: sí, incluye a quien no tiene tipo asignado (RF-CAP-008). | RF-CAP-002, 008 | Revisor funcional |
| PD-CAP-04 | **¿Por campaña o permanente?** Una capacitación de 2026 no es la de 2027. Propuesta: permanente mientras esté activa, y el `admin` la desactiva o crea otra; sin vínculo con campañas en esta versión. | Si es por campaña, hay que relacionarla con las campañas de spec-0001. | Revisor funcional |
| PD-CAP-05 | **Exoneraciones** (persona de licencia, ingreso reciente). Propuesta: fuera de alcance de la v0.1; no hay exoneración por persona. | Sin exoneraciones, nadie puede enviar si falta una obligatoria que le aplica. | Revisor funcional |
| PD-CAP-06 | **¿Qué pasa si se agrega una obligatoria después de que alguien ya envió o fue aprobado?** Propuesta (RF-CAP-012): no se devuelve ni se cambia el estado; queda como pendiente y se exige en el siguiente envío. | Estado de las actualizaciones existentes. | Revisor funcional |
| PD-CAP-07 | **Recordatorios o avisos** a quien no ha subido la obligatoria. Propuesta: excluidos; el `admin` consulta la lista de pendientes. | Requeriría un canal de aviso que hoy no existe. | Revisor funcional |
| PD-CAP-08 | **Qué cuenta como cumplida:** solo el certificado subido, un mínimo de horas o la aprobación del supervisor. Propuesta: basta el certificado subido; el supervisor puede devolver con marca si no lo acepta; las horas esperadas son informativas. | RF-CAP-005, 009, 010 | Revisor funcional |
| PD-CAP-09 | **Edición de una obligatoria ya usada.** Si el `admin` cambia el nombre o el alcance de una obligatoria con certificados subidos, ¿qué ocurre con los vinculados? Propuesta: el cambio de nombre no afecta los certificados; cambiar el alcance solo cambia a quién se exige en adelante. | RF-CAP-001, 003 | Revisor funcional |

## Qué no cambia

- spec-0003 no se edita. Este documento registra el cambio de RF-HDV-009 y, al aprobarse, se pide al revisor registrar en spec-0003 una nota que remita a spec-0008.
- La capacitación personal y opcional, con su respaldo obligatorio por ítem (RF-HDV-024), se conserva tal cual.
- El flujo de estados, los roles y la política de una sola versión aprobada.
- Ni ADR-0009 ni ningún otro ADR «Propuesto» se cierra con este cambio.

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** Pendiente  
**Aprobó:** Pendiente  
**Fecha y evidencia de aprobación:** Pendiente  
**Ajustes solicitados:** Pendiente

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
