# Vacaciones: marco y régimen aplicable — Spec

**ID:** spec-0022 / #183; coordinación #182; activación E0 #189

**Versión:** 0.2

**Estado:** Aprobada v0.2 para Entrega 1 — Modo A (puertas E0 y ADR-0044 resueltas en #189)

**Revisión funcional:** RR. HH. y Jurídico, según declaración del solicitante; decisiones E0 confirmadas por @bryancito1090 en #189

**Fecha:** 2026-11-10

**Áreas afectadas:** Documentación; futura aplicación en `src/Backend` y `src/Frontend`

## Aprobación y alcance de Entrega 1

La aprobación funcional inicial (v0.1) fue comunicada por el solicitante el 2026-11-10 ([registro de aprobación](../../evidencia/issue-182/aprobacion.md)). En [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) ([evidencia E0](../../evidencia/issue-189/README.md)) quien desarrolla (@bryancito1090) cerró como **Vigentes** los ADR [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md), [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) y [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) para Modo A, confirmó la política de facultades, fuentes, certificaciones y bloqueo de instituciones incompletas, y congeló los contratos de [plan.md](plan.md).

El alcance aprobado es **Modo A: acta imprimible y estado de verificación física, sin cálculo ni afirmación de saldo legal certificado**. El Modo B, FIFO, devengo, anticipos, incentivos y caducidad se conservan como referencias diferidas, sin tareas de implementación en Entrega 1. Ninguna institución nace habilitada por defecto ni recibe valores legales pre-sembrados: cada institución permanece en estado `PENDIENTE_CONFIRMACION` hasta que TH/Jurídico/Autoridad registre en el sistema su fuente/cláusula vigente, referencia de custodia documental y delegaciones explícitas.

Esta versión 0.2 resuelve `T-MAR-00` y deja listas para ejecución las tareas de implementación `T-MAR-01` y `T-MAR-02` en [#190](https://github.com/IstpetDev/actualizacion_datos/issues/190).

## Problema y resultado esperado

Una persona autorizada necesita preparar un acta de vacaciones por vínculo laboral e institución; la persona trabajadora obtiene un PDF imprimible, firma físicamente y una persona autorizada registra la verificación. La institución consulta quién verificó, cuándo y con qué respaldo. Emitir o descargar el PDF no significa que esté firmado, que se haya gozado la vacación ni que exista saldo legal certificado.

Esta es la spec marco de cuatro documentos funcionales: [vínculos e historia](../spec-0023/spec.md), [períodos y saldos](../spec-0024/spec.md) y [acta y firma](../spec-0025/spec.md). Esta etapa es exclusivamente documental. La aprobación del alcance Modo A habilita #187; no habilita programación desde este milestone.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato y estado de confirmación |
|---|---|---|
| Solicitud funcional | [#182](https://github.com/IstpetDev/actualizacion_datos/issues/182), [#183](https://github.com/IstpetDev/actualizacion_datos/issues/183) | Confirmados como alcance solicitado: PDF, firma física, multiinstitución, privacidad, orden de aprobación y exclusiones. No contienen validación jurídica por institución. |
| Flujo documental | [Guía de specs](../README.md), [AGENTS.md](../../../AGENTS.md) | Sin aprobación explícita de una versión no se crean `plan.md`, `tasks.md` ni `test-e2e.md`. |
| Código del Trabajo | [PDF inicial del Ministerio del Trabajo](https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/CODIGO_DEL_TRABAJO.pdf), arts. 69–78 | Consultado el 2026-11-09. El archivo declara última reforma de 2023-05-12; se localizaron los artículos. Contiene reglas sobre descanso, derechos adicionales, pago, oportunidad y acumulación. **No acredita vigencia a la fecha ni aplicabilidad a un vínculo.** No se transcriben cifras como configuración. |
| LOEI | [PDF inicial del Ministerio de Educación](https://educacion.gob.ec/wp-content/uploads/downloads/2024/07/Ley-Organica-Educacion-Intercultural.pdf) | Intento de consulta 2026-11-09: tiempo de espera del navegador y error de validación del certificado en descarga alternativa; no se omitió TLS. Contenido, versión, artículos aplicables y reformas **pendientes de verificar** con Jurídico. No se asigna LOEI por ser docente. |
| LOSEP | [PDF inicial del Ministerio del Trabajo](https://www.trabajo.gob.ec/wp-content/uploads/2024/01/LEY-ORGANICA-DE-SERVICIO-PUBLICO.pdf), arts. 3 y 29 | Consultado el 2026-11-09; cabecera declara última reforma de 2023-05-12. El art. 29 aborda vacaciones y acumulación. Vigencia actual y aplicabilidad **pendientes**; únicamente candidata si el vínculo está sujeto a este régimen. |
| Contratos y políticas | Documentos individuales/colectivos y políticas de cada institución, aún no aportados | Sin fuente, edición, artículo/cláusula, período de vigencia ni aprobación: no se consideran reglas confirmadas. Los respaldos personales permanecen fuera del repositorio público. |
| ADR-0004 — Vigente | [Multitenencia](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) | Aislamiento por institución; el superadmin es el único rol que opera entre instituciones. |
| ADR-0038 — Vigente | [Roles institucionales](../../decisiones/ADR-0038-asignacion-roles-institucionales.md) | Existe un rol por persona institucional. No hay un rol TH implementado ni permiso de vacaciones deducible del nombre del rol. |
| Arquitectura nueva — Vigente | [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) | Opción 1 adoptada en #189 para Modo A: configuración tipada, versionada y con vigencia por institución (`MarcoVacacional`) y delegación explícita (`FacultadVacacional`). |
| Legado | [Informe de contraste y límites](../../evidencia/issue-182/README.md) | Evidencia de comportamiento de otro producto, nunca fuente normativa ni aprobación funcional. |

**Comprobación exigida al aprobar:** TH/Jurídico debe registrar por fuente su texto vigente, publicación/reformas, artículos o cláusulas aplicables, fecha de comprobación, ámbito personal/institucional y referencia de validación. Una URL oficial accesible o la ruta `2024/` no prueban actualidad. No se afirma que no existan reformas posteriores a los archivos consultados.

## Alcance

**Incluye:** selección de institución/vínculo/período verificados; preparación, emisión y descarga privada del PDF; firma manuscrita fuera del sistema; verificación administrativa y consulta; reglas de corrección, anulación y auditoría. Dos modos de saldo sujetos a aprobación, definidos en spec-0024.

**Excluye:** permisos por horas/días, licencias de cualquier causa, otras ausencias, recuperación de feriados, cierres colectivos automáticos, reconstrucción de incentivos del legado, nómina, pago/liquidación de vacaciones, firma electrónica y gestión completa de contratos. El calendario de feriados para contar vacaciones sí se contempla, sin gestionar recuperación.

**Límites:** comienza con una preparación autorizada y termina con la consulta de su estado documental. La verificación no certifica por sí sola la legalidad del derecho, la autenticidad pericial de una firma ni el goce efectivo.

## Modelo conceptual y matriz por institución

`Institucion → VinculoLaboral → AsignacionRegimen → VersionRegimen`; el vínculo remite a la persona institucional existente. Cada asignación tiene intervalo de vigencia y respaldo. La misma persona humana en dos instituciones conserva relaciones independientes; no comparte fechas ni saldos automáticamente. No se impone una nueva identidad global (spec-0023).

| Institución ficticia / población | Régimen candidato, sin asignación automática | Fuente necesaria | Estado |
|---|---|---|---|
| Institución Educativa Ejemplo A / personal administrativo | Código del Trabajo u otro que determine Jurídico | Naturaleza del empleador, contrato y norma vigente | Pendiente TH/Jurídico |
| Institución Educativa Ejemplo A / personal docente | Normativa educativa especial, Código del Trabajo u otra aplicable | Ámbito educativo real, vínculo y norma especial | Pendiente TH/Jurídico |
| Institución Educativa Ejemplo B / personal bajo eventual régimen público | LOSEP únicamente si procede; revisar normativa especial | Naturaleza de la institución, nombramiento/contrato y ámbito de ley | Pendiente TH/Jurídico |
| Cualquier institución / condiciones más favorables | Contrato individual/colectivo y política institucional, subordinados al marco aplicable | Cláusula, vigencia y validación de compatibilidad | Pendiente TH/Jurídico |

No hay valores legales predeterminados ni copia de configuración de una institución a otra. `PENDIENTE` se distingue de `NO_APLICA`; este último también requiere fundamento. Toda configuración conserva fuente, aprobador, fecha de aprobación y vigencia. Parámetros contradictorios o incompletos bloquean el cálculo correspondiente.

| Parámetro configurable por institución/régimen/versión | Dominio que debe decidir TH/Jurídico | Valor en esta versión |
|---|---|---|
| `criterio_elegibilidad` | Ámbito personal y dedicaciones, sin buscar el texto «PARCIAL» | Pendiente |
| `tipo_periodo` / `ancla_periodo` | Aniversario, ciclo institucional u otro sustentado | Pendiente |
| `tipo_conteo_dias` | Calendario o hábiles; jornada/calendario aplicable | Pendiente |
| `dias_base_anuales` | Derecho según fuente y población | Pendiente |
| `regla_devengo_proporcional` / `precision_redondeo` | Unidad, fecha de exigibilidad y tratamiento de fracciones | Pendiente |
| `aplica_antiguedad` / `anios_umbral_antiguedad` | Inicio y continuidad computable | Pendiente |
| `dias_adicionales_por_anio` / `tope_dias_antiguedad` | Escala y límite, si aplican | Pendiente |
| `permite_fraccionamiento` | Límites y autorizaciones | Pendiente |
| `max_acumulacion_periodos` / `regla_caducidad` | Condiciones y límites según fuente; sin pérdida automática por antigüedad del dato | Pendiente |
| `regla_feriados` | Inclusión/exclusión, localidad y fuente de calendario | Pendiente |
| `regla_fines_semana` / `cupo_fines_semana_periodo` | Conteo, cupo y eventual empalme | Pendiente |
| `regla_retorno` / `regla_aniversario_bisiesto` | Día siguiente y calendario; aniversario de ingreso del 29 de febrero | Pendiente |
| `regla_anticipos` / `orden_consumo_bolsas` | Admisibilidad, aprobación y orden base/incentivo | Pendiente |
| `plantilla_base_legal_acta` | Cláusula aprobada y versión, sin texto jurídico genérico automático | Pendiente |

## Actores y permisos funcionales por validar

| Actor funcional | Operaciones propuestas | Restricción confirmada / decisión pendiente |
|---|---|---|
| Persona trabajadora | Consultar/descargar sus actas emitidas y estado | Solo documentos propios de la institución de sesión; no certifica fechas ni firma propia |
| Persona autorizada de TH | Preparar, emitir y consultar actas del ámbito asignado | Designación y correspondencia con `admin`/`supervisor` pendientes; por defecto sin facultad de vacaciones |
| Verificador autorizado | Registrar resultado de revisión física y respaldo | Designación, separación respecto del emisor y suplencias pendientes |
| Admin institucional | Consulta operativa de vacaciones si obtiene facultad expresa | El rol técnico no prueba delegación jurídica ni autoriza firma por sí solo |
| Superadmin | Configuración global dentro de permisos aprobados | Sin verificación física ni acceso irrestricto a evidencia por ser superadmin; alcance explícito y auditado |

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-VAC-MAR-001 | Dada una sesión institucional, cuando consulta/prepara/descarga un acta o su evidencia, el sistema limita persona, vínculo, período y documento a ese ámbito y facultad, también ante identificadores ajenos. | Obligatorio | #182, ADR-0004 |
| RF-VAC-MAR-002 | Dado un régimen sin confirmación vigente de TH/Jurídico, cuando se solicita cálculo automático, el sistema lo bloquea con lista de datos pendientes, sin valores de respaldo implícitos. | Obligatorio | #182, #183 |
| RF-VAC-MAR-003 | Dada una configuración confirmada, cuando cambia una regla, el sistema crea una versión con vigencia y fuente, conserva la aplicada a eventos/documentos previos y avisa de conflictos de asignación. | Obligatorio | #183; propuesta sujeta a ADR-0044 |
| RF-VAC-MAR-004 | Dado un acto documental, cuando se emite, descarga o recibe un adjunto, el sistema conserva firma pendiente hasta que un verificador autorizado registra revisión física conforme a spec-0025. | Obligatorio | #182, #186 |
| RF-VAC-MAR-005 | Dada una solicitud de permisos, licencia u otra ausencia, cuando se intenta registrarla como vacaciones, el sistema rechaza esa operación en Entrega 1. | Obligatorio | #182 |
| RF-VAC-MAR-006 | Dado un vínculo con historia incompleta, cuando se consulta saldo o acta, el sistema usa el modo explícito de spec-0024 y no convierte ausencia de datos en saldo cero ni en derecho acumulado. | Obligatorio | #182, #184, #185 |
| RF-VAC-MAR-007 | Dado un operador sin facultad aprobada, cuando intenta emitir, certificar o verificar, el sistema deniega la operación aunque su rol técnico sea admin o supervisor. | Obligatorio | #183, #186; designaciones pendientes |

## Escenarios del proceso

Todos los actores/datos de ejemplo son inventados: Persona Trabajadora Ejemplo (`9999999999`) y Operador Demo, en Institución Educativa Ejemplo A/B. Las precondiciones que dicen «aprobado» son hipotéticas para aceptación futura, no aprobaciones presentes.

### ESC-VAC-MAR-01 — Régimen desconocido (RF-VAC-MAR-002, RF-VAC-MAR-006)

**Actor y precondición:** TH de A, vínculo cargado sin régimen confirmado. **Disparador:** abrir cálculo de disponibilidad. **Dado** ese estado, **cuando** pide saldo, **entonces** ve «Régimen pendiente de confirmación» y decisiones faltantes; no una cifra. Puede completar el borrador, sin emitir hasta satisfacer los requisitos del acta. **Variante:** una dedicación parcial no se interpreta automáticamente como inelegibilidad.

### ESC-VAC-MAR-02 — Instituciones independientes (RF-VAC-MAR-001, RF-VAC-MAR-007)

**Dado** un operador facultado solo en A y una persona humana con registros en A y B, **cuando** consulta un acta de B cambiando su identificador, **entonces** se deniega el acceso sin entregar metadatos ni archivo; permanece sin cambios. **Variante:** ser admin en A no concede facultades en B.

### ESC-VAC-MAR-03 — Cambio de regla (RF-VAC-MAR-003)

**Dado** un régimen hipotéticamente confirmado para A y un acta emitida con su versión anterior, **cuando** TH incorpora una regla con otra vigencia, **entonces** los nuevos eventos usan la versión que corresponda y el PDF previo mantiene bytes, fuente y versión. **Error:** dos asignaciones incompatibles para el mismo intervalo bloquean cálculo/emisión hasta resolución explícita.

### ESC-VAC-MAR-04 — Alcance y firma (RF-VAC-MAR-004, RF-VAC-MAR-005)

**Dado** un acta emitida, **cuando** la persona trabajadora descarga el PDF o un operador recibe un escaneo, **entonces** la firma sigue pendiente y se ofrece revisión al verificador facultado. **Variante:** al intentar cargar una licencia, el flujo informa que no está incluida en esta entrega.

## Datos, seguridad e integraciones

Se registran versiones de reglas y referencias privadas de validación, nunca expedientes ni firmas en Git. La aplicación futura verificará permisos en servidor, con institución de sesión, y auditará actor, ámbito, operación, resultado y fecha. No se definen endpoints ni nuevas dependencias en este borrador. La relación con el legado es de consulta documental; no hay conexión, importación automática ni aceptación de sus cifras.

## Criterios de aceptación

- [x] RF-VAC-MAR-001/007 y ESC-02: asignaciones y aislamiento validados por responsables de las instituciones; delegación explícita sin permisos implícitos por rol registrada en #189.
- [x] RF-VAC-MAR-002/003 y ESC-01/03: matriz de fuentes, parámetros y bloqueos aprobada para Modo A; instituciones sin fuente/cláusula confirmada permanecen deshabilitadas (`PENDIENTE_CONFIRMACION`).
- [x] RF-VAC-MAR-004/005/006 y ESC-01/04: límites, firma física y modos coherentes con las otras tres specs.
- [x] Las fuentes se comprueban al activar cada institución; cualquier parámetro de Modo B conserva su diferimiento explícito.

## Puntos que requieren decisión

El alcance A/B y las puertas E0 quedan resueltos para Entrega 1 en Modo A mediante [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) ([evidencia E0](../../evidencia/issue-189/README.md)); las instituciones incompletas se mantienen sin habilitar hasta el registro en aplicación de su fuente/cláusula y delegaciones con referencia de custodia.

| ID | Pregunta exacta / dato faltante | Impacto y bloqueo | Quién decide |
|---|---|---|---|
| PD-MAR-01 | ¿Qué naturaleza jurídica y régimen corresponde a cada institución, población y vínculo, incluida normativa especial educativa aplicable? | Resuelto para E0 en #189: no se pre-siembra ningún régimen en código/migración; cada institución nace en `PENDIENTE_CONFIRMACION` y TH/Jurídico registra en `MarcoVacacional` la fuente aplicable con referencia de custodia antes de habilitar emisión | TH + Jurídico (regla de activación confirmada en #189) |
| PD-MAR-02 | ¿Qué texto, publicación, reformas y artículos/cláusulas están vigentes a la fecha de aprobación? ¿Existe normativa especial adicional? | Resuelto para E0 en #189: cada revisión de `MarcoVacacional` exige registrar publicación/reforma, cláusula aprobada, vigencia y referencia documental en custodia institucional; sin ello se bloquea la emisión (`409`) | Jurídico (regla de activación confirmada en #189) |
| PD-MAR-03 | ¿Cuáles son los valores y fuentes de cada parámetro de la matriz, incluidos los que no aplican? | Resuelto para Modo A en #189: en Modo A solo se exige fuente y `plantilla_base_legal_acta` confirmadas; los parámetros numéricos de cálculo de saldo permanecen diferidos a Modo B | TH + Jurídico (confirmado en #189) |
| PD-MAR-04 | ¿Qué roles técnicos y delegaciones permiten preparar, emitir, entregar, consultar y verificar? ¿Se exige un verificador distinto del emisor? | Resuelto en #189: ningún rol técnico (`usuario`, `supervisor`, `admin`, `superadmin`) tiene facultades implícitas; se requiere delegación explícita en `FacultadVacacional` por institución y operación, y el verificador de firma física nunca puede ser la persona trabajadora titular | Responsable funcional + autoridad institucional (confirmado en #189) |
| PD-MAR-05 | Resuelto para planificación: Entrega 1 solo Modo A, con declaración de saldo no certificado. Modo B diferido. | Habilita #187 y E1–E6 dentro de ese alcance; la emisión exige datos y contenido institucionales aprobados | Aprobación comunicada por el solicitante, 2026-11-10 |
| PD-MAR-06 | ¿Se adopta alguna opción de ADR-0044? | Resuelto en #189: se adopta la Opción 1 de [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) acotada a Modo A; ADR-0044 pasa a Vigente | @bryancito1090 (quien desarrolla, 2026-11-10) |

## Revisión funcional

**Versión revisada:** 0.2, delimitada a Entrega 1 en Modo A con decisiones E0 resueltas en #189

**Decisión:** Aprobada para planificación e implementación de Modo A; Modo B diferido

**Aprobó:** RR. HH. y Jurídico según confirmación del solicitante (v0.1); decisiones técnicas y de activación E0 (v0.2) registradas por @bryancito1090 en #189

**Fecha y evidencia de aprobación:** Comunicación del solicitante del 2026-11-10 ([registro v0.1](../../evidencia/issue-182/aprobacion.md)) y cierre de puertas E0 del 2026-11-10 ([evidencia #189](../../evidencia/issue-189/README.md))

**Ajustes solicitados:** Mantener Modo B diferido, contratos congelados en `plan.md` v1.0 y bloqueo en tiempo de ejecución para instituciones incompletas sin valores inferidos

Solo una aprobación explícita de esta versión habilita `plan.md`, `tasks.md` y `test-e2e.md`. Las instituciones sin fuente, cláusula o delegaciones registradas en el sistema conservan su bloqueo de activación operativa.
