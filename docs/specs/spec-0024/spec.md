# Vacaciones: períodos, calendario y saldos — Spec

**ID:** spec-0024 / #185; coordinación #182; activación E0 #189

**Versión:** 0.2

**Estado:** Aprobada v0.2 para Entrega 1 — Modo A (puertas E0 y ADR-0045 resueltas en #189)

**Revisión funcional:** RR. HH. y Jurídico, según declaración del solicitante; decisiones E0 confirmadas por @bryancito1090 en #189

**Fecha:** 2026-11-10

**Áreas afectadas:** Documentación; futura aplicación en `src/Backend` y `src/Frontend`

## Aprobación y alcance de Entrega 1

La aprobación funcional inicial (v0.1) fue comunicada por el solicitante el 2026-11-10 ([registro de aprobación](../../evidencia/issue-182/aprobacion.md)). En [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) ([evidencia E0](../../evidencia/issue-189/README.md)) quien desarrolla (@bryancito1090) cerró [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) y [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) como **Vigentes** para Modo A, confirmó la certificación de períodos/días/retorno, los estados que bloquean solapes y el tratamiento de vínculos concurrentes, y congeló los contratos de [plan.md](plan.md).

El alcance aprobado es **Modo A: acta imprimible y estado de verificación física, sin cálculo ni afirmación de saldo legal certificado**. El Modo B, FIFO, devengo, anticipos, incentivos y caducidad se conservan como referencias diferidas (`T-SAL-D01`), sin tareas de implementación en Entrega 1. Esta versión 0.2 resuelve `T-SAL-00` y deja listas para ejecución secuencial las tareas `T-SAL-01` y `T-SAL-02` en [#192](https://github.com/IstpetDev/actualizacion_datos/issues/192).

## Problema y resultado esperado

Un acta necesita indicar qué vacaciones se otorgan, su período de imputación, salida, fin y retorno. El sistema no debe afirmar un saldo legal a partir de años de antigüedad sin historia certificada. TH debe poder distinguir registro documental de cálculo de disponibilidad, y explicar cada día imputado cuando exista cobertura certificada.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato y estado |
|---|---|---|
| Solicitud | [#185](https://github.com/IstpetDev/actualizacion_datos/issues/185), [#182](https://github.com/IstpetDev/actualizacion_datos/issues/182) | Contemplar períodos, corte, solapes y acta sin afirmar derechos no verificables. |
| Marco | [spec-0022](../spec-0022/spec.md) | Catálogo de parámetros por confirmar; CT arts. 69–78 y LOSEP art. 29 revisados el 2026-11-09 en copias con última reforma declarada 2023-05-12, sin vigencia actual acreditada. LOEI pendiente de consulta por fallo de acceso; no hay valores legales confirmados para vínculos del producto. |
| Historia | [spec-0023](../spec-0023/spec.md) | Fecha y corte certificados independientemente; cobertura/desglose y prevención de doble conteo. Versión 0.2 aprobada para Modo A con puertas E0 resueltas en #189. |
| ADR-0004 — Vigente | [Multitenencia](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) | Ningún saldo, calendario o período atraviesa la institución del vínculo. |
| ADR-0044 / ADR-0045 — Vigentes | [Reglas](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md), [corte](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) | Opción 1 adoptada en #189 para Modo A documental (`PeriodoVacacional` y `EventoVacacional` sin ledger ni saldos en Entrega 1). |
| Legado | [Evidencia #182](../../evidencia/issue-182/README.md) | Bolsas base/incentivo, FIFO, tramos, anticipos y empalmes describen comportamiento técnico previo; no acreditan reglas válidas aquí. El ledger previo permite modificaciones/borrados: su inmutabilidad no está probada. |

## Alcance

**Incluye:** períodos de devengo y disfrute, modos A/B, registro de días/calendario, validación de fechas, disponibilidad certificada, programación/aprobación y correcciones de vacaciones individuales según facultades que se aprueben.

**Excluye:** permisos, licencias, otras ausencias, recuperación de feriados, cierres colectivos automáticos, nómina, remuneración y liquidación; no importar descuentos por permisos ni bonificaciones de septiembre del legado. Incentivos, caducidad y anticipos son puntos de decisión, sin automatismos habilitados por este documento.

**Límites:** registrar/consultar vacaciones y, si procede, sus efectos cuantificados. La emisión/verificación documental no prueba goce efectivo ni autoriza descuento por sí sola.

## Modelo conceptual y períodos

| Concepto | Significado funcional |
|---|---|
| Período de devengo | Intervalo identificado por vínculo/episodio, régimen y versión de regla. Ancla certificada y límites explícitos; etiqueta `YYYY-YYYY` descriptiva, nunca clave suficiente entre instituciones o episodios. |
| Período de disfrute | Rango de salida a fin del evento; puede atravesar más de un período de devengo y requiere tramos de imputación. |
| Evento vacacional | Vínculo, fechas solicitadas/efectivas, días, calendario/regla aplicada, autorización y estado operativo por decidir. No comparte estados con el PDF. |
| Cobertura de saldo | Fecha de corte y períodos/bolsas certificados; eventos incluidos y posteriores, según spec-0023. |
| Bolsa | Derecho base o incentivo con fuente, período, disponibilidad y eventual caducidad aprobada. No inferir incentivos ausentes. |
| Movimiento / tramo | Crédito/débito, fecha de efecto, cantidad/unidad, período/bolsa, evento/origen, subrango de fechas y responsable. La representación técnica e inmutabilidad requieren ADR-0045. |
| Consulta de saldo | Proyección de movimientos dentro de cobertura, fecha de cálculo y procedencia; distingue disponible, reservado y consumido si se aprueba reserva. |

Para un régimen de aniversario confirmado, los límites conceptuales son `[fecha_ancla + N años, fecha_ancla + (N+1) años)`, sin superposición; ingreso del 29 de febrero espera regla aprobada. Para ciclo institucional confirmado, se usan inicio/fin sustentados y su relación con ingreso/reingreso, sin forzar aniversario. Cambiar régimen o ancla exige resolución y trazabilidad; no recalcula PDFs previos.

Un período puede identificarse en Modo A sin generar un crédito ni inferir goce histórico. Si no existen fecha/ancla certificada o período manual certificado por TH, solo se prepara borrador: no se emite un acta con período inventado.

## Modos de operación

| Condición / resultado | Modo A — Solo Acta y Estado | Modo B — Saldo Certificado / Kardex |
|---|---|---|
| Historia | Falta cobertura suficiente de saldo | Corte certificado desglosado por período/bolsa o apertura nativa certificada con registro completo |
| Requisitos comunes | Vínculo y período verificados, facultad de otorgamiento, base legal y plantilla aprobadas, fechas y días respaldados | Los mismos, más régimen/reglas confirmados y decisiones contables resueltas |
| Días del evento | Declarados/certificados expresamente por TH o calculados con regla confirmada; se indica procedencia. Una cantidad manual no simula saldo disponible | Calculados con versión de regla aprobada, dentro de cobertura |
| Pantalla y PDF | «Saldo no certificado / pendiente de levantamiento histórico»; muestra período, evento y días otorgados sin saldo remanente numérico | Saldo con corte, fuente, fecha y desglose; se identifica si es proyección/reserva o consumo real |
| Movimientos | Registro documental, sin crear créditos históricos ni descontar de un saldo ficticio | Imputación por período/bolsa con autorizaciones y momento de efecto aprobados |
| Cambio de modo | Requiere corte e inclusión explícita de eventos ya registrados | Correcciones mantienen trazabilidad; no reabren historia desconocida |

Modo A no resuelve un régimen desconocido ni permite emitir documentos jurídicamente incompletos. Si faltan condiciones comunes, se informa el bloqueo y se conserva borrador. Modo B se habilita solo para cobertura certificada: un período nuevo no vuelve exactos los períodos antiguos desconocidos.

## Días, feriados, empalme y retorno

Las fechas del evento se expresan como fechas civiles de la institución, con inicio/fin inclusivos. `DiasCalendario` representa la longitud del rango efectivo. `DiasEfectivos` es el resultado de la regla confirmada de conteo; no se fija que siempre reste feriados ni que todo feriado sea excluible. El sistema conserva rango solicitado, rango efectivo, días incluidos/excluidos con motivo, fuente/versión de calendario y regla de retorno. Un feriado repetido o coincidente con un día no laborable no puede descontarse dos veces.

Si la regla institucional confirmada contempla empalme al terminar viernes, la vista previa muestra la ampliación y sus efectos sobre días/solapes/retorno y exige confirmación antes de emitir. No existe empalme por defecto ni adición automática del fin de semana anterior por comenzar lunes. Cupos, jornadas, fraccionamiento y calendario local no heredan los valores del legado. Sin regla de retorno aprobada, TH debe certificar la fecha de retorno y su fundamento; no se impone `FechaFin + 1` como universal.

Un cambio de calendario posterior obliga a revisión de eventos afectados; el PDF emitido conserva la regla y los días congelados. Correcciones usan el ciclo de spec-0025.

## FIFO, doble bolsa y efectos

Solo en Modo B y tras confirmar el orden de consumo, se considera la siguiente regla funcional propuesta: consumir del período certificado más antiguo con saldo disponible y, dentro de él, base antes de incentivo. Requiere aprobación de TH/Jurídico; no reemplaza otra prelación legal. Cada tramo identifica días reales imputados y cantidad, sin inferir que días calendario y unidades contables son equivalentes cuando hay exclusiones o fracciones.

Ejemplo **aritmético ficticio**, no acreditación anual: un corte respalda 4 días base de `2024-2025` y 8 de `2025-2026`; un evento autorizado de 10 días efectivos consume 4 y 6 y deja 2, si esa prelación está aprobada. Si en la primera bolsa hubiera además 2 días de incentivo vigente, el mismo orden consumiría 4 base + 2 incentivo del período antiguo + 4 base del siguiente, antes de llegar a cualquier bolsa posterior.

La suma de tramos debe ser igual al débito autorizado y no se pueden imputar unidades dos veces. Días excluidos se muestran, pero no generan consumo si la regla los excluye. Los metadatos `[TRAMO]`, `[FUENTE]` y `[ANTICIPO_BASE]` del legado sirven para entender procedencia, sin imponer etiquetas en texto libre al nuevo modelo.

Sin saldo suficiente, se informa insuficiencia y se bloquea el efecto contable; no se abre automáticamente otra bolsa ni se pasa a Modo A para eludir el control. Si se aprueban anticipos, requerirán fuente, límite, autorización y período de origen/destino explícitos. Incentivos/caducidad solo se activan con fuente institucional vigente y trazabilidad, sin descontar derecho base por caducidad de una bolsa distinta.

**Decisión pendiente imprescindible:** TH debe fijar cuándo un evento queda otorgado, qué rangos reservan disponibilidad y cuándo nace el consumo (emisión, autorización separada, inicio u otro hito). Ningún estado `FIRMA_FISICA_VERIFICADA` causa débito por inferencia. Mientras no se apruebe esta decisión no se activa Modo B. El efecto aprobado debe ser único incluso ante reintentos/concurrencia; correcciones/anulaciones preservan el origen y aplican solo el efecto autorizado, sin borrar historia.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-VAC-SAL-001 | Dada un ancla/regla de período confirmada, cuando se identifica devengo, el sistema conserva límites, vínculo, institución y versión, separados del rango de disfrute. | Obligatorio | #184/185 |
| RF-VAC-SAL-002 | Dada historia incompleta, cuando se consulta o imprime en Modo A, el sistema muestra saldo no certificado sin cifra restante y no crea créditos por años transcurridos. | Obligatorio | #182/185 |
| RF-VAC-SAL-003 | Dada cobertura certificada, cuando se solicita Modo B, el sistema comprueba corte desglosado, régimen y decisiones habilitantes; rechaza historia no cubierta o dobles aperturas. | Obligatorio | #184/185 |
| RF-VAC-SAL-004 | Dada una regla/calendario aprobados, cuando se calculan días, el sistema explica conteo, exclusiones, empalme y retorno, sin valores implícitos del legado. | Obligatorio | #183/185 |
| RF-VAC-SAL-005 | Dadas vacaciones activas del mismo vínculo, cuando se propone un rango efectivo superpuesto, el sistema bloquea la confirmación; ante dos confirmaciones concurrentes solo una puede reservar/afectar las mismas unidades. | Obligatorio | #185; estados que reservan pendientes |
| RF-VAC-SAL-006 | Dado Modo B y orden aprobado, cuando un evento cruza bolsas/períodos, el sistema desglosa FIFO por fuente/tramo, conserva suma de días y rechaza débito sin saldo ni anticipo autorizado. | Obligatorio | #185; prelación por validar |
| RF-VAC-SAL-007 | Dado un evento y el hito contable aprobado, cuando se reintenta su efecto o se verifica su firma, el sistema evita descuentos duplicados y mantiene separados estado documental y consumo. | Obligatorio | #185/186 |
| RF-VAC-SAL-008 | Dado un evento corregido o cancelado, cuando TH autoriza su efecto, el sistema registra motivo, actor y relación con el original, revisa solapes/disponibilidad y conserva PDFs/movimientos históricos. | Obligatorio | #185/186 |
| RF-VAC-SAL-009 | Dado acceso por institución, cuando se consulta calendario, saldos o tramos ajenos, el sistema deniega lectura y escritura sin revelar datos. | Obligatorio | ADR-0004, #182 |

## Escenarios del proceso

Fixtures ficticios: Persona Trabajadora Ejemplo (`9999999999`) e Institución Educativa Ejemplo A/B. Cantidades de ejemplos proceden de cortes ficticios o reglas de prueba expresamente hipotéticas, nunca de una fórmula legal asumida.

### ESC-VAC-SAL-01 — Ingreso reciente y aniversario (RF-VAC-SAL-001, RF-VAC-SAL-003)

**Dado** un vínculo nativo ficticio con inicio `2026-03-10`, apertura certificada y régimen hipotético de aniversario, **cuando** TH consulta `2026-2027`, **entonces** identifica `[2026-03-10, 2027-03-10)` y calcula solo con regla confirmada. **Variantes:** ciclo institucional utiliza su propio ancla; ingreso del 29 de febrero sin regla aprobada bloquea generación. No genera créditos por años previos al vínculo.

### ESC-VAC-SAL-02 — Antigüedad sin corte y dos modos (RF-VAC-SAL-002, RF-VAC-SAL-003)

**Dado** ingreso certificado `2010-01-01`, período de imputación verificado y sin historia completa, **cuando** se prepara acta en Modo A con días respaldados, **entonces** el PDF contiene «Saldo no certificado» y ningún saldo restante numérico. **Error:** pedir Modo B o usar una fórmula por años no elimina el bloqueo. **Variante:** al certificar corte se identifican los eventos A ya incluidos para no descontarlos nuevamente.

### ESC-VAC-SAL-03 — Reingreso y cambio de régimen (RF-VAC-SAL-001, RF-VAC-SAL-003)

**Dado** un reingreso certificado en A y un episodio anterior no cubierto, **cuando** TH identifica el nuevo período, **entonces** el episodio anterior mantiene su estado desconocido; no recibe créditos ni se traslada saldo automáticamente. **Error:** dos regímenes incompatibles simultáneos bloquean cálculo. **Variante:** cambio de dedicación conserva continuidad solo si está certificada.

### ESC-VAC-SAL-04 — Calendario y empalme parametrizados (RF-VAC-SAL-004)

**Dado** un calendario ficticio con un feriado repetido y una regla hipotéticamente aprobada que lo excluye, **cuando** se cuenta un rango, **entonces** se excluye esa fecha una sola vez. **Variante:** un fin viernes solo amplía el rango si se aprobó empalme y TH lo confirma; la ampliación participa en validación de solapes. Inicio lunes no añade días previos. **Error:** regla de retorno ausente exige certificación; nunca presenta una fecha calculada como cierta.

### ESC-VAC-SAL-05 — Dos períodos y bolsas (RF-VAC-SAL-006)

**Dado** el corte ficticio de 4 y 8 días del ejemplo y orden FIFO aprobado, **cuando** se imputa un evento de 10 unidades con fechas efectivas certificadas, **entonces** conserva tramos de 4 y 6 y saldo 2 con procedencia. **Variante:** incentivo de 2 días del período antiguo se consume después de su base y antes del período siguiente. **Errores:** exclusiones no se cobran y un evento de 13 unidades sin anticipo autorizado se bloquea sin débito parcial persistido.

### ESC-VAC-SAL-06 — Solape, concurrencia y reintento (RF-VAC-SAL-005, RF-VAC-SAL-007, RF-VAC-SAL-009)

**Dado** un evento activo del `2026-12-01` al `2026-12-05`, **cuando** se confirma otro del `2026-12-05` al `2026-12-08` para ese vínculo, **entonces** se rechaza por compartir el día 5. **Variantes:** dos confirmaciones concurrentes no sobreconsumen; reintentar el mismo hito no duplica débitos; verificar firma no vuelve a descontar. **Error:** una sesión de B no consulta el saldo de A. El tratamiento de una persona con dos vínculos concurrentes dentro de A queda pendiente de PD-SAL-05.

### ESC-VAC-SAL-07 — Corrección posterior y cobertura (RF-VAC-SAL-007, RF-VAC-SAL-008)

**Dado** un evento con efecto contable ya registrado y PDF emitido, **cuando** TH autoriza una corrección de fechas, **entonces** se revisan saldo/solapes, se conserva el movimiento original con su compensación si procede y se tramita nueva versión de acta. **Error:** anular el PDF no borra un goce ya ejecutado ni devuelve días por sí solo. Un cambio de calendario posterior señala revisión, sin reescribir el PDF.

## Datos, seguridad e integraciones

Se muestran fecha de corte, cobertura y procedencia al lado del saldo; «desconocido», «certificado» y «proyección» tienen significado distinto. Registro y consulta se limitan por institución y facultad. El calendario debe indicar fuente, ámbito nacional/local/institucional y versión. No se integra ni descuenta permisos de otros sistemas. La estrategia técnica de auditoría y consistencia se decidirá en los ADR y planes tras aprobación.

## Criterios de aceptación

- [x] RF-VAC-SAL-001/003 y ESC-01/03: períodos, ingreso reciente y reingreso sin acreditar historia inexistente.
- [x] RF-VAC-SAL-002/003 y ESC-02: Modo A sin saldo numérico y conversión con corte sin doble descuento.
- [x] RF-VAC-SAL-004/005/009 y ESC-04/06: calendario, retorno, permisos y solapes comprobables.
- [x] RF-VAC-SAL-006/007/008 y ESC-05/06/07: conservación de unidades, idempotencia y correcciones, según decisiones aprobadas.

## Puntos que requieren decisión

| ID | Decisión registrada en #189 (E0) / estado por institución | Impacto y bloqueo | Quién decide |
|---|---|---|---|
| PD-SAL-01 | **Resuelto en #189 para Modo A:** En Entrega 1 solo opera Modo A documental. El período de imputación (`YYYY-YYYY`), días calendario/efectivos y fecha de retorno deben ser certificados por un operador de TH con delegación explícita vigente en la institución antes de emitir acta. | Emisión bloqueada si falta certificación explícita o facultad vigente en la institución | Solicitante (`@bryancito1090`) + TH institucional |
| PD-SAL-02 | **Resuelto en #189 para Modo A:** En Modo A los días efectivos, feriados excluidos, empalme de fin de semana y fecha de retorno se registran por certificación de TH vinculada al calendario/regla institucional vigente, sin devengo proporcional ni cálculo automático de saldos; los parámetros automáticos por régimen quedan diferidos a Modo B. | Instituciones sin regla/calendario o certificación no emiten actas; sin cálculo automático en Modo A | TH + Jurídico; matriz [spec-0022](../spec-0022/spec.md) |
| PD-SAL-03 | **Resuelto en #189 para Modo A:** El motor FIFO de doble bolsa, anticipos, incentivos y caducidad quedan diferidos fuera de Entrega 1 (Modo B). En Modo A no se ejecutan imputaciones automáticas ni se crean anticipos implícitos. | Sin imputación contable ni saldos en Entrega 1 | Solicitante (`@bryancito1090`) + TH + Jurídico |
| PD-SAL-04 | **Resuelto en #189 para Modo A:** La máquina operativa de eventos en Modo A (`BORRADOR`, `PENDIENTE`, `APROBADO_TH`, `APROBADO`, `RECHAZADO`, `CANCELADO`) está separada del estado documental del acta PDF ([spec-0025](../spec-0025/spec.md)); toda transición exige delegación explícita por institución (`FacultadVacacional`). | Separación estricta entre estado del evento y estado del PDF | Solicitante (`@bryancito1090`) + TH + responsable funcional |
| PD-SAL-05 | **Resuelto en #189:** Los estados que bloquean solape de rango inclusivo `[FechaInicioEfectiva, FechaFinEfectiva]` en el mismo vínculo son `PENDIENTE`, `APROBADO_TH` y `APROBADO` (y eventos con acta vigente no anulada); `BORRADOR`, `RECHAZADO` y `CANCELADO` no bloquean. Entre vínculos simultáneos de la misma persona en la misma institución también se bloquea el solape salvo clasificación/autorización expresa de TH. | Regla de colisión congelada para implementación en #192 | Solicitante (`@bryancito1090`) + TH + Jurídico |
| PD-SAL-06 | **Resuelto en #189 para Modo A:** Cualquier corrección posterior de fechas o días sobre un evento con acta emitida exige anular la versión anterior con motivo auditado y emitir nueva versión sucesora vinculada, repitiendo validación de solapes; anular el PDF no borra la trazabilidad del evento ni altera registros históricos en silencio. | Trazabilidad inmutable sin ajustes retroactivos silenciosos | Solicitante (`@bryancito1090`) + TH + Jurídico |
| PD-SAL-07 | **Resuelto en #189 para Modo A:** En Entrega 1 la consulta y seguimiento ocurren en la aplicación (bandeja de TH y vista de mis actas de la persona trabajadora) más entrega asistida auditada; no se añaden colas de mensajería externa ni cálculos de nómina/liquidación. | Sin mensajería externa ni pagos en Modo A | Solicitante (`@bryancito1090`) + TH + responsable funcional |
| PD-SAL-08 | **Resuelto en #189:** Se adopta la **Opción 1** de [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) (`Vigente` para Modo A): registro auditable de `PeriodoVacacional` y `EventoVacacional` sin tablas de `Ledger` ni `Saldos` materializados en Entrega 1. | Desbloquea #192 (`T-SAL-01` y `T-SAL-02`) con contratos congelados | Quien desarrolla (`@bryancito1090`) |

## Revisión funcional

**Versión revisada:** 0.2, delimitada a Entrega 1 en Modo A con puertas E0 resueltas en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189)

**Decisión:** Aprobada para planificación e implementación de Modo A; Modo B diferido

**Aprobó:** RR. HH. y Jurídico según confirmación del solicitante; decisiones de activación E0 y ADR-0045 (Opción 1 Modo A) registradas por `@bryancito1090` en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189)

**Fecha y evidencia de aprobación:** Comunicación del solicitante del 2026-11-10 ([aprobacion.md](../../evidencia/issue-182/aprobacion.md)) y resolución de puertas E0 del 2026-11-10 ([evidencia #189](../../evidencia/issue-189/README.md)). Fecha de firma física no aportada

**Ajustes solicitados:** Implementar Modo A con contratos congelados y control de solapes; mantener Modo B diferido y bloqueos institucionales sin saldos ni valores inferidos

Esta versión 0.2 deja congeladas las decisiones de E0 (#189) para `plan.md`, `tasks.md` y `test-e2e.md`. Las instituciones sin configuración/certificación completa conservan su bloqueo operativo.
