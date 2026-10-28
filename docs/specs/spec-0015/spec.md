# Persistencia y sincronización de ficha personal — Spec

**ID:** spec-0015; issue #125  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante en la petición de implementación del issue #125  
**Fecha:** 2026-10-28  
**Áreas:** `src/Backend`, `src/Frontend`

## Problema y resultado esperado

Guardar, recargar y volver a guardar debe conservar los campos de la ficha.
La residencia debe mostrar sus tres selectores, la discapacidad debe permitir
elegir su tipo y el resultado del guardado debe ser visible.

## Fuentes y decisiones vigentes

- [Issue #125](https://github.com/IstpetDev/actualizacion_datos/issues/125): cinco criterios reproducidos abajo y solicitados expresamente en esta sesión.
- `spec-0003` v0.4 aprobada: RF-HDV-001, datos opcionales en borrador y catálogos; RF-HDV-022 conserva el nombre original al importar. El pedido de #125 cambia su conservación después de guardar la ficha, según ADR-0037.
- `spec-0007` aprobada: normalización, validaciones y correo institucional.
- [ADR-0010, Vigente](../../decisiones/ADR-0010-hoja-de-vida-estructurada.md): ficha separada y edición por estado.
- [ADR-0012, Vigente](../../decisiones/ADR-0012-carga-de-nomina-nulos-y-nombres.md): importación y orden de apellidos y nombres.
- [ADR-0026, Vigente](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md): mensajes accesibles y claros.
- [ADR-0037](../../decisiones/ADR-0037-sincronizacion-nombre-desde-ficha.md): registra la sincronización expresamente pedida en #125.

## Alcance y requisitos verificables

| ID | Comportamiento | Fuente |
|---|---|---|
| RF-PER-001 | Una ficha con parroquia reconstruye provincia, cantón y listas hijas al cargar y descartar; no borra la parroquia por cargas asíncronas. | #125, criterio 1 |
| RF-PER-002 | El formulario permite elegir discapacidad, porcentaje y carné; quitar el tipo limpia los dependientes. | #125, criterio 2 |
| RF-PER-003 | El guardado sincroniza `Persona.Nombre` con los cuatro campos normalizados, en la misma transacción que la ficha. | #125, criterio 3 |
| RF-PER-004 | Éxito y error aparecen en avisos accesibles; un nuevo intento retira el éxito anterior. | #125, criterio 4 |
| RF-PER-005 | Pruebas unitarias y PostgreSQL real verifican todos los campos, recarga, segundo guardado, rechazos y aislamiento institucional. | #125, criterio 5 |

No cambia el correo de acceso: tiene verificación independiente. No cambia la API,
permisos ni reglas de obligatoriedad. No se corrigen datos históricos en masa.

## Escenarios y criterios de aceptación

- [x] Abrir ficha existente: residencia y discapacidad visibles; volver a guardar conserva los datos (RF-PER-001, 002, 005).
- [x] Guardar nombres corregidos: ficha y persona consultadas desde otro contexto contienen los cambios (RF-PER-003, 005).
- [x] Guardar, fallar y reintentar: avisos correctos y cambios pendientes conservados tras error (RF-PER-004).
- [x] Nombres de 100 caracteres cada uno persisten completos; solicitudes inválidas no modifican ficha ni persona (RF-PER-003, 005).

## Datos y seguridad

Solo datos evidentemente ficticios en pruebas. Se mantienen filtros por institución,
validación de catálogos y propiedad de fotos. `Persona.Nombre` requiere hasta 403
caracteres: cuatro campos de 100 y tres espacios; migración expansiva sin truncado.

## Revisión funcional

La autorización es el pedido explícito del solicitante del 2026-10-28:
«soluciona este issue» y «cumple con todos los criterios de aceptacion del issue».
Se documenta ese alcance, sin atribuir una revisión nueva al revisor de specs anteriores.
No quedan decisiones funcionales abiertas dentro de los criterios solicitados.
