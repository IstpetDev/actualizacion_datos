# ADR-0037: Sincronización del nombre desde la ficha personal

- **Estado:** Vigente por decisión explícita del solicitante en el issue #125 y su petición de implementación del 2026-10-28.
- **Fecha:** 2026-10-28
- **Alcance:** sustituye únicamente la conservación permanente del nombre original después de editar la ficha descrita en ADR-0012 y RF-HDV-022 de spec-0003.

## Contexto

El issue #125 exige sincronizar `Persona.Nombre` al guardar la ficha para evitar
nombres ausentes o desactualizados en reportes y cabeceras. La importación sigue
conservando el nombre original y proponiendo los cuatro campos como hasta ahora.

## Decisión

Al guardar la ficha, el servicio compone el nombre con primer apellido, segundo
apellido, primer nombre y segundo nombre, omitiendo los vacíos y usando los valores
normalizados de la ficha. Si todos están vacíos, el nombre queda nulo. Se mantiene
el orden institucional de apellidos y nombres de ADR-0012.

La persona y la ficha se guardan con un solo `SaveChangesAsync`, dentro de la
transacción implícita de EF Core. `personas.nombre` se amplía de 200 a 403 caracteres
para admitir los cuatro campos válidos de 100 caracteres sin truncarlos.

El correo de acceso conserva su flujo de verificación; el correo institucional de
la ficha no lo reemplaza. No se alteran identidad, roles ni aislamiento institucional.

## Consecuencias

Los guardados futuros actualizan el nombre usado por consultas y exportaciones.
Los registros históricos se sincronizan cuando la persona guarda su ficha.
La migración descendente debe rechazar nombres que no quepan en 200 caracteres;
no se truncan datos para revertirla.
