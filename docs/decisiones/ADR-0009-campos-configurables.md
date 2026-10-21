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

Restricciones para el modelo de datos mientras siga pendiente (acordadas en el issue #4, sin elegir opción):

- Cada campo de la ficha tiene una **clave estable** de texto (por ejemplo `celular`), independiente del nombre de la columna. Las observaciones del rechazo (ADR-0008), la exportación y las validaciones se refieren a esa clave.
- Los archivos se clasifican por un **tipo de documento** que es un dato (tabla con `institucion_id`), no un `enum` en el código.
- Las validaciones de cada campo (obligatorio, formato, longitud) se declaran en un único lugar de la capa de aplicación, para poder leerlas después desde una definición guardada.
- La exportación (Excel y `.zip`) recorre la lista de campos y de tipos de documento, en lugar de fijar las columnas en el código.

## Consecuencias

A completar al decidir. Puntos a considerar: validación de los valores, exportación y rechazo por dato con campos dinámicos, y migración de los datos existentes.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0008 — Granularidad del rechazo.
