# ADR-0045 — Corte histórico y saldo certificado de vacaciones

- **Estado:** Propuesto
- **Fecha:** 2026-11-10

## Contexto

[#184](https://github.com/IstpetDev/actualizacion_datos/issues/184) y [#185](https://github.com/IstpetDev/actualizacion_datos/issues/185) prohíben inferir saldos exactos desde fechas antiguas sin consumos acreditados. [spec-0023 v0.1](../specs/spec-0023/spec.md) y [spec-0024 v0.1](../specs/spec-0024/spec.md) proponen certificación independiente de fecha/corte, Modo A sin saldo numérico y Modo B con cobertura certificada. Son borradores pendientes de aprobación.

El ledger legado modifica y elimina asientos durante reconciliación; no demuestra contabilidad inmutable. Sus bolsas históricas no son saldos certificados. La identidad continúa siendo institucional conforme ADR-0038; no se fusionan cuentas ni se crea identidad global.

## Opciones

1. Eventos documentales en A y, solo al habilitar B, movimientos añadidos sin sobrescribir anteriores, apertura certificada por período/bolsa y proyección reconstruible del saldo. Correcciones mediante compensación referenciada al origen. Preserva explicación histórica, exige consistencia e idempotencia.
2. Saldos certificados y movimientos mutables con historial separado obligatorio de cada cambio. Simplifica consultas iniciales, dificulta demostrar integridad/reproducción de imputaciones.
3. Entrega exclusivamente documental (A), posponiendo disponibilidad/FIFO. Reduce alcance y riesgo; no satisface una eventual aprobación que exija B en Entrega 1.

Ninguna opción admite asumir cero consumido, generar créditos por antigüedad sin fuente ni convertir ausencia de saldo en cero certificado.

## Decisión

**Pendiente.** Quien desarrolla elige representación; TH/Jurídico y responsable funcional deciden cobertura, certificación y alcance A/B. La opción 1 es una alternativa a evaluar, no decisión adoptada.

Antes de tareas dependientes: fijar corte/movimientos incluidos, desglose por período/bolsa, apertura nativa acreditada, unicidad, cobertura parcial, eventos previos en A, reserva/momento de efecto, FIFO/prelación/anticipos autorizados, concurrencia y rectificaciones sin doble descuento. Estado documental y efecto contable permanecen separados. Precisión numérica y metadatos técnicos esperan reglas funcionales aprobadas.

## Consecuencias

Preservar movimientos facilita explicar tramos y auditar ajustes, con costo de conciliación/proyecciones. El saldo solo es exacto dentro de cobertura certificada; una proyección no aporta evidencia faltante. A permite actas con sus restantes datos aprobados, sin eludir insuficiencia conocida de B. No se ejecutan corte automático, migración ni producción desde este milestone.

## ADR relacionados

- [ADR-0004 — Vigente, multitenencia](ADR-0004-multitenancia-esquema-unico.md).
- [ADR-0038 — Vigente, identidad/roles institucionales](ADR-0038-asignacion-roles-institucionales.md).
- [ADR-0044 — Propuesto, reglas](ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md).
- [ADR-0046 — Propuesto, PDF y firma](ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md).
