# Vacaciones: vínculos laborales e historia — Spec

**ID:** spec-0023 / #184; coordinación #182

**Versión:** 0.1

**Estado:** Aprobada v0.1 para planificación de Entrega 1 — Modo A

**Revisión funcional:** RR. HH. y Jurídico, según declaración del solicitante; funciones de revisión: Talento Humano y asesoría jurídica de cada institución

**Fecha:** 2026-11-09

**Áreas afectadas:** Documentación; futura aplicación en `src/Backend` y `src/Frontend`

## Aprobación y alcance de Entrega 1

La aprobación funcional de esta versión 0.1 fue comunicada por el solicitante el 2026-11-10: informó que RR. HH. firmó el informe y que Jurídico lo aprobó, y autorizó continuar hasta cerrar #182. Se registra su declaración como evidencia; el agente no inspeccionó el informe físico ni reproduce firmas, nombres, número documental o fecha de suscripción no aportados. Véase [registro de aprobación](../../evidencia/issue-182/aprobacion.md).

El alcance aprobado en la conversación es **Modo A: acta imprimible y estado de verificación física, sin cálculo ni afirmación de saldo legal certificado**. El Modo B, FIFO, devengo, anticipos, incentivos y caducidad se conservan como referencias diferidas, sin tareas de implementación en Entrega 1. Las tablas de preguntas se leen con esta delimitación: la aprobación del informe no inventa valores normativos, delegaciones, fechas ni políticas institucionales concretas. Los datos pendientes necesarios para emitir/verificar se mantienen como bloqueos de activación por institución; no impiden diseñar el flujo que los exige.

Esta aprobación habilita los tres documentos de #187 y su descomposición documental. No aprueba opciones técnicas de ADR Propuestos ni autoriza producción del módulo desde #182.

## Problema y resultado esperado

La fecha opcional de ingreso de una ficha administrativa no demuestra el inicio jurídico del cómputo de vacaciones. TH necesita contrastar contratos, continuidad y reingresos por institución, certificar una fecha y documentar un corte histórico sin fabricar años de vacaciones. La persona trabajadora debe distinguir datos informados de datos certificados.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato y estado |
|---|---|---|
| Solicitud | [#184](https://github.com/IstpetDev/actualizacion_datos/issues/184), [#182](https://github.com/IstpetDev/actualizacion_datos/issues/182) | No inferir fechas ni saldos históricos; validar con TH. |
| Marco normativo | [spec-0022, fuentes y decisiones](../spec-0022/spec.md#fuentes-y-decisiones-vigentes) | CT arts. 69–78 y LOSEP art. 29 consultados el 2026-11-09 en copias con última reforma declarada 2023-05-12; LOEI sin texto verificado por fallo de acceso. Vigencia y aplicabilidad pendientes de Jurídico; contratos/políticas no aportados. No hay regla jurídica de prelación confirmada. |
| Modelo actual | [Persona.cs](../../../src/Backend/src/Istpet.ActualizacionDatos.Domain/Persona.cs), [EntidadInstitucional.cs](../../../src/Backend/src/Istpet.ActualizacionDatos.Domain/EntidadInstitucional.cs) | `Persona` pertenece a una institución y `FechaIngresoInstitucion` es opcional; `AsignarFechaIngreso` no registra certificación jurídica. No existe el historial contractual requerido. |
| ADR-0004 — Vigente | [Multitenencia](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) | Ámbito institucional obligatorio. |
| ADR-0038 — Vigente | [Roles institucionales](../../decisiones/ADR-0038-asignacion-roles-institucionales.md) | Identidad por documento e institución; no migrar silenciosamente a identidad global ni cambiar permisos existentes. |
| ADR-0045 — Propuesto | [Corte histórico](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) | Opciones de representación del saldo certificado, pendientes; no habilita implementación. |
| Legado contrastado | [Evidencia #182](../../evidencia/issue-182/README.md) | Reingreso más reciente y mínimo ficha/contrato describen el legado, no una fuente jurídica ni reglas aprobadas para este producto. |

## Alcance

**Incluye:** relación laboral mínima por institución, referencias contractuales, dedicación/cargo con vigencia, continuidad/ruptura, certificación de fecha, discrepancias, corte y saldos auditados necesarios para vacaciones.

**Excluye:** módulo completo de contratación, validación automática de IESS, nómina, indemnizaciones, pagos, permisos, licencias, recuperación de feriados, otras ausencias y migración masiva automática del legado.

**Límites:** desde la carga de fuentes hasta certificación o registro de «pendiente». El acceso habilitado a la plataforma y la aprobación de hoja de vida no equivalen a certificación laboral.

## Modelo conceptual

| Concepto | Información mínima y alcance |
|---|---|
| Persona institucional | Referencia al `PersonaId` existente y su institución. Una misma persona humana puede tener otra cuenta institucional, sin consolidación automática de expedientes. |
| Vínculo laboral | Identificador propio, `InstitucionId`, `PersonaId`, intervalo, estado informado/certificado, régimen con vigencia y referencias de respaldo. Una persona puede tener episodios históricos y vínculos concurrentes que TH debe clasificar. |
| Referencia contractual | Identificador interno, vínculo, institución, inicio/fin informados, dedicación, cargo, régimen, fuente y estado de verificación. Sin usar cédula como clave técnica nueva. |
| Episodio de continuidad | Intervalo certificado, continuidad/ruptura y motivo; reingreso con referencia al episodio previo. No reiniciar por cualquier cambio de contrato. |
| Certificación de ingreso | Fecha efectiva de cómputo, fuente `CONTRATO`, `HISTORIAL_IESS` o `CERTIFICACION_TH`, responsable, instante de certificación, referencia documental y vigencia/revisión. `PENDIENTE_VERIFICACION` es estado sin fecha certificada, nunca evidencia. |
| Inconsistencia | Fuentes y fechas enfrentadas, advertencia visible, estado de resolución, motivo, actor y respaldo. |
| Certificación de corte | Institución, vínculo/episodio, régimen/versión, fecha de corte, cobertura, desglose de período/bolsa, unidad, saldo certificado, fuente, responsable, fecha de certificación y movimientos ya incluidos. |

No se escoge esquema relacional ni endpoint en esta spec. La certificación de fecha y la de saldo son independientes: una fecha histórica verdadera no acredita días disponibles.

## Reglas de prelación sujetas a certificación

1. Separar fuentes por institución, vínculo/episodio y vigencia; descartar para ese cómputo fuentes de otra institución. La elegibilidad se decide por régimen confirmado, no por texto de dedicación.
2. Si hay ruptura y reingreso **certificados**, proponer el inicio del episodio reingresado para revisión. Reingresos contradictorios o futuros no se resuelven con `Max` automático; TH/Jurídico determina continuidad y derechos previos.
3. Sin ruptura acreditada, mostrar por separado ingreso de ficha, contratos e historial aportado. No seleccionar `Min` ni la fecha de hoy como sustituto; TH certifica fecha y fundamento, incluso si las fuentes coinciden.
4. Cambios de cargo/dedicación/régimen no destruyen el episodio ni el saldo previo; su efecto sobre antigüedad requiere fuente. Contratos simultáneos no duplican devengo automáticamente.
5. El cargo del acta debe corresponder al vínculo y vigencia seleccionados, con confirmación de TH. La prioridad legado completo > medio > fecha > identificador solo es referencia; si hay varios cargos candidatos, se exige selección justificada, sin desempate silencioso.

## Corte histórico sin invención

TH documenta la cobertura disponible y sus límites: registra qué fuentes existen y qué intervalos faltan. Sin saldo certificado, se mantiene «saldo desconocido / pendiente de levantamiento histórico» y el Modo A de spec-0024 si se cumplen sus demás requisitos.

La apertura de Modo B requiere un corte expresamente certificado (incluido un saldo cero si está respaldado), con días disponibles por período y bolsa o una asignación certificada que permita imputarlos. Un total sin desglose no habilita FIFO entre períodos. Se distingue qué movimientos están incluidos en el corte y cuáles se registraron después, evitando doble conteo. Debe fijarse la fecha a partir de la cual empieza el registro completo.

Una persona ingresada nativamente solo puede iniciar con saldo cero certificado si TH acredita que es un vínculo nuevo sin continuidad ni días pendientes transferidos, régimen confirmado y registro completo desde el inicio. La fecha de alta informática no acredita esas condiciones.

Los eventos registrados en Modo A durante un levantamiento no se vuelven a descontar al activar Modo B si el corte ya los incluye. Las correcciones de certificación conservan la anterior, motivo, autor y efectos pendientes sobre períodos/actas; no reescriben PDFs ni reconstruyen goce desconocido.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-VAC-VIN-001 | Dada una persona con relaciones en varias instituciones, cuando TH registra contratos/episodios, el sistema conserva referencias y fechas independientes y rechaza asociaciones entre ámbitos. | Obligatorio | #184, ADR-0004/0038 |
| RF-VAC-VIN-002 | Dadas fechas de ficha y contrato distintas o ausentes, cuando TH consulta el vínculo, el sistema muestra cada valor/fuente y su inconsistencia; no asigna fecha efectiva sin certificación. | Obligatorio | #184 |
| RF-VAC-VIN-003 | Dada una certificación autorizada con respaldo, cuando TH confirma fecha y continuidad, el sistema registra fuente, actor, fecha, motivo y versión; una carga de nómina no la sustituye. | Obligatorio | #184 |
| RF-VAC-VIN-004 | Dados contratos múltiples y posible reingreso, cuando se revisa antigüedad/cargo, el sistema pide resolución del episodio y selección respaldada ante ambigüedad; no duplica derecho ni reinicia por un simple cambio. | Obligatorio | #184 |
| RF-VAC-VIN-005 | Dada historia sin cobertura certificada, cuando se solicita saldo, el sistema conserva desconocido, prohíbe reconstrucción por antigüedad y permite solo el alcance de Modo A aprobado. | Obligatorio | #182, #184/185 |
| RF-VAC-VIN-006 | Dado un corte con desglose y respaldo, cuando se habilita saldo, el sistema registra cobertura e inclusión de eventos y rechaza duplicados; un total ambiguo no habilita FIFO. | Obligatorio | #184/185 |
| RF-VAC-VIN-007 | Dada una certificación usada por un acta emitida, cuando se corrige, el sistema conserva la versión anterior, audita el cambio y señala documentos afectados sin sobrescribirlos. | Obligatorio | #184/186 |
| RF-VAC-VIN-008 | Dado un actor sin facultad de certificación en la institución, cuando intenta certificar fecha o corte, el sistema lo deniega sin cambios ni acceso al respaldo ajeno. | Obligatorio | #183/184 |

## Escenarios del proceso

Datos exclusivamente ficticios: Persona Trabajadora Ejemplo, `9999999999`, instituciones Ejemplo A/B; fechas y cantidades son fixtures de aceptación, sin regla legal implícita.

### ESC-VAC-VIN-01 — Diferencia de fechas (RF-VAC-VIN-002, RF-VAC-VIN-003)

**Actor:** TH de A. **Dado** ingreso de ficha `2020-04-01` y contrato `2020-05-01`, **cuando** abre la revisión, **entonces** ve ambas fechas y «Fecha efectiva pendiente de certificación». Tras aportar respaldo y certificar una fecha motivada, se registra la resolución. **Error:** sin respaldo no se acepta la certificación, aunque la ficha tenga fecha más antigua.

### ESC-VAC-VIN-02 — Reingreso y continuidad (RF-VAC-VIN-004)

**Dado** un episodio cerrado ficticio y un contrato de reingreso `2025-08-01`, **cuando** TH acredita ruptura, **entonces** puede certificar el nuevo episodio conservando el anterior. **Variante:** una renovación sin ruptura mantiene la continuidad acreditada. **Error:** dos reingresos incompatibles se presentan como conflicto, sin escoger el más reciente en silencio.

### ESC-VAC-VIN-03 — Múltiples contratos y cargo (RF-VAC-VIN-001, RF-VAC-VIN-004)

**Dado** dos contratos simultáneos en A con cargos distintos y un registro en B, **cuando** prepara el acta de A, **entonces** TH resuelve el vínculo/cargo de A con respaldo y no agrega el devengo de B ni duplica el de A. **Error:** contrato cuyo fin precede a inicio se rechaza; el solape requiere clasificación, no eliminación automática.

### ESC-VAC-VIN-04 — Antigüedad sin historia (RF-VAC-VIN-005)

**Dado** un ingreso certificado `2010-01-01` sin consumos ni corte certificado, **cuando** se consulta disponibilidad, **entonces** aparece «Saldo no certificado», sin reconstruir créditos desde 2010 ni asignar cero. El acta podrá seguir Modo A solo tras sus validaciones. **Variante:** sin fecha de ingreso, se permite completar fuentes/borrador, pero no generar períodos certificados.

### ESC-VAC-VIN-05 — Corte y registro nativo (RF-VAC-VIN-006)

**Dado** un corte ficticio `2026-10-31` con dos períodos desglosados y lista de eventos incluidos, **cuando** TH lo certifica, **entonces** habilita únicamente la cobertura aprobada. **Errores:** reenviar el mismo corte no duplica el crédito; un saldo total sin asignación a períodos queda pendiente. **Variante:** ingreso reciente nativo solo habilita apertura cero tras acreditar ausencia de continuidad y registro completo; cero no equivale a dato faltante.

### ESC-VAC-VIN-06 — Corrección y autorización (RF-VAC-VIN-007, RF-VAC-VIN-008)

**Dado** una fecha certificada utilizada en un PDF, **cuando** TH autorizado la rectifica con nueva evidencia, **entonces** se conserva el PDF y se solicita revisión de sus efectos; no se recalcula en silencio. **Error:** la persona trabajadora o un admin de B no puede certificar el vínculo de A.

## Datos, seguridad e integraciones

Respaldos contractuales y de IESS son privados, con acceso por facultad/institución, sin conexión a IESS en Entrega 1. Las fuentes históricas no se suben al repositorio. Se auditan cargas, certificaciones, rechazos y rectificaciones. La política de conservación de documentos debe decidirse con Jurídico antes de habilitar cargas definitivas. No cambia el significado actual de `Persona.FechaIngresoInstitucion` ni la exención de capacitaciones que hoy la utiliza.

## Criterios de aceptación

- [ ] RF-VAC-VIN-001/004/008 y ESC-02/03/06: vínculos múltiples, cargo, reingreso y aislamiento revisados por TH.
- [ ] RF-VAC-VIN-002/003/007 y ESC-01/06: fecha certificada independiente, inconsistencia visible y corrección trazable.
- [ ] RF-VAC-VIN-005/006 y ESC-04/05: desconocido distinto de cero, corte sin duplicados y sin historia inventada.
- [ ] Fuentes, responsables y bloqueos confirmados para la versión aprobada o delimitados expresamente como pendientes de activación.

## Puntos que requieren decisión

| ID | Pregunta exacta / dato faltante | Impacto y bloqueo | Quién decide |
|---|---|---|---|
| PD-VIN-01 | ¿Qué contratos/fuentes existen y quién certifica fecha efectiva, continuidad y rupturas por institución? | Sin responsable y evidencia no hay cómputo certificado | TH + Jurídico |
| PD-VIN-02 | ¿Qué prelación jurídica se aplica ante ficha, contrato, IESS y certificación discrepantes? | No escoger mínimo, reingreso más reciente ni fecha actual | Jurídico + TH |
| PD-VIN-03 | ¿Cómo se asigna vínculo/cargo cuando coexisten contratos o regímenes? ¿Comparten antigüedad o derecho? | Bloquea cómputo y emisión en casos ambiguos | TH + Jurídico |
| PD-VIN-04 | ¿Qué cobertura, unidad, período/bolsa, evidencia y autoridad hacen válido el corte? ¿Incluye eventos ya registrados en Modo A? | Bloquea apertura de Modo B y previene doble descuento | TH + Jurídico |
| PD-VIN-05 | ¿Quién rectifica certificaciones, cómo se notifica y qué actas/cálculos deben revisarse? | Bloquea rectificaciones automáticas y tratamiento retroactivo | TH + responsable funcional |
| PD-VIN-06 | ¿Qué conservación y acceso se exige para respaldos laborales? | Bloquea política definitiva de custodia | Jurídico + responsable de datos |
| PD-VIN-07 | ¿Qué opción de ADR-0045 se adopta sin alterar identidad institucional vigente? | Bloquea tareas técnicas dependientes | Quien desarrolla |

## Revisión funcional

**Versión revisada:** 0.1, delimitada a Entrega 1 en Modo A

**Decisión:** Aprobada para planificación documental de Modo A; Modo B diferido

**Aprobó:** RR. HH. y Jurídico según confirmación del solicitante; continuidad y cierre documental autorizados por el solicitante

**Fecha y evidencia de aprobación:** Comunicación del solicitante del 2026-11-10; [registro sin datos personales](../../evidencia/issue-182/aprobacion.md). Fecha de firma física no aportada

**Ajustes solicitados:** Planificar Modo A; mantener Modo B diferido y bloqueos institucionales sin valores inferidos

Solo una aprobación explícita de esta versión habilita `plan.md`, `tasks.md` y `test-e2e.md`; certificar fecha no certifica saldo ni cierra decisiones jurídicas pendientes.
