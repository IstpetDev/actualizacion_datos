# Subíndices libres configurables por sección — Plan de implementación

**Spec aprobado:** `spec.md` versión 0.1 (aprobación explícita del solicitante, 2026-11-05)  
**Objetivo:** Permitir al administrador configurar subíndices libres por sección (`formacion`, `experiencia`, `capacitaciones`, `referencias`) y por tipo de funcionario, habilitar la carga diferenciada del usuario sin afectar registros previos, validar obligatoriedad al enviar y mostrar la clasificación al supervisor.  
**Áreas:** `src/Backend` y `src/Frontend`  
**Tecnologías:** .NET 10, EF Core 10 + PostgreSQL, NSwag OpenAPI, Angular 22, xUnit, Vitest

## Correspondencia con el spec

| Requisito o escenario | Decisión de diseño | Archivo (ruta desde la raíz) | Tarea | Verificación |
|---|---|---|---|---|
| RF-SUB-001, RF-SUB-002, RF-SUB-003 (Escenario 1) | Entidad `SubindiceSeccion`, configuración EF Core, CRUD en `ServicioConfiguracionHojaDeVida` y endpoint `/api/configuracion/subindices`. | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/SubindiceSeccion.cs`, `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs`, `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs` | T-01, T-02 | Unitarias de dominio + integración WebApi |
| RF-SUB-004, RF-SUB-005 (Escenario 2) | Propiedad `SubindiceSeccionId` en registros multi-ítem, validación y mapeo en `ServicioHojaDeVida` y resumen `SubindicesSeccion` en `HojaDeVidaDto`. | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/*.cs`, `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioHojaDeVida.cs` | T-01, T-02 | Unitarias + integración de hoja de vida |
| RF-SUB-006 (Escenario 2) | `ReglaSubindicesSeccionObligatorios` en `ValidadorCompletitudEnvio` y cruce de completitud en `ServicioSecciones`. | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs`, `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioSecciones.cs` | T-02 | Unitarias + integración de envío |
| Escenario 1 (UI Admin) | Componente standalone `SubindicesSeccionConfigComponent` integrado como pestaña 7 en `ConfiguracionRequisitosComponent`. | `src/Frontend/src/app/features/admin/configuracion/subindices-seccion-config.component.ts`, `configuracion-requisitos.component.ts` | T-03 | Pruebas unitarias Vitest + build Angular |
| RF-SUB-004, RF-SUB-005, RF-SUB-007 (UI Usuario y Supervisor, Escenarios 2 y 3) | Tarjetas de subíndices aplicables y selector en formularios de `formacion-academica`, `experiencia-laboral`, `capacitaciones` y `referencias`; insignias y pendientes en `expediente-secciones`. | `src/Frontend/src/app/features/usuario/hoja-de-vida/**`, `src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts` | T-04 | Pruebas unitarias Vitest + E2E API |

## Diseño y contratos

1. **Dominio (`Domain`):**
   - `SubindiceSeccion : EntidadInstitucional`: `Id`, `Seccion` (`SeccionHojaDeVida`, restringido a `FormacionAcademica`, `ExperienciaLaboral`, `Capacitaciones`, `Referencias`), `Nombre` (1..150), `Descripcion` (<= 500), `TipoFuncionarioId` (`Guid?`), `EsObligatorio` (`bool`), `Orden` (`int`), `Activo` (`bool`). Métodos `AplicaA(Guid? tipoFuncionarioId)`, `Actualizar(...)`, `Desactivar()` y `EsSeccionSoportada(SeccionHojaDeVida)`.
   - `TituloAcademico`, `TituloEnCurso`, `Capacitacion`, `ExperienciaLaboral`, `ReferenciaPersonal`: propiedad `Guid? SubindiceSeccionId { get; private set; }` y método `AsociarSubindice(Guid? subindiceSeccionId, DateTime? fechaUtc = null)` (o en `RegistroHojaDeVida` / entidades correspondientes; se coloca explícitamente en las cinco entidades soportadas para no añadir columna innecesaria a `documentos_personales`).
2. **Contratos (`Application`):**
   - `GuardarSubindiceSeccionRequest(string Seccion, string Nombre, string? Descripcion = null, Guid? TipoFuncionarioId = null, bool EsObligatorio = true, int Orden = 0, bool Activo = true)`
   - `SubindiceSeccionDto(Guid Id, string Seccion, string Nombre, string? Descripcion, Guid? TipoFuncionarioId, bool EsObligatorio, int Orden, bool Activo)`
   - `EstadoSubindiceSeccionPersonaDto(Guid Id, string Seccion, string Nombre, string? Descripcion, Guid? TipoFuncionarioId, bool EsObligatorio, int Orden, bool Activo, string Estado)` (`Estado`: `"cargado"` | `"pendiente"`)
   - Parámetro opcional `Guid? SubindiceSeccionId = null` al final de `GuardarTituloAcademicoRequest`, `TituloAcademicoDto`, `GuardarTituloEnCursoRequest`, `TituloEnCursoDto`, `GuardarCapacitacionRequest`, `CapacitacionDto`, `GuardarExperienciaLaboralRequest`, `ExperienciaLaboralDto`, `GuardarReferenciaRequest`, `ReferenciaDto`.
   - Parámetro opcional `List<EstadoSubindiceSeccionPersonaDto>? SubindicesSeccion = null` al final de `HojaDeVidaDto`.
3. **Endpoints (`WebApi`):**
   - Reutilización directa de `MapRecurso<GuardarSubindiceSeccionRequest, SubindiceSeccionDto>` sobre `/api/configuracion/subindices` (`ListarSubindicesSeccion`, `CrearSubindiceSeccion`, `ActualizarSubindiceSeccion`, `EliminarSubindiceSeccion`).

## ADR aplicables y por redactar

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| Aislamiento por `institucion_id` | `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Vigente | T-01, T-02 |
| Cliente OpenAPI generado con NSwag | `docs/decisiones/ADR-0003-cliente-openapi-generado.md` | Vigente | T-02, T-03, T-04 |
| Secciones abiertas por institución | `docs/decisiones/ADR-0028-secciones-habilitadas-por-institucion.md` | Vigente | T-02 |
| Subíndices libres configurables por sección | `docs/decisiones/ADR-0043-subindices-configurables-por-seccion.md` | Vigente por pedido explícito #171 | T-01, T-02, T-03, T-04 |

## Mapa de archivos

| Área | Crear o modificar | Responsabilidad | Depende de |
|---|---|---|---|
| Backend Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/SubindiceSeccion.cs` | Reglas e invariantes de subíndice libre por sección | ADR-0043 |
| Backend Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/{TituloAcademico,TituloEnCurso,Capacitacion,ExperienciaLaboral,ReferenciaPersonal}.cs` | Propiedad `SubindiceSeccionId` y `AsociarSubindice` | T-01 |
| Backend Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosHojaDeVida.cs`, `Servicios/IServicioConfiguracionHojaDeVida.cs` | DTOs y contratos del servicio | T-01 |
| Backend Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/AplicacionDbContext.cs`, `Configuraciones/HojaDeVida/{SubindiceSeccionConfiguracion,SeccionesHojaDeVidaConfiguracion}.cs`, `Migrations/*` | Persistencia PostgreSQL y migración EF Core | T-01 |
| Backend Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/{ServicioConfiguracionHojaDeVida,ServicioHojaDeVida,ValidadorCompletitudEnvio,ServicioSecciones}.cs`, `RegistroDeInfraestructura.cs` | CRUD admin, vínculo en ítems, completitud al enviar y avance de secciones | T-01 |
| Backend WebApi + OpenAPI | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs`, `openapi/v1.json`, `src/Frontend/src/app/api-client/*` | Rutas HTTP y regeneración NSwag | T-02 |
| Backend Tests | `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/**`, `WebApi.Tests/**` | Pruebas unitarias y de integración con Testcontainers | T-01, T-02 |
| Frontend Admin | `src/Frontend/src/app/features/admin/configuracion/subindices-seccion-config.component.ts` (+ `.spec.ts`), `configuracion-requisitos.component.ts` | Gestión administrativa de subíndices libres | T-02 |
| Frontend Usuario y Supervisor | `src/Frontend/src/app/features/usuario/hoja-de-vida/**`, `src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts` | Tarjetas de subíndices, selector en formularios y vista de revisión | T-02 |

## Datos y migración

- Nueva tabla `subindices_seccion` (`id`, `institucion_id`, `seccion`, `nombre`, `descripcion`, `tipo_funcionario_id`, `es_obligatorio`, `orden`, `activo`), con índice único filtrado `ix_subindices_seccion_institucion_seccion_alcance_nombre_activo` y FKs a `instituciones` (`RESTRICT`) y `tipos_funcionario` (`SET NULL`).
- Nueva columna anulable `subindice_seccion_id uuid NULL` con FK a `subindices_seccion(id)` (`ON DELETE RESTRICT`) e índice en `titulos_academicos`, `titulos_en_curso`, `capacitaciones`, `experiencias_laborales` y `referencias_personales`.
- 100 % compatible hacia atrás: las filas existentes quedan con `NULL` sin reescritura de datos ni bloqueo prolongado.

## Orden de ejecución e integración

1. **T-01:** Dominio y contratos en `Domain` y `Application` + pruebas unitarias de dominio.
2. **T-02:** Persistencia EF Core, migración, servicios de infraestructura, endpoint WebApi, regeneración de `openapi/v1.json` + `api-client` y pruebas de integración.
3. **T-03 y T-04:** Componentes Angular de administración, usuario y supervisor + pruebas Vitest y verificación de presupuesto de estilos en build de producción.

## Riesgos y decisiones pendientes

| Riesgo o punto abierto | Efecto | Acción y responsable |
|---|---|---|
| Presupuesto de estilos CSS en Angular (`maximumWarning: 6kB`, `maximumError: 12kB`) | `configuracion-requisitos.component.ts` ya es extenso; añadir estilos allí podría exceder el límite. | Aislar la pestaña en `SubindicesSeccionConfigComponent` y un subcomponente liviano compartido para el bloque de subíndices del usuario (< 3 kB CSS). |
| Subíndice desactivado después de que un usuario ya cargó un ítem | El ítem perdería su etiqueta visible si solo se consultaran activos. | Incluir en `HojaDeVidaDto.SubindicesSeccion` tanto los activos aplicables como los inactivos referenciados por ítems de la persona (con `Activo = false`). |

## Comprobación del plan

- [x] Las rutas y tecnologías coinciden con el código actual de `src/Backend` y `src/Frontend`.
- [x] Los ADR vigentes se respetan y `ADR-0043` está registrado antes de implementar.
- [x] Cada requisito del spec está cubierto por tareas y verificaciones concretas.
- [x] Las tareas tienen dependencias y límites de edición claros.
- [x] Las pruebas de unidad, integración y E2E verifican comportamientos distintos y necesarios.
