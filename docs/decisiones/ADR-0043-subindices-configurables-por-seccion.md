# ADR-0043 — Subíndices libres configurables por sección de la hoja de vida

- **Estado:** Vigente por pedido explícito #171
- **Fecha:** 2026-11-05

## Contexto

Actualmente el administrador institucional puede:
1. Habilitar o deshabilitar secciones completas de la hoja de vida (`SeccionInstitucion`, ADR-0028).
2. Definir tipos y requisitos de documentos personales (`TipoDocumento`, `RequisitoDocumento`, ADR-0010) para la sección 6 (`DocumentosPersonales`).
3. Definir capacitaciones institucionales obligatorias con reglas propias de exención por nuevo ingreso (`CapacitacionObligatoria`, ADR-0029, ADR-0035).

Sin embargo, las instituciones requieren subdividir de forma libre las secciones multi-registro de la hoja de vida (`FormacionAcademica`, `ExperienciaLaboral`, `Capacitaciones` y `Referencias`) en subíndices diferenciados —por ejemplo, exigir a docentes cargar ítems clasificados en «Títulos de 3er Nivel», «Títulos de 4to Nivel», «Título SENESCYT» o «Docencia Superior»— sin alterar el esquema tipado de cada registro ni invalidar los datos ya cargados en producción. El ADR-0009 sobre campos dinámicos permanece en estado `Propuesto` y abarca un problema distinto (columnas JSON arbitrarias).

## Opciones

1. **Entidad transversal `SubindiceSeccion` por institución y clave foránea opcional `subindice_seccion_id` en los registros multi-ítem (`TituloAcademico`, `TituloEnCurso`, `Capacitacion`, `ExperienciaLaboral`, `ReferenciaPersonal`).**
   - *Ventajas:* Cero ruptura sobre datos existentes (`subindice_seccion_id IS NULL`), aislamiento multi-institución automático mediante `EntidadInstitucional` (ADR-0004), validación uniforme en `ValidadorCompletitudEnvio`, baja lógica (`Activo = false`) que preserva etiquetas históricas y un único recurso REST en `/api/configuracion/subindices`.
   - *Desventajas:* Añade una columna anulable a cinco tablas existentes mediante migración EF Core.
2. **Tablas separadas de requisitos por cada sección (`RequisitoExperiencia`, `RequisitoFormacion`, `RequisitoReferencia`).**
   - *Ventajas:* Permite atributos específicos por tabla si algún día divergen.
   - *Desventajas:* Cuadruplica entidades, endpoints, migraciones, reglas de completitud y componentes de administración sin necesidad funcional actual.
3. **Almacenar la clasificación como etiqueta de texto suelta en cada registro o en JSON.**
   - *Ventajas:* Menos relaciones relacionales.
   - *Desventajas:* Impide renombrar un subíndice sin desincronizar registros previos, carece de integridad referencial y dificulta auditar completitud por identificador estable.

## Decisión

Se adopta la **Opción 1**:
- Crear la entidad `SubindiceSeccion : EntidadInstitucional` almacenada en `subindices_seccion` con `Id`, `InstitucionId`, `Seccion` (`FormacionAcademica`, `ExperienciaLaboral`, `Capacitaciones`, `Referencias`), `Nombre` libre (máx. 150 caracteres, único entre activos por institución, sección y alcance), `Descripcion` opcional (máx. 500 caracteres), `TipoFuncionarioId` opcional (`null` aplica a todo el personal de la institución), `EsObligatorio`, `Orden` y `Activo` (baja lógica).
- Incorporar `SubindiceSeccionId` (`Guid?`, FK con `DeleteBehavior.Restrict`) en `TituloAcademico`, `TituloEnCurso`, `Capacitacion`, `ExperienciaLaboral` y `ReferenciaPersonal`. Los registros existentes permanecen con `SubindiceSeccionId = null` («General / Sin subíndice específico»).
- Incluir en `HojaDeVidaDto` la colección `SubindicesSeccion` con el estado calculado para la persona titular (subíndices activos aplicables más cualquier subíndice inactivo ya referenciado por sus registros para preservar trazabilidad visual en usuario y supervisor).
- Evaluar los subíndices obligatorios aplicables en secciones abiertas mediante `ReglaSubindicesSeccionObligatorios : IReglaCompletitudEnvio` y reflejarlos en el conteo de completitud por sección de `ServicioSecciones`.

## Consecuencias

- Las campañas e información histórica en producción continúan operando sin migración destructiva ni pérdida de datos.
- El administrador dispone de una pestaña unificada («Subíndices por Sección») en la configuración institucional para gestionar subíndices libres por sección y tipo de funcionario.
- El usuario visualiza tarjetas diferenciadas por subíndice dentro de cada sección habilitada y puede clasificar sus registros al crearlos o editarlos; el supervisor observa la clasificación y los faltantes en el expediente.
- `CapacitacionObligatoria` (ADR-0029) se mantiene intacta para cursos institucionales con exención automática/justificación de nuevo ingreso, coexistiendo sin conflicto con los subíndices libres de clasificación.

## ADR relacionados

- [ADR-0004](ADR-0004-multitenancia-esquema-unico.md) — Multitenancy: esquema único con `institucion_id`
- [ADR-0009](ADR-0009-campos-configurables.md) — Campos configurables por institución (permanece `Propuesto`)
- [ADR-0010](ADR-0010-hoja-de-vida-estructurada.md) — Hoja de vida estructurada y catálogos
- [ADR-0028](ADR-0028-secciones-habilitadas-por-institucion.md) — Almacenamiento de las secciones habilitadas por institución
- [ADR-0029](ADR-0029-capacitaciones-obligatorias.md) — Modelo de las capacitaciones obligatorias de la institución
