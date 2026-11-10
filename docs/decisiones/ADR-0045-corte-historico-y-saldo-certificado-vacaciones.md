# ADR-0045 — Corte histórico y saldo certificado de vacaciones

- **Estado:** Vigente
- **Fecha:** 2026-11-10
- **Cerrado:** 2026-11-10, por @bryancito1090 (quien desarrolla) en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) para el alcance Modo A.

## Contexto

[#184](https://github.com/IstpetDev/actualizacion_datos/issues/184) y [#185](https://github.com/IstpetDev/actualizacion_datos/issues/185) prohíben inferir saldos exactos desde fechas antiguas sin consumos acreditados. [spec-0023 v0.2](../specs/spec-0023/spec.md) y [spec-0024 v0.2](../specs/spec-0024/spec.md) establecen certificación independiente de fecha/cargo/período/días/retorno y operan en Entrega 1 en Modo A sin saldo numérico, manteniendo Modo B diferido.

El ledger legado modifica y elimina asientos durante reconciliación; no demuestra contabilidad inmutable. Sus bolsas históricas no son saldos certificados. La identidad continúa siendo institucional conforme ADR-0038; no se fusionan cuentas ni se crea identidad global.

## Opciones

1. Eventos documentales en A y, solo al habilitar B, movimientos añadidos sin sobrescribir anteriores, apertura certificada por período/bolsa y proyección reconstruible del saldo. Correcciones mediante compensación referenciada al origen. Preserva explicación histórica, exige consistencia e idempotencia.
2. Saldos certificados y movimientos mutables con historial separado obligatorio de cada cambio. Simplifica consultas iniciales, dificulta demostrar integridad/reproducción de imputaciones.
3. Entrega exclusivamente documental (A), posponiendo disponibilidad/FIFO. Reduce alcance y riesgo; no satisface una eventual aprobación que exija B en Entrega 1.

Ninguna opción admite asumir cero consumido, generar créditos por antigüedad sin fuente ni convertir ausencia de saldo en cero certificado.

## Decisión

Se adopta la **Opción 1 acotada a Modo A (`ACTA_SIN_SALDO`) en Entrega 1**:

1. **Modelo de Entrega 1 (Modo A documental):** Se persisten únicamente `VinculoLaboral`, `CertificacionIngreso`, `PeriodoVacacional` y `EventoVacacional` por `InstitucionId` y `PersonaId`, sin tablas de ledger ni de saldos materializados en Entrega 1. La estructura de movimientos append-only y corte certificado desglosado de la Opción 1 queda reservada para cuando se apruebe Modo B.
2. **Certificación explícita sin inferencias:** `Persona.FechaIngresoInstitucion` se muestra únicamente como dato administrativo informado; no se usa `Min(ficha, contrato)`, `Max(reingreso)` ni la fecha actual como fecha efectiva de cómputo. TH con facultad activa debe registrar `CertificacionIngreso` con fuente (`CONTRATO`, `HISTORIAL_IESS` o `CERTIFICACION_TH`), cargo activo seleccionado, episodio de continuidad y referencia documental de custodia.
3. **Acoplamiento progresivo con el módulo de contratos (#196):** Mientras se especifica y desarrolla el módulo básico de contratos laborales ([#196](https://github.com/IstpetDev/actualizacion_datos/issues/196), asignado a @AnthonyPilatasig), `ServicioVinculosLaborales` (#191) opera autónomamente con sus referencias contractuales y certificaciones, permitiendo acoplar las entidades contractuales a medida que #196 avance sin romper contratos API ni actas emitidas.
4. **Períodos, días, retorno y solapes en Modo A:** `PeriodoVacacional` registra límites explícitos y etiqueta descriptiva `YYYY-YYYY` por vínculo. `EventoVacacional` registra rango solicitado y efectivo inclusivo (`[FechaInicioEfectiva, FechaFinEfectiva]`), días calendario, días efectivos declarados con respaldo, fecha de retorno certificada y estado operativo separado del estado del PDF.
5. **Control de solapes y vínculos concurrentes:** Se bloquea con `409` cualquier confirmación de evento vacacional cuyo rango efectivo se superponga inclusivamente con otro evento activo (no cancelado/anulado) del mismo vínculo, revalidando dentro de una escritura consistente con control de concurrencia. Cuando la misma persona tenga vínculos concurrentes activos en la misma institución, se exige clasificar expresamente el vínculo y se bloquean/advierten solapes en esa institución salvo autorización expresa de TH; nunca se cruzan vínculos entre instituciones distintas (ADR-0004).
6. **Rectificaciones trazables:** Corregir una certificación o un evento conserva la revisión previa inmutable, registra actor, fecha y motivo, y marca las actas emitidas afectadas como sujetas a revisión/sucesión sin sobrescribir PDFs ni generar débitos contables.

## Consecuencias

- Las tareas `T-VIN-01`, `T-VIN-02`, `T-SAL-01` y `T-SAL-02` ([#191](https://github.com/IstpetDev/actualizacion_datos/issues/191) y [#192](https://github.com/IstpetDev/actualizacion_datos/issues/192)) quedan desbloqueadas con contratos congelados en [spec-0023/plan.md](../specs/spec-0023/plan.md) y [spec-0024/plan.md](../specs/spec-0024/plan.md).
- Tanto la API como la UI y el PDF declaran explícitamente «Saldo no certificado / pendiente de levantamiento histórico» en Modo A, sin exponer `0` como saldo desconocido.
- Las tareas `T-VIN-D01` y `T-SAL-D01` (corte histórico, FIFO, doble bolsa, anticipos e incentivos) permanecen diferidas fuera de Entrega 1.

## ADR relacionados

- [ADR-0004 — Vigente, multitenencia](ADR-0004-multitenancia-esquema-unico.md).
- [ADR-0038 — Vigente, identidad/roles institucionales](ADR-0038-asignacion-roles-institucionales.md).
- [ADR-0044 — Vigente, reglas vacacionales por institución](ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md).
- [ADR-0046 — Vigente, PDF inmutable y firma física](ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md).

## Revisión documental para #187 y cierre en #189

Revisado inicialmente el 2026-11-10 para #187 y cerrado como **Vigente** el 2026-11-10 en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) ([evidencia E0](../evidencia/issue-189/README.md)) por decisión expresa de quien desarrolla para Entrega 1 en Modo A.
