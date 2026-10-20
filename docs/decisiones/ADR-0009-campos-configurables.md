# ADR-0009 — Campos configurables por institución

- **Estado:** Propuesto
- **Fecha:** 2026-10-20

## Contexto

Cada institución puede necesitar datos y documentos distintos. El diseño de la fundación no define los formularios configurables, pero exige no cerrar esa puerta. Esta decisión es para el futuro; no hace falta tomarla para la primera institución.

## Opciones

1. **Campos fijos en el modelo**, ampliados con migraciones cuando una institución lo pida. Simple, pero cada cambio requiere desarrollo.
2. **Definición de campos por institución** guardada como datos (nombre, tipo, obligatoriedad, orden), con los valores en una estructura flexible.
3. **Campos fijos más un conjunto de campos adicionales configurables.** Equilibrio entre ambas.

## Decisión

Pendiente. Se decidirá cuando se incorpore una segunda institución o se pida configurar los campos. Mientras tanto, el modelo de datos y las decisiones deben evitar cerrar esta posibilidad.

## Consecuencias

A completar al decidir. Puntos a considerar: validación de los valores, exportación y rechazo por dato con campos dinámicos, y migración de los datos existentes.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0008 — Granularidad del rechazo.
