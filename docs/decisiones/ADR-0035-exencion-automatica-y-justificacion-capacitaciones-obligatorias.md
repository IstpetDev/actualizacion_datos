# ADR-0035 — Exención automática y justificación de nuevo ingreso en capacitaciones obligatorias

- **Estado:** Vigente
- **Fecha:** 2026-10-27

## Contexto

El issue #92, la spec-0008 y el ADR-0029 establecen que el `admin` configura capacitaciones obligatorias institucionales para todas las personas o por tipo de funcionario, y que `ValidadorCompletitudEnvio` bloquea el envío a revisión mientras falte alguna obligatoria aplicable.

Durante el análisis del flujo operativo real, se identificó un problema crítico:
- Si un funcionario es de **nuevo ingreso** a la institución y la capacitación obligatoria ya fue dictada previamente (o la institución aún no ha convocado al nuevo personal), la regla estricta impediría a la persona enviar su actualización de hoja de vida.
- Exigir que administradores o supervisores exoneren manualmente persona por persona resulta tedioso, ineficiente y genera cuellos de botella cuando la nómina tiene cientos de funcionarios.
- En la infraestructura actual, la carga de nómina (`ServicioPersonas.cs`) ya recibe del archivo Excel la columna `fecingreso` (ADR-0014), pero dicho valor se descartaba al no estar mapeado en la entidad `Persona`.

## Opciones

1. **A. Exoneración manual persona por persona por el administrador.**
   - *Ventajas:* Control individual explícito.
   - *Desventajas:* Carga de trabajo tediosa para el admin; si el admin no exonera a tiempo, la persona queda bloqueada sin poder enviar.

2. **B. Justificación manual declarada por el funcionario (Alternativa A del análisis).**
   - *Ventajas:* La persona no queda bloqueada; declara en pantalla su condición de nuevo ingreso.
   - *Desventajas:* Requiere que cada funcionario nuevo tenga que justificar manualmente cada curso, y el supervisor debe revisarlo uno por uno.

3. **C. Enfoque híbrido: Automatización por fecha de ingreso con respaldo de justificación manual.**
   - *Ventajas:*
     - Almacenar la `FechaIngresoInstitucion` en `Persona` (leída directamente del Excel de nómina `fecingreso`).
     - Agregar `FechaRealizacion` en `CapacitacionObligatoria` (fecha en que se impartió o desde cuándo se exige).
     - Si `FechaIngresoInstitucion > FechaRealizacion`, el sistema detecta de forma automática que la persona ingresó con posterioridad al evento y marca la capacitación como `exento-nuevo-ingreso`, permitiendo el envío sin intervención humana.
     - Para casos donde la nómina no traiga fecha de ingreso, el funcionario cuenta con la opción de declarar con un clic «No cursada por nuevo ingreso / pendiente de convocatoria» (`justificada-nuevo-ingreso`).
   - *Desventajas:* Requiere persistir un campo adicional en `Persona` y en `CapacitacionObligatoria`.

## Decisión

Se adopta la **Opción C** (enfoque híbrido de automatización por fecha de ingreso con respaldo de justificación manual):

1. **Persistencia de fecha de ingreso en `Persona`:** Se agrega `DateOnly? FechaIngresoInstitucion` a la entidad `Persona`, mapeada desde el campo `fecingreso` del Excel de nómina.
2. **Fecha de realización en `CapacitacionObligatoria`:** Se agrega `DateOnly? FechaRealizacion` a la entidad `CapacitacionObligatoria`.
3. **Cálculo de cumplimiento y envío:**
   - Una capacitación obligatoria se considera satisfecha para habilitar el envío a revisión si:
     - Está vinculada a una `Capacitacion` con certificado de respaldo (`cargada`), o
     - La persona ingresó a la institución después de la fecha en que se dictó la capacitación (`exento-nuevo-ingreso`), o
     - La persona justificó que no la ha cursado por ser personal de nuevo ingreso (`justificada-nuevo-ingreso`).
4. **Visibilidad en revisión y reportes:**
   - Tanto el supervisor en la revisión de expediente como el administrador en el resumen y exportación ven claramente el estado (`Exento automático (Ingreso: DD/MM/AAAA)` o `Justificado por nuevo ingreso`), eliminando la necesidad de verificación manual individual para la mayoría de los casos.

## Consecuencias

- Se agrega `fecha_ingreso_institucion` a la tabla `personas` y `fecha_realizacion` a `capacitaciones_obligatorias`.
- `ServicioPersonas.cs` guarda la fecha de ingreso al procesar el archivo de nómina.
- Se evita el bloqueo injustificado de funcionarios nuevos sin comprometer la exigencia institucional para el personal antiguo.
- La experiencia de usuario y administración es ágil y sin fricción innecesaria.

## ADR relacionados

- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0012 — Carga de nómina: columnas, valores nulos y división de nombres.
- ADR-0014 — Carga de la nómina real: encabezados, nulos textuales y alias de catálogo.
- ADR-0029 — Modelo de las capacitaciones obligatorias de la institución.
