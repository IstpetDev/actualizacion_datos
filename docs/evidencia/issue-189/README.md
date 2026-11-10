# Evidencia documental de #189 — Decisiones de activación de vacaciones en modo acta (E0)

**Issue:** [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) — `docs: resolver decisiones de activación de vacaciones en modo acta`  
**Tareas cubiertas:** `T-MAR-00` ([spec-0022](../../specs/spec-0022/tasks.md)), `T-VIN-00` ([spec-0023](../../specs/spec-0023/tasks.md)), `T-SAL-00` ([spec-0024](../../specs/spec-0024/tasks.md)) y `T-ACT-00` ([spec-0025](../../specs/spec-0025/tasks.md))  
**Fecha de resolución:** 2026-11-10  
**Responsable de las decisiones técnicas y funcionales:** `@bryancito1090` (en coordinación con la aprobación de RR. HH. y Jurídico registrada en [aprobacion.md](../issue-182/aprobacion.md))

---

## 1. Decisiones expresas de arquitectura (ADR-0044, ADR-0045 y ADR-0046)

Quien desarrolla (`@bryancito1090`) registró decisión expresa para el alcance de **Entrega 1 (Modo A documental)**, pasando los tres ADR de `Propuesto` a `Vigente`:

| ADR | Opción aprobada | Alcance vigente en Entrega 1 (Modo A) | Lo que queda diferido (Modo B) |
|---|---|---|---|
| [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) | **Opción 1:** Configuración versionada por institución y régimen con bloqueo explícito si falta fuente o facultad | Tablas `ConfiguracionVacacionalInstitucion` y `FacultadVacacional` aisladas por `InstitucionId` (ADR-0004). Toda institución inicia en `PENDIENTE_CONFIRMACION` sin valores legales sembrados ni permisos implícitos por rol global. Solo opera Modo A (`HABILITADA_MODO_A`) cuando autoridad/TH/Jurídico registra régimen, fuente/cláusula y delegaciones. | Activación de `HABILITADA_MODO_B` y parámetros de cálculo automático por régimen. |
| [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) | **Opción 1 (acotada a Modo A):** Vínculo laboral, certificaciones y eventos vacacionales auditados sin ledger ni saldos en Entrega 1 | Tablas `VinculoLaboral`, `CertificacionVinculoVacacional`, `PeriodoVacacional` y `EventoVacacional`. Ningún evento en Modo A expone ni afirma saldo numérico; el acta imprime `«Saldo no certificado / pendiente de levantamiento histórico»`. Acople progresivo y no bloqueante con el módulo básico de contratos laborales ([#196](https://github.com/IstpetDev/actualizacion_datos/issues/196)). | Tablas de `CorteHistoricoVacacional`, `Ledger` (`vac_ledger`), `Saldos` (`vac_saldos`), motor FIFO de doble bolsa, devengo proporcional (1.25/mes), antigüedad (+1 día desde 5.º año), anticipos, incentivos y caducidad. |
| [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) | **Opción 1:** Entidad de versión de acta inmutable con instantánea, hash SHA-256, motor `QuestPDF` (ADR-0033) y almacenamiento privado vía `IAlmacenArchivos` (ADR-0006) con excepción explícita de retención permanente | Tablas `ActaVacaciones`, `VersionActaVacaciones` y `VerificacionFirmaFisica`. Generación PDF con `QuestPDF` detrás de `IServicioGeneracionPdfActaVacaciones`. Reimpresión sirve bytes idénticos persistidos. Excepción explícita a ADR-0006 y ADR-0039: ninguna versión emitida/anulada ni evidencia de verificación se elimina al sustituir o corregir. Escritura consistente en dos fases/compensada entre PostgreSQL e `IAlmacenArchivos`. | Firma electrónica o biométrica (fuera de alcance). |

---

## 2. Reglas institucionales, certificaciones, prelación y control de solapes (`T-MAR-00`, `T-VIN-00`, `T-SAL-00`)

1. **Facultades y separación de funciones (`PD-MAR-04`, `PD-ACT-01`):**
   - Ningún rol global (`usuario`, `supervisor`, `admin`, `superadmin`) otorga permisos operativos implícitos sobre vacaciones.
   - Se exige registro explícito en `FacultadVacacional` por institución, usuario, facultad (`CONFIGURAR_MARCO`, `CERTIFICAR_VINCULO`, `REGISTRAR_EVENTO`, `EMITIR_ACTA`, `ENTREGAR_ACTA`, `VERIFICAR_FIRMA_FISICA`, `OBSERVAR_ACTA`, `ANULAR_SUSTITUIR_ACTA`, `CONSULTAR_ARCHIVO_HISTORICO`), vigencia y acto/referencia de delegación.
   - Separación de funciones obligatoria: ninguna persona puede certificar su propio vínculo ni verificar su propia firma física como titular del acta.
2. **Fuente de régimen, cláusula vigente e instituciones incompletas (`PD-MAR-01..07`):**
   - Las instituciones sin régimen, fuente normativa verificada, plantilla/cláusula activa o delegaciones vigentes se mantienen en estado `PENDIENTE_CONFIRMACION` (sin habilitar emisión oficial).
   - No se siembran valores normativos por defecto ni se inventan saldos históricos en migraciones.
3. **Certificación de vínculo, elegibilidad y prelación de fechas/cargos (`PD-VIN-01..07`):**
   - Elegibilidad: son elegibles los vínculos con dedicación `TIEMPO_COMPLETO` o `MEDIO_TIEMPO`; si una persona solo registra vínculos `TIEMPO_PARCIAL`, no es elegible salvo certificación jurídica expresa.
   - Prelación de fecha de inicio/antigüedad cuando existan registros contractuales:
     1. **Prioridad 1 (reingreso):** fecha de `Reingreso` más reciente en vínculo válido (no parcial) cuando exista ruptura laboral certificada.
     2. **Prioridad 2 (contrato vs ficha):** menor fecha (`Min`) entre la `FechaInicio` más antigua de contratos válidos y la fecha de ingreso de ficha, emitiendo alerta explícita de discrepancia (`AlertaInconsistenciaFechas`) si difieren; cualquier discrepancia no resuelta bloquea la emisión hasta que TH certifique la fecha e indique la fuente.
   - Prelación de cargo activo para el acta: vínculo activo no parcial priorizando `TIEMPO_COMPLETO` > `MEDIO_TIEMPO` > `FechaInicio` más reciente > mayor identificador, exigiendo selección/certificación explícita de TH si persiste ambigüedad.
4. **Certificación de período, días, empalme y retorno (`PD-SAL-01..04`):**
   - En Modo A, el período de imputación (`YYYY-YYYY`), fechas inicio/fin, días calendario/efectivos, feriados no recuperables excluidos, aplicación de empalme de fin de semana (cuando el fin cae viernes y aplica extensión de sábado y domingo) y fecha de retorno son certificados por un operador de TH con facultad vigente.
5. **Estados que bloquean solapes y vínculos concurrentes (`PD-VIN-05`, `PD-SAL-05`):**
   - Bloquean solape de rango inclusivo `[FechaInicioEfectiva, FechaFinEfectiva]` en el mismo vínculo los eventos en estado `PENDIENTE`, `APROBADO_TH` y `APROBADO` (así como cualquier evento con acta en `EMITIDA_PDF`, `FIRMA_FISICA_VERIFICADA` u `OBSERVADA`).
   - Los estados `BORRADOR`, `RECHAZADO` y `CANCELADO` no bloquean nuevas fechas.
   - Cuando una misma persona posea vínculos concurrentes activos en la misma institución, el servidor también bloquea el solape de fechas entre dichos vínculos salvo clasificación y autorización expresa de TH por vínculo.

---

## 3. Firmas físicas, verificación, evidencia, numeración, retención y recuperación (`T-ACT-00`)

1. **Firmas requeridas y significado de `firma_verificada` (`PD-ACT-02`):**
   - Toda acta exige **dos firmas manuscritas en físico**: (a) representante autorizado de TH / Autoridad institucional y (b) persona trabajadora titular.
   - `firma_verificada = true` es un valor derivado exclusivamente de que la versión activa se encuentre en estado `FIRMA_FISICA_VERIFICADA`. No representa firma electrónica ni se activa por descargar el PDF o subir un archivo sin inspección registrada.
2. **Método de verificación y evidencia/respaldo obligatorio (`PD-ACT-03`):**
   - La verificación solo puede registrarla un verificador con delegación `VERIFICAR_FIRMA_FISICA` vigente en la institución, distinto de la persona trabajadora titular.
   - Debe registrar `MetodoVerificacion`, `FechaInspeccion`, comprobación de que el papel corresponde al número y versión (`vN`) emitidos, presencia de ambas firmas y al menos uno de los tres respaldos trazables:
     - `ARCHIVO_PRIVADO`: escaneo o fotografía custodiada privadamente en `IAlmacenArchivos` (`PDF`, `JPG` o `PNG`, máximo 10 MB, validado por firma mágica de bytes).
     - `REFERENCIA_FISICA`: código verificable de archivo físico, carpeta/tomo/folio y responsable de custodia documental.
     - `EXCEPCION_AUTORIZADA`: acto/referencia de autorización, motivo expreso y autoridad que autoriza la excepción.
3. **Numeración e inmutabilidad por versión (`PD-ACT-05`, `PD-ACT-06`):**
   - Formato correlativo anual por institución: `ACTA-VAC-{Anio}-{Secuencia:0000}` (con prefijo institucional configurable), asignado únicamente al emitir versión oficial (`v1`, `v2`, ...).
   - Los borradores no consumen numeración oficial. Los números de versiones anuladas jamás se reutilizan.
   - Ninguna corrección posterior sobreescribe un PDF emitido: exige anular la versión anterior con motivo auditado y emitir una versión sucesora enlazada (`VersionAnteriorId` / `VersionSucesoraId`) que requiere nueva impresión, nuevas firmas físicas y nueva verificación.
4. **Retención histórica, privacidad y recuperación BD/archivos (`PD-ACT-07`, `PD-ACT-08`):**
   - Retención histórica permanente de todas las versiones emitidas/anuladas y sus evidencias en rutas privadas por institución (`vacaciones/{institucionId}/actas/...`), con excepción explícita a la regla de borrado de sustituidos de ADR-0006/ADR-0039.
   - Ningún documento personal, informe firmado ni firma manuscrita real se sube al repositorio Git; la custodia ocurre exclusivamente en el almacenamiento privado de la aplicación y en el archivo físico institucional.
   - Escritura coordinada entre PostgreSQL e `IAlmacenArchivos` verificando hash SHA-256 antes de publicar `EMITIDA_PDF` o `FIRMA_FISICA_VERIFICADA`, con limpieza compensada ante fallo e idempotencia por `(InstitucionId, ActaId, Version, ClaveIdempotencia)`.

---

## 4. Congelamiento de contratos y coordinación con el módulo de contratos laborales (#196)

- Los contratos HTTP, DTO, códigos de estado (400/401/403/404/409 conforme ADR-0026) y reglas de idempotencia quedaron **congelados en versión 1.0** dentro de:
  - [docs/specs/spec-0022/plan.md](../../specs/spec-0022/plan.md)
  - [docs/specs/spec-0023/plan.md](../../specs/spec-0023/plan.md)
  - [docs/specs/spec-0024/plan.md](../../specs/spec-0024/plan.md)
  - [docs/specs/spec-0025/plan.md](../../specs/spec-0025/plan.md)
- Se verificó en GitHub la ausencia previa de un issue para el módulo de contratos laborales y se creó el issue [#196](https://github.com/IstpetDev/actualizacion_datos/issues/196) (`docs: planificar por specs el módulo básico de contratos laborales por institución`), asignado a `@AnthonyPilatasig`, para que el módulo básico de contratos (`Contratos`) se especifique e implemente en paralelo y el módulo de vacaciones en Modo A ([#191](https://github.com/IstpetDev/actualizacion_datos/issues/191)) pueda avanzar sin bloqueo mutuo y acoplarse progresivamente mediante `ContratoOrigenId` opcional.

---

## 5. Verificación documental y coherencia del backlog

- **Estado de los ADR:** `ADR-0044`, `ADR-0045` y `ADR-0046` actualizados a `Vigente` (Opción 1 acotada a Modo A) en sus archivos y en [docs/decisiones/README.md](../../decisiones/README.md).
- **Estado de las specs y planes:** `spec-0022` a `spec-0025` actualizados a `spec.md` v0.2 y `plan.md` v1.0 con contratos congelados y tareas `T-MAR-00`, `T-VIN-00`, `T-SAL-00` y `T-ACT-00` completadas.
- **Estado de issues dependientes:** actualizadas las secciones `## Dependencias` en [#190](https://github.com/IstpetDev/actualizacion_datos/issues/190), [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191), [#192](https://github.com/IstpetDev/actualizacion_datos/issues/192), [#193](https://github.com/IstpetDev/actualizacion_datos/issues/193), [#194](https://github.com/IstpetDev/actualizacion_datos/issues/194) y [#195](https://github.com/IstpetDev/actualizacion_datos/issues/195), removiendo la etiqueta `blocked` de `#190` (primera entrega técnica E1).
- **Comprobación automatizada de integridad documental:** 25 archivos verificados, 34 `RF-VAC-*`, 23 `ESC-VAC-*`, 23 `E2E-*` y 13 secciones `T-*` trazadas sin enlaces ni anclas rotas; cero datos personales, informes firmados o firmas reales en el repositorio.

