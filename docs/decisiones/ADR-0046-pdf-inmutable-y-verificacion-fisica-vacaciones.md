# ADR-0046 — PDF inmutable y verificación física de actas de vacaciones

- **Estado:** Propuesto
- **Fecha:** 2026-11-10

## Contexto

[#186](https://github.com/IstpetDev/actualizacion_datos/issues/186) exige PDF imprimible, versiones, corrección y rastro de verificación física. [spec-0025 v0.1](../specs/spec-0025/spec.md) propone estados BORRADOR, EMITIDA_PDF, FIRMA_FISICA_VERIFICADA, OBSERVADA, ANULADA y sucesora para sustituir contenido. La aprobación funcional de Modo A fue comunicada por el solicitante el 2026-11-10; la elección técnica sigue pendiente.

ADR-0006 elimina archivos sustituidos de actualización de datos: aplicarlo al acta perdería la versión que alguien pudo firmar. ADR-0033 elige motor PDF de hoja de vida; no resuelve persistencia, firma física ni retención de actas. Un hash no es firma electrónica.

## Opciones

1. Guardar bytes privados del PDF en el almacén existente, con instantánea/metadatos por versión, conservar anuladas y comprobar hash. Evaluar reutilizar motor vigente. Añadir auditoría y verificaciones sin sobrescribir hechos. Requiere excepción explícita y acotada a la eliminación de ADR-0006.
2. PDF/metadatos por versión en PostgreSQL con acceso privado y auditoría. Facilita consistencia archivo/registro, aumenta volumen/respaldos y cambia almacenamiento; requiere decisión frente a ADR-0006.
3. Regenerar al descargar desde instantánea y dependencias congeladas. Reduce almacenamiento, pero dificulta garantizar idénticos bytes entre versiones de motor/fuentes; solo sería admisible demostrando esa propiedad y recuperación íntegra.

Sobrescribir un PDF emitido o borrar el anterior al corregir incumple #182/#186. Ninguna opción incluye firma electrónica ni URL pública.

## Decisión

**Pendiente.** Quien desarrolla resolverá almacenamiento, inmutabilidad y relación con ADR-0006/0033 tras revisar specs. No se modifica ni reemplaza ningún ADR vigente por iniciativa del agente.

Antes de tareas dependientes: resolver numeración/unicidad, hash sobre bytes emitidos, reimpresión exacta, fallo entre archivo/registro, reintentos, transiciones concurrentes, acceso histórico, respaldo/restauración, conservación/eliminación y auditoría que preserve hechos. TH/Jurídico define autoridad, firmas exigidas, método y respaldo digital/físico/excepción, retención y significado administrativo de verificación.

## Consecuencias

Preservar versiones permite identificar papel/verificación y sustituciones, con mayor custodia. Reimpresión no puede insertar marcas nuevas dentro de bytes originales; el estado se comunica fuera del archivo. Anular no decide por sí solo efectos sobre días. Un incidente de evidencia no borra una verificación histórica. No se elige paquete ni se amplían permisos en esta propuesta.

## ADR relacionados

- [ADR-0004 — Vigente, multitenencia](ADR-0004-multitenancia-esquema-unico.md).
- [ADR-0006 — Vigente, archivos](ADR-0006-almacenamiento-de-archivos.md); contradicción de retención pendiente, sin modificación de este ADR.
- [ADR-0033 — Vigente, motor PDF](ADR-0033-motor-generacion-pdf.md).
- [ADR-0045 — Propuesto, separación del efecto contable](ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md).

## Revisión documental para #187

Revisado el 2026-11-10 frente a las specs 0022–0025 v0.1 y su [aprobación comunicada](../evidencia/issue-182/aprobacion.md). Los planes identifican contratos/rutas propuestos y tareas dependientes; ninguna opción técnica se adopta mediante esta revisión. Entrega 1 se limita a Modo A, sin saldos/FIFO. El backlog E0 exige la decisión expresa de quien desarrolla y el registro de los datos institucionales faltantes antes de ejecutar las tareas dependientes. Este ADR conserva estado **Propuesto**; el cierre documental de #182 no lo convierte en Vigente.
