# ADR-0026 — Modelo de las capacitaciones obligatorias de la institución

- **Estado:** Propuesto
- **Fecha:** 2026-10-27

## Contexto

El issue #92 y la spec-0008 piden que el `admin` configure capacitaciones que todas las personas deben cursar y acreditar con un certificado, aplicables a todas o a un tipo de funcionario, y que el envío a revisión se bloquee mientras falten. Hoy:

- `Capacitacion` (`Domain/HojaDeVida/Capacitacion.cs`) es un ítem libre de la persona, con evento, organizadora, tipo, participación, fechas, horas y un respaldo obligatorio por ítem (RF-HDV-024, ADR-0010 decisión 10). No sabe si cumple una exigencia de la institución.
- Los documentos ya tienen un mecanismo equivalente: `TipoDocumento` más `RequisitoDocumento` (tipo de funcionario o «todos», obligatorio, activo), con el que `ValidadorCompletitudEnvio` bloquea el envío (ADR-0010 decisión 7, RF-HDV-007, 012).
- El envío se valida con reglas independientes (`IReglaCompletitudEnvio`), de modo que una regla nueva no toca las existentes.
- El cargo de la nómina no está persistido (`ServicioPersonas.cs`, líneas 177 a 193): solo propone el tipo de funcionario al cargar. La spec-0008 propone aplicar por tipo de funcionario o «todas» (PD-CAP-02).
- Restricciones vigentes: aislamiento por institución (ADR-0004), reglas de archivo (ADR-0006), rechazo con marcas por ítem (ADR-0008). ADR-0009 sigue Propuesto y no se cierra aquí.

Este ADR decide **solo el modelo**. Los puntos funcionales (campaña, exoneraciones, recordatorios) siguen en la spec-0008.

## Opciones

1. **A. Reutilizar el modelo de documentos.** Cada capacitación obligatoria es un `TipoDocumento` con su `RequisitoDocumento`; la persona sube un documento personal.
   - Ventajas: casi sin código nuevo; el validador, la configuración y la exportación ya existen.
   - Desventajas: la obligatoria vive en «Documentación», no en «Capacitaciones»; no hay horas ni fechas propias ni vínculo con la `Capacitacion` de la persona; el reemplazo por tipo (RF-HDV-008) impide acumular certificados por edición; mezcla dos conceptos en los reportes.

2. **B. Entidad propia «capacitación obligatoria» vinculada a la `Capacitacion` de la persona.** Una entidad por institución (nombre, organizadora, horas esperadas, alcance, activa) y una referencia opcional desde `Capacitacion` a la obligatoria que cumple.
   - Ventajas: coherente con la pantalla y con el reporte; la capacitación conserva sus fechas, horas y respaldo (RF-HDV-024); el cumplimiento se calcula con una consulta; una `Capacitacion` sin obligatoria sigue siendo libre.
   - Desventajas: más trabajo (entidad, migración, endpoints, regla de completitud, exportación); hay que definir qué pasa con el vínculo al desactivar o editar la obligatoria.

3. **C. Híbrido.** A ahora y migrar a B después.
   - Ventajas: entrega rápida.
   - Desventajas: dos modelos y una migración de datos reales después; las obligatorias creadas como documentos habría que convertirlas en capacitaciones.

## Decisión

**Pendiente.** Recomendación del desarrollador, sin cerrar el ADR: **opción B**, porque es la única que cumple el comportamiento pedido en el issue (la obligatoria aparece en «Capacitaciones», conserva horas y fechas y se exporta como capacitación) sin duplicar el concepto en «Documentación», y evita la migración posterior de la opción C.

Si se adopta B, el diseño parte de estas pautas, a precisar en el plan:

- La obligatoria es `EntidadInstitucional` con alcance «todas» o un tipo de funcionario, en la misma forma que `RequisitoDocumento` (`AplicaA`).
- El vínculo vive en `Capacitacion` (referencia opcional), y una segunda capacitación para la misma obligatoria reemplaza a la primera (RF-CAP-006).
- El bloqueo del envío es una `IReglaCompletitudEnvio` nueva; no modifica las reglas actuales.
- Desactivar una obligatoria no borra los certificados (RF-CAP-003).

Este ADR sigue **Propuesto** hasta que quien desarrolla lo cierre. Un agente de IA no lo cierra por su cuenta (AGENTS.md), y las tareas que dependen del modelo no se ejecutan hasta entonces.

## Consecuencias

- **Si se adopta B:** se agrega una entidad y una columna a `capacitaciones`, con su migración; cambian la API y el cliente (hay que regenerar `openapi/v1.json`); la exportación y la revisión del supervisor leen del vínculo. Los datos existentes no se tocan: las capacitaciones actuales quedan sin obligatoria.
- **Riesgo:** una persona puede haber subido ya una capacitación equivalente antes de que se cree la obligatoria; vincularla es una decisión funcional que la spec-0008 no cubre y queda como punto abierto para el plan.
- **Sin B:** A deja el cumplimiento fuera de «Capacitaciones» y limita la exportación; C acumula deuda con migración pendiente.

## ADR relacionados

- ADR-0004 — Multitenencia con esquema único.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0008 — Granularidad del rechazo.
- ADR-0009 — Campos configurables por institución (Propuesto; no se cierra).
- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0020 — Retirada del control de clasificación docente.
