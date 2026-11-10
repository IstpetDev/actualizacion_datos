# Vacaciones: acta imprimible y verificación de firma física — Spec

**ID:** spec-0025 / #186; coordinación #182; puertas E0 resueltas en #189

**Versión:** 0.2

**Estado:** Aprobada v0.2 para implementación de Entrega 1 — Modo A (puertas E0 resueltas en #189)

**Revisión funcional:** RR. HH. y Jurídico, según declaración del solicitante; decisiones de activación E0 y ADR-0046 registradas por `@bryancito1090` en #189

**Fecha:** 2026-11-10

**Áreas afectadas:** Documentación; futura aplicación en `src/Backend` y `src/Frontend`

## Aprobación y alcance de Entrega 1

La aprobación funcional inicial (v0.1) fue comunicada por el solicitante el 2026-11-10: informó que RR. HH. firmó el informe y que Jurídico lo aprobó, y autorizó continuar hasta cerrar #182. En [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) (E0) se registraron las decisiones técnicas ([ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) en estado `Vigente`, Opción 1) y las reglas de firmas requeridas, método de verificación, respaldo/evidencia o referencia física/excepción autorizada, numeración anual correlativa por institución, retención histórica permanente y recuperación consistente entre PostgreSQL y `IAlmacenArchivos` para el alcance Modo A. Véanse [registro de aprobación](../../evidencia/issue-182/aprobacion.md) y [evidencia de decisiones #189](../../evidencia/issue-189/README.md).

El alcance aprobado es **Modo A: acta imprimible y estado de verificación física, sin cálculo ni afirmación de saldo legal certificado**. El Modo B, FIFO, devengo, anticipos, incentivos y caducidad se conservan como referencias diferidas, sin tareas de implementación en Entrega 1. Las instituciones con datos pendientes (`PENDIENTE_CONFIRMACION`) permanecen sin habilitar para emisión oficial; no se infieren textos normativos, delegaciones ni firmas.

Esta versión 0.2 con puertas E0 resueltas en #189 congela los contratos propuestos en `plan.md` v1.0 y habilita la ejecución de las tareas de implementación (#193, #194 y #195).

## Problema y resultado esperado

TH prepara un acta, la persona trabajadora descarga un PDF imprimible y firma fuera del sistema. Después, una persona facultada registra haber verificado las firmas físicas exigidas, con responsable, fecha, método y respaldo. Se debe poder reimprimir y corregir sin perder la versión que las partes pudieron firmar.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato y estado |
|---|---|---|
| Solicitud | [#186](https://github.com/IstpetDev/actualizacion_datos/issues/186), [#182](https://github.com/IstpetDev/actualizacion_datos/issues/182) | PDF imprimible, firma física verificable, versiones y privacidad; contenido exacto pendiente de aprobación funcional/jurídica. |
| Marco, vínculos y saldo | [spec-0022](../spec-0022/spec.md), [spec-0023](../spec-0023/spec.md), [spec-0024](../spec-0024/spec.md) | Versiones 0.2 aprobadas para Modo A con puertas E0 resueltas en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189): ámbito, certificaciones y modos A/B. Vigencia/aplicabilidad y cláusulas se registran por institución antes de activar (`PENDIENTE_CONFIRMACION` por defecto). |
| ADR-0004 — Vigente | [Multitenencia](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) | Documentos/evidencias aislados por institución. |
| ADR-0006 — Vigente | [Almacenamiento](../../decisiones/ADR-0006-almacenamiento-de-archivos.md) | Archivos privados y acceso por backend. ADR-0046 registra excepción explícita para no eliminar versiones históricas ni evidencias de actas de vacaciones. |
| ADR-0033 — Vigente | [Motor PDF](../../decisiones/ADR-0033-motor-generacion-pdf.md) | Se reutiliza `QuestPDF` con diseño desacoplado detrás de `IServicioGeneracionPdfActaVacaciones` según ADR-0046. |
| ADR-0046 — Vigente | [PDF y verificación](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) | Opción 1 aprobada en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189): versión inmutable, hash SHA-256, `QuestPDF` + `IAlmacenArchivos` privado y excepción de retención a ADR-0006/ADR-0039. |
| Estructura del legado | [Evidencia #182](../../evidencia/issue-182/README.md), [Evidencia #189](../../evidencia/issue-189/README.md) | Acta DOCX y composición como referencia; no se copió fotografía, plantilla con datos ni firmas reales. |

## Alcance

**Incluye:** borrador/previsualización, emisión de PDF, acceso propio o delegado, entrega/impresión, recepción de respaldo, observación y verificación física, consulta, reimpresión, corrección/anulación y versiones enlazadas.

**Excluye:** firma electrónica, certificación pericial/biométrica, edición de PDF emitido, firma dibujada en pantalla, permisos, licencias, otras ausencias, recuperación de feriados, nómina y prueba automática de goce efectivo.

**Límites:** la firma ocurre fuera del sistema. El sistema registra una declaración administrativa del verificador respecto de una versión concreta; ni un booleano ni un escaneo por sí solos demuestran firma válida o recepción física.

## Actores y permisos propuestos para validación

| Actor funcional | Acciones | Restricciones |
|---|---|---|
| Preparador autorizado de TH | Seleccionar vínculo/período, preparar y previsualizar; emitir si tiene facultad expresa | Solo institución asignada; fuentes verificadas; sin certificar su propia delegación |
| Persona trabajadora | Consultar estado y descargar/reimprimir sus actas emitidas | Sin acceso a otras personas ni permiso de verificar su propia firma; acceso al respaldo según política aprobada |
| Operador de entrega autorizado | Descargar/imprimir y registrar entrega para quien no tenga acceso digital | Delegación por institución y acta; entrega/descarga no verifican firma |
| Verificador autorizado | Inspeccionar firmas exigidas, identificar versión, registrar verificación/observación y evidencia | Debe existir designación y método aprobados; separación de funciones y conflicto de interés por decidir |
| Admin institucional | Consulta y operaciones que se le deleguen expresamente | No es verificador por tener rol admin; toda actuación conserva identidad y ámbito |
| Superadmin | Configuración permitida por marco | No sustituye al firmante ni verifica por su rol global; acceso operativo sujeto a facultad/ámbito auditado |

La correspondencia con roles técnicos `usuario`, `supervisor`, `admin`, `superadmin` queda en PD-MAR-04/PD-ACT-01. Sin designaciones no se habilitan operaciones privilegiadas.

## Modelo conceptual y contenido del PDF

`ActaVacaciones` identifica institución, persona/vínculo, evento y período(s); contiene versiones vinculadas. `VersionActa` conserva número, versión, estado, instantánea de datos, plantilla/base legal y regla/calendario aplicados, fecha/actor de emisión, referencia privada del PDF y hash SHA-256 de sus bytes. `VerificacionFisica` y `EventoAuditoria` referencian esa versión, nunca solo la persona. `Evidencia` puede ser archivo privado o referencia de custodia física según decisión aprobada.

El hash permite detectar cambios en el archivo; no es firma electrónica ni acredita autoría de una firma manuscrita. El contenido personal congelado no se actualiza al editar posteriormente la ficha. El PDF tampoco se regenera al descargarlo.

| Sección | Campos / comportamiento esperado |
|---|---|
| Encabezado | Institución y membrete autorizado ficticio en ejemplos, código documental, número/versión visibles y título «ACTA DE ENTREGA - RECEPCIÓN DE GOCE DE VACACIONES». No incrustar foto ni firmas reales del material de referencia. |
| Comparecencia | Lugar y fecha de emisión; gramática para primer día/otros días; nombre/cargo del representante autorizado y persona trabajadora (apellidos primero), documento y cargo del vínculo seleccionado. |
| Detalle | Período de imputación con límites, inicio/fin solicitados y efectivos cuando difieran, días calendario/efectivos y procedencia, retorno conforme regla/certificación, modo de saldo y base legal confirmada. |
| Tabla A: vacaciones | Filas numeradas de eventos/tramos cubiertos: salida, fin, retorno y días. En Modo A, identifica registro conocido sin simular historia completa y declara «Saldo no certificado / pendiente de levantamiento histórico». Solo en B incluye días certificados/disponibilidad y saldo, con corte, cobertura y fecha de cálculo; diferencia proyección/reserva de consumo ejecutado. |
| Tabla B: incentivos | Solo si existe fuente, cobertura y política aprobadas: otorgados, tomados/caducados y saldo de esa bolsa. En ausencia de respaldo se omite, sin rellenar cero ni reconstruir bonificaciones. |
| Cláusulas | Texto y base legal aprobados para institución/vínculo; aceptación de las partes. Si un anticipo está aprobado y registrado, nota con cantidad, origen/destino y fundamento; nunca se introduce por falta de saldo en silencio. |
| Firmas físicas | Doble columna: izquierda representante institucional, cargo, identificación e institución; derecha persona trabajadora, apellidos/nombres, cargo e identificación. Líneas en blanco, sin imágenes de firmas. |
| Identificación de versión | Número, versión y fecha suficientes para relacionar papel/PDF y verificación. La forma de numeración se aprueba antes de emisión; hash conservado en metadatos para control. |

**Ejemplo textual completamente ficticio de composición, no plantilla jurídica aprobada:**

> Institución Educativa Ejemplo S.A. — ACTA DEMO-0001, v1

> En Ciudad Ejemplo, al primer día del mes de diciembre de 2026, comparecen Autoridad Institucional Demo, en calidad de Representante Ejemplo, y Ejemplo Quishpe, María Fernanda, identificación 9999999999, cargo Docente Ejemplo. Se registran vacaciones imputadas al período certificado 2026-2027, del 01 al 03 de diciembre de 2026. Días efectivos y retorno: según certificación de TH adjunta al borrador de ejemplo; pendientes de validación para emitir.

> Saldo no certificado / pendiente de levantamiento histórico. Este registro no certifica un saldo legal remanente.

> Base legal: pendiente de texto aprobado para el vínculo; el borrador no puede emitirse en este estado.

> Firma física de la institución: ____________________

> Firma física de la persona trabajadora: ____________________

No se inventa un número de documento para una autoridad real ni se copia una firma. Los ejemplos numéricos del acta se completarán con fixtures certificados ficticios al aprobar contenido y modos. Campos obligatorios ausentes impiden emisión; la vista previa debe identificarse inequívocamente como borrador sin validez de emisión.

## Máquina de estados documental propuesta

Se usa un vocabulario único: `EMITIDA_PDF` equivale al nombre abreviado `EMITIDA` del contexto recibido; `FIRMA_FISICA_VERIFICADA` equivale a `FIRMA_VERIFICADA`. No son estados de aprobación de vacaciones ni de la campaña de actualización.

| Origen | Acción y condición | Destino / resultado |
|---|---|---|
| BORRADOR | Preparar/previsualizar con facultad | BORRADOR editable, sin PDF oficial |
| BORRADOR | Emitir con datos y autorizaciones completas y regla de modo A/B satisfecha | EMITIDA_PDF; número/versión, datos y archivo congelados |
| EMITIDA_PDF | Descargar, imprimir o registrar entrega | EMITIDA_PDF; mismos bytes/versión, evento de acceso auditado |
| EMITIDA_PDF | Revisar versión y todas las firmas exigidas con método/respaldo aprobados | FIRMA_FISICA_VERIFICADA; declaración de verificación persistida |
| EMITIDA_PDF | Detectar firma faltante, versión distinta o evidencia insuficiente | OBSERVADA; motivo y responsable, sin indicador de verificación vigente |
| OBSERVADA | Subsanar únicamente evidencia/firma sobre la misma versión y verificar | FIRMA_FISICA_VERIFICADA, conservando observaciones y subsanación |
| FIRMA_FISICA_VERIFICADA | Reportar pérdida/invalidez del respaldo o error de verificación | OBSERVADA; se conserva la verificación anterior y se registra por qué dejó de ser vigente |
| EMITIDA_PDF / OBSERVADA / FIRMA_FISICA_VERIFICADA | Anular con facultad y motivo; corregir contenido exige una versión sucesora | ANULADA; contenido/PDF anteriores intactos |
| ANULADA | Consultar historia con facultad | ANULADA; sin reactivación ni edición. Puede enlazarse a sucesora en borrador/emitida |

Una observación no permite editar contenido emitido. Si el error está en datos/fechas, se tramita anulación y versión siguiente. `SUSTITUIDA` se representa mediante motivo y enlace a sucesora de una versión ANULADA, sin un segundo nombre ambiguo de estado. El encadenamiento debe indicar si aún no existe sucesora emitida; un borrador sucesor no se muestra como PDF activo.

`firma_verificada = true` es un dato derivado exclusivamente de estado actual `FIRMA_FISICA_VERIFICADA`, con verificación vigente de esa versión. Una versión anulada/observada conserva hechos históricos y muestra «verificada anteriormente» si corresponde, pero no figura firmada vigente. No hay transición «firmada» por descargar, adjuntar, aprobar vacaciones ni marcar una casilla sin verificación registrada.

## Verificación y evidencia

El verificador identifica versión impresa/número, comprueba que corresponda al contenido emitido y revisa las firmas requeridas de las partes. Registra identidad/cargo del verificador, fecha/hora del registro, fecha declarada de inspección si fue otra, método, resultado, observaciones y respaldo. El reloj de auditoría no se retrodata aunque la inspección física sea anterior.

TH/Jurídico debe escoger si es obligatorio un escaneo/foto custodiado privadamente, si basta referencia identificable al archivo físico o si se admiten excepciones motivadas. Hasta esa decisión, no se habilita verificación definitiva. Aun cuando el archivo digital sea opcional, no se permite una verificación sin método y rastro de custodia: exige referencia física o excepción expresamente autorizada. Adjuntar imagen no verifica automáticamente autenticidad ni presencia de todas las firmas.

Una pérdida de respaldo o un papel que pertenece a v1 cuando la activa es v2 produce observación; nunca se traslada verificación de una versión a otra. La verificación anterior permanece en historia. La persona trabajadora conoce el estado y motivo operativo conforme política de privacidad, sin obtener evidencia privada de otras personas.

## Reimpresión, corrección y auditoría

- **Reimpresión:** sirve los bytes persistidos de la misma versión y registra actor/fecha/resultado. Cambiar una marca dentro del PDF cambiaría su hash; las advertencias de anulación se muestran en consulta/descarga, sin reescribir el archivo. Descarga histórica de anuladas restringida a facultad de archivo por definir.
- **Corrección en borrador:** permite editar y volver a validar; no consume número oficial ni acredita firma.
- **Corrección tras emitir:** motivo, anulación auditada y sucesora v2 vinculada; validaciones de vínculo, saldo y solapes se repiten. Nueva versión siempre requiere nueva firma/verificación. No hay dos versiones activas del mismo acta.
- **Anulación:** conserva actor, motivo, instante y versión afectada. Sus efectos sobre vacaciones/reservas/movimientos se resuelven separadamente conforme PD-SAL-04/06; no equivale a devolver días automáticamente.
- **Errores y concurrencia:** si falla guardar el PDF o el registro, no se publica un acta emitida sin archivo íntegro; si se reintenta, no crea otra versión/número sin relación. Si dos operadores actúan sobre la misma versión, solo se admite la transición coherente con el estado vigente y el resto recibe conflicto.
- **Auditoría:** conserva preparación, cambios de borrador, emisión, descargas/entregas, recepción de respaldo, observación, verificación, pérdida de evidencia, anulación y vínculo sucesor. Cada evento incluye institución, actor, instante, versión, acción, resultado, motivo y correlación; sin edición/borrado de hechos previos. No volcar binarios o datos personales completos a logs técnicos.

La retención legal, eliminación excepcional, copia/restauración de PDF/evidencias y acceso histórico requieren política explícita. La conservación de actas sustituidas necesita resolver ADR-0046; no se cambia ADR-0006 por iniciativa del agente.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-VAC-ACT-001 | Dado preparador facultado y vínculo/período verificados, cuando completa borrador, el sistema previsualiza contenido obligatorio y bloquea emisión si faltan facultad, fuente, cláusula, días o retorno respaldados. | Obligatorio | #182/186 |
| RF-VAC-ACT-002 | Dada emisión válida, cuando termina, el sistema conserva instantánea, número/versión, fecha/actor y PDF con hash; descargas posteriores entregan idénticos bytes. | Obligatorio | #186 |
| RF-VAC-ACT-003 | Dada una acta propia emitida, cuando la persona trabajadora descarga/imprime, el sistema entrega el PDF privado y mantiene firma pendiente; el operador delegado deja rastro de entrega. | Obligatorio | #182/186 |
| RF-VAC-ACT-004 | Dada una versión emitida/observada, cuando verifica una persona designada, el sistema exige revisión física registrada, método y evidencia/referencia/excepción permitida; solo entonces refleja firma verificada vigente. | Obligatorio | #182/186 |
| RF-VAC-ACT-005 | Dada firma faltante, versión incorrecta o evidencia perdida/inválida, cuando se revisa, el sistema observa con motivo y conserva historia, sin trasladar verificación a otra versión. | Obligatorio | #186 |
| RF-VAC-ACT-006 | Dado contenido emitido incorrecto, cuando se corrige, el sistema anula con motivo y crea sucesora enlazada; conserva PDF previo y exige nueva verificación. | Obligatorio | #186 |
| RF-VAC-ACT-007 | Dada consulta en Modo A, cuando genera PDF, el sistema omite saldo numérico legal; en B identifica corte/cobertura y distingue saldo de proyección/reserva. | Obligatorio | #182/185/186 |
| RF-VAC-ACT-008 | Dado intento de acceso/transición, cuando el actor carece de facultad o pertenece a otra institución/persona, el sistema deniega sin exponer PDF/evidencia ni cambiar estado. | Obligatorio | ADR-0004, #186 |
| RF-VAC-ACT-009 | Dado reintento, transición concurrente o fallo de persistencia, cuando se emite/verifica/anula, el sistema evita duplicados, estados imposibles y PDF publicado sin registro íntegro, conservando auditoría. | Obligatorio | #186 |
| RF-VAC-ACT-010 | Dado un evento documental, cuando cambia su estado o se descarga, el sistema registra actor, institución, versión, fecha, resultado y motivo aplicable, sin eliminar historia previa. | Obligatorio | #186 |

## Escenarios del proceso

Actores/datos inventados: Persona Trabajadora Ejemplo (`9999999999`), Operador TH Demo, Verificador Demo e Institución Educativa Ejemplo A/B. El flujo aprobado que se cita como precondición es hipotético, no aprobación actual.

### ESC-VAC-ACT-01 — Preparación y emisión (RF-VAC-ACT-001, RF-VAC-ACT-002, RF-VAC-ACT-007)

**Dado** TH facultado, vínculo/período certificados, datos obligatorios y plantilla/base legal hipotéticamente aprobados, **cuando** previsualiza y emite DEMO-0001 v1 en Modo A, **entonces** se congela el PDF con «Saldo no certificado», sin saldo numérico ni firma verificada. **Errores:** cargo ambiguo, retorno o base legal pendientes conservan borrador; no se publica PDF oficial. **Variante:** en B tabla de saldo cita el corte y la naturaleza del cálculo.

### ESC-VAC-ACT-02 — Recorrido de persona trabajadora y entrega (RF-VAC-ACT-002, RF-VAC-ACT-003, RF-VAC-ACT-008, RF-VAC-ACT-010)

**Dado** v1 emitida de la persona trabajadora en A, **cuando** entra y la descarga dos veces, **entonces** ambas descargas tienen mismos bytes/hash/versión y firma pendiente; quedan accesos auditados. Firma el papel fuera de la plataforma. **Variante:** sin acceso digital, operador delegado imprime y registra entrega. **Error:** otro trabajador, admin sin delegación o sesión de B no obtiene PDF ni metadatos privados.

### ESC-VAC-ACT-03 — Verificación física y firma faltante (RF-VAC-ACT-004, RF-VAC-ACT-005)

**Dado** verificador designado y método de custodia aprobado, **cuando** revisa v1 con todas las firmas requeridas y registra inspección/respaldo, **entonces** pasa a FIRMA_FISICA_VERIFICADA e informa quién/cuándo/método. **Errores:** falta una firma, archivo sin inspección registrada o referencia inválida producen observación, sin indicador vigente. **Variante:** subsanar firma de la misma v1 permite verificar conservando el motivo anterior.

### ESC-VAC-ACT-04 — Corrección y versión equivocada (RF-VAC-ACT-005, RF-VAC-ACT-006, RF-VAC-ACT-010)

**Dado** v1 emitida o verificada con fecha incorrecta, **cuando** TH corrige con facultad/motivo, **entonces** v1 queda anulada, se conserva y se enlaza a v2 que requiere nueva emisión/firma. **Error:** un papel firmado de v1 presentado como evidencia de v2 no verifica v2. **Variante:** modificación de ficha/cargo o plantilla posterior no cambia bytes de v1.

### ESC-VAC-ACT-05 — Pérdida de respaldo y consulta histórica (RF-VAC-ACT-005, RF-VAC-ACT-008, RF-VAC-ACT-010)

**Dado** v1 verificada y aviso de pérdida/invalidez de la evidencia, **cuando** el verificador registra el incidente, **entonces** pasa a OBSERVADA y la consulta muestra verificación histórica y motivo, sin borrar el registro previo. **Variante:** custodia física validada puede resolver la observación si la política lo permite. **Error:** admin sin facultad no borra historial ni sustituye el respaldo en silencio.

### ESC-VAC-ACT-06 — Concurrencia y recuperación (RF-VAC-ACT-002, RF-VAC-ACT-009)

**Dado** dos operadores sobre la misma versión, **cuando** uno anula mientras otro verifica, **entonces** solo la transición compatible con el estado vigente se acepta; no existe acta anulada y verificada vigente a la vez. **Variantes:** reintentar emisión no duplica número/versión; fallo al persistir PDF conserva estado sin emisión publicada y deja posibilidad de recuperación; volver a descargar no genera un nuevo archivo.

## Datos, seguridad e integraciones

PDF y evidencias permanecen en custodia privada por institución, con autorización en servidor en cada lectura/descarga. No hay URL pública, inclusión en repositorio ni uso de rutas proporcionadas por el cliente. Para archivos adjuntos se respetan límites, tipos y comprobación de contenido de ADR-0006, salvo decisión posterior explícita; escaneo/foto real solo podría existir en la aplicación autorizada, nunca en fixtures o documentación pública. La política de retención/acceso y respaldo se decide antes de implementación dependiente. No se incorporan servicios de firma ni nuevos contratos API en este borrador.

## Criterios de aceptación

- [x] RF-VAC-ACT-001/002/007 y ESC-01: composición, campos y modo sin saldo aprobados, con PDF inmutable por versión.
- [x] RF-VAC-ACT-003/004/008 y ESC-02/03: recorridos de persona trabajadora, TH y administrador con facultades, evidencia y significado de firma revisados.
- [x] RF-VAC-ACT-005/006/010 y ESC-04/05: observación, pérdida, anulación y corrección sin sobrescritura.
- [x] RF-VAC-ACT-009 y ESC-06: política de concurrencia, errores e idempotencia verificable.
- [x] Fuentes, retención, numeración y decisiones de ADR-0046 revisadas; ningún dato/firma real se incorpora al repositorio.

## Puntos que requieren decisión

| ID | Decisión registrada en #189 (E0) / estado por institución | Impacto y bloqueo | Quién decide |
|---|---|---|---|
| PD-ACT-01 | **Resuelto en #189:** Preparar, emitir, entregar, observar, anular, sustituir y verificar requieren delegación explícita vigente por institución (`FacultadVacacional`). Con separación estricta de funciones: nadie verifica su propia firma como persona trabajadora titular del acta, ni se otorgan permisos implícitos por rol global. | Permisos y separación de funciones congelados para #193/#194/#195 | Solicitante (`@bryancito1090`) + Autoridad institucional + TH |
| PD-ACT-02 | **Resuelto en #189:** Se exigen dos firmas manuscritas en físico (representante autorizado de TH/Autoridad institucional y persona trabajadora). La verificación administrativa exige comprobar coincidencia de número/versión impresa con la versión emitida y presencia de ambas firmas; `firma_verificada = true` es un dato derivado exclusivamente de `FIRMA_FISICA_VERIFICADA` vigente y no declara firma electrónica. | Regla de firmas y significado de `firma_verificada` congelados | Solicitante (`@bryancito1090`) + TH + Jurídico |
| PD-ACT-03 | **Resuelto en #189:** Toda verificación exige método registrado y al menos un respaldo trazable según política institucional: (a) escaneo/foto en custodia privada (`PDF`, `JPG`, `PNG` <= 10 MB con validación de firma mágica), (b) referencia física verificable (código de archivo/carpeta/tomo/folio y responsable de custodia), o (c) excepción motivada autorizada con acto/motivo/autorizador. Nunca un booleano sin respaldo. | Política de evidencia y referencia física congelada para #194 | Solicitante (`@bryancito1090`) + TH + Jurídico + responsable de datos |
| PD-ACT-04 | **Resuelto en #189 para Modo A:** La estructura del acta en Modo A congela encabezado institucional, comparecencia, detalle del período/fechas/retorno certificados, Tabla A sin saldo numérico con leyenda obligatoria `«Saldo no certificado / pendiente de levantamiento histórico»`, omisión de Tabla B y nota de anticipo, cláusula configurada por institución/régimen y bloque de doble firma física en blanco. | Emisión bloqueada en instituciones sin plantilla/cláusula activa (`PENDIENTE_CONFIRMACION`) | Solicitante (`@bryancito1090`) + TH + Jurídico |
| PD-ACT-05 | **Resuelto en #189:** Numeración correlativa anual por institución (`ACTA-VAC-{Anio}-{Secuencia:0000}`, con prefijo institucional configurable), asignada únicamente al emitir versión oficial (`v1`, `v2`, ...). Los borradores no consumen número y los números de actas anuladas nunca se reutilizan. | Regla de numeración e idempotencia congelada para #193 | Solicitante (`@bryancito1090`) + TH + responsable documental |
| PD-ACT-06 | **Resuelto en #189:** Se aprueba la máquina de estados documental (`BORRADOR`, `EMITIDA_PDF`, `FIRMA_FISICA_VERIFICADA`, `OBSERVADA`, `ANULADA` con enlace a versión sucesora), la transición a `OBSERVADA` por pérdida/invalidez de respaldo conservando historia y la consulta de estado/motivo en la aplicación para las partes autorizadas. | Máquina de estados y sucesión congeladas para #193 y #194 | Solicitante (`@bryancito1090`) + responsable funcional + TH + Jurídico |
| PD-ACT-07 | **Resuelto en #189:** Retención histórica permanente de todas las versiones emitidas/anuladas y sus evidencias en almacenamiento privado por institución (`vacaciones/{institucionId}/actas/...`), con excepción explícita a la eliminación de sustituidos de ADR-0006/ADR-0039. Acceso de descarga/evidencia restringido por institución y facultad, y recuperación coordinada entre PostgreSQL e `IAlmacenArchivos` verificando hash SHA-256. | Política de retención, custodia y recuperación congelada | Solicitante (`@bryancito1090`) + Jurídico + responsable de datos |
| PD-ACT-08 | **Resuelto en #189:** Se adopta la **Opción 1** de [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) (`Vigente`): entidad `VersionActaVacaciones` inmutable con instantánea y hash SHA-256, motor `QuestPDF` (ADR-0033), custodia privada vía `IAlmacenArchivos` (ADR-0006) con excepción explícita de no borrado histórico y escritura en dos fases/compensada. | Desbloquea #193, #194 y #195 (`T-ACT-01`, `T-ACT-02`, `T-ACT-03`) | Quien desarrolla (`@bryancito1090`) |

## Revisión funcional

**Versión revisada:** 0.2, delimitada a Entrega 1 en Modo A con puertas E0 resueltas en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189)

**Decisión:** Aprobada para planificación e implementación de Modo A; Modo B diferido

**Aprobó:** RR. HH. y Jurídico según confirmación del solicitante; decisiones de activación E0 y ADR-0046 (Opción 1) registradas por `@bryancito1090` en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189)

**Fecha y evidencia de aprobación:** Comunicación del solicitante del 2026-11-10 ([aprobacion.md](../../evidencia/issue-182/aprobacion.md)) y resolución de puertas E0 del 2026-11-10 ([evidencia #189](../../evidencia/issue-189/README.md)). Fecha de firma física no aportada

**Ajustes solicitados:** Implementar Modo A con contratos congelados, versión PDF inmutable y verificación física trazable; mantener Modo B diferido y bloqueos institucionales sin valores ni firmas reales en el repositorio

Esta versión 0.2 deja congeladas las decisiones de E0 (#189) para `plan.md`, `tasks.md` y `test-e2e.md`. Las instituciones sin configuración/plantilla/delegación completa conservan su bloqueo operativo.
