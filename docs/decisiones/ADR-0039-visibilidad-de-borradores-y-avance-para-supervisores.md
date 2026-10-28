# ADR-0039 — Visibilidad de borradores y avance institucional para supervisores

- **Estado:** Vigente por autorización del solicitante en la implementación del issue #143 (2026-10-28).
- **Fecha:** 2026-10-28

## Contexto

Originalmente, las reglas RF-FLU-006 (`spec-0001`) y RF-CAP-016 (`spec-0008`) establecían
que los supervisores solo podían consultar expedientes en estado `Enviado`, manteniendo
los borradores en estricta privacidad durante la campaña y reservando la lectura de
borradores post-campaña exclusivamente al rol `Admin`.

El issue #143 expone la necesidad de que el supervisor de cada institución pueda
monitorear a todas las personas de su institución (rol `Usuario`), identificando si aún
no han iniciado o si mantienen un borrador, junto con el avance por sección. Esto
permite dar acompañamiento y seguimiento institucional antes del cierre de campaña,
garantizando a la vez que no sea posible aprobar ni devolver expedientes no enviados.

## Opciones

1. **Modificar el enum de dominio `EstadoActualizacion` agregando `SinIniciar`:**
   Introduce riesgo de rotura en migraciones existentes de base de datos, altera la
   máquina de estados de la entidad `Persona` y exigiría scripts de migración complejos
   para todas las personas persistidas cuyo valor por defecto ha sido `Borrador`.

2. **Mantener `EstadoActualizacion` en dominio y calcular el estado efectivo y avance en la capa de aplicación:**
   Conserva el enum de dominio (`Borrador`, `Enviado`, `Aprobado`, `Devuelto`). Si la persona
   está en `Borrador` y carece de datos en su hoja de vida (sin ficha, títulos, experiencia,
   capacitaciones, referencias, documentos, cuenta bancaria ni aceptación de tratamiento),
   se expone como `Sin Iniciar`. Si ya registró avance, se expone como `Borrador`. Se
   calcula el avance según las secciones activas de la institución y se permite la consulta
   en modo solo lectura, impidiendo terminantemente las acciones de aprobación o devolución
   en estados distintos de `Enviado`.

## Decisión

Se adopta la **Opción 2**:

1. **Consulta general para el supervisor:**
   El endpoint `/api/revision/pendientes` lista a todas las personas con rol `Usuario` de la
   institución del supervisor, ordenadas y acompañadas de su estado efectivo (`Sin Iniciar`,
   `Borrador`, `Enviado`, `Devuelto`, `Aprobado`), secciones completadas y porcentaje de
   avance.
2. **Acceso de solo lectura a borradores:**
   El supervisor puede invocar `/api/revision/{documento}` y `/api/revision/{documento}/hoja-de-vida`
   para expedientes en `Borrador` o `Sin Iniciar`. Toda lectura se audita con la acción
   `ConsultaBorradorSupervisor`.
3. **Inmutabilidad y protección de acciones de revisión:**
   Las acciones `/api/revision/{documento}/aprobar` y `/api/revision/{documento}/devolver`
   exigen estrictamente que el expediente se encuentre en estado `Enviado`. Cualquier
   intento de aprobar o devolver un borrador o un registro sin iniciar es rechazado con
   error 400 (`ReglaNegocioException`), protegido a nivel de servicio y dominio (`Persona.Aprobar()`,
   `Persona.Devolver()`).
4. **Aislamiento multi-institucional estricto:**
   Se mantiene el aislamiento de tenant (ADR-0004); un supervisor jamás puede listar ni
   consultar datos de personas pertenecientes a otra institución (404 Not Found).

## Consecuencias

- Se actualizan las pruebas unitarias y de integración que antes exigían el bloqueo de
  lectura de borradores al supervisor (`FlujoRevisionTests.cs` y `ExportacionesTests.cs`),
  alineándolas con el nuevo estándar de solo lectura auditada.
- La interfaz del supervisor expone los estados, avance visual y deshabilita u oculta los
  botones de aprobación y devolución cuando el expediente no está enviado.
- No se alteran migraciones de base de datos ni la entidad `Persona`, manteniendo la
  estabilidad del modelo persistente.

## ADR relacionados

- ADR-0004 (aislamiento multi-institución).
- ADR-0008 (granularidad de revisiones y observaciones).
- ADR-0010 (hoja de vida estructurada y secciones).
- ADR-0028 (secciones habilitadas por institución).

