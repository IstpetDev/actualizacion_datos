# Capacitaciones obligatorias de la institución — Plan de implementación

**Spec:** `spec.md` versión 0.2, **sin aprobar**. Este plan se adelantó sobre la v0.1 y se actualizó a la v0.2 por indicación de quien desarrolla (2026-10-27); si la revisión funcional cambia el alcance, se rehace antes de ejecutar tareas.  
**Objetivo:** el `admin` configura capacitaciones obligatorias; la persona las ve y sube su certificado; el envío se bloquea si falta una que le aplica; supervisor y admin ven el cumplimiento y se exporta.  
**Áreas:** `src/Backend` y `src/Frontend`  
**Tecnologías:** .NET 10 con Clean Architecture y EF Core con PostgreSQL, xUnit; Angular 22 con Vitest; cliente OpenAPI con NSwag (`openapi/v1.json`).

## Correspondencia con el spec

| Requisito o escenario | Decisión de diseño | Archivo (desde la raíz) | Tarea | Verificación |
|---|---|---|---|---|
| RF-CAP-001, 003, 015 | Entidad `CapacitacionObligatoria` por institución; CRUD en el grupo de configuración, solo `admin`/`superadmin`; baja lógica (`Activo`). | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/CapacitacionObligatoria.cs`, `.../Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs`, `.../WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs` | T-01, T-02 | Pruebas de dominio y WebApi (V-01, V-02) |
| RF-CAP-002, 008 | `AplicaA(tipoFuncionarioId)` igual que `RequisitoDocumento`: alcance nulo = todas; persona sin tipo solo recibe las de «todas». | `.../Domain/HojaDeVida/CapacitacionObligatoria.cs` | T-01 | V-01 |
| RF-CAP-004 | Endpoint de lectura del estado de las obligatorias que le aplican a la persona; bloque en la sección. | `.../Infrastructure/Servicios/ServicioHojaDeVida.cs`, `src/Frontend/src/app/features/usuario/hoja-de-vida/secciones/capacitaciones/capacitaciones.component.ts` | T-03, T-07 | V-02, V-06 |
| RF-CAP-005, 006 | `Capacitacion.CapacitacionObligatoriaId` (nulo = libre). Guardar con ese id reemplaza la anterior vinculada; el certificado usa el respaldo de ADR-0006 existente. | `.../Domain/HojaDeVida/Capacitacion.cs`, `.../Infrastructure/Servicios/ServicioHojaDeVida.cs` | T-01, T-03 | V-01, V-02 |
| RF-CAP-007, 014 | Nueva `IReglaCompletitudEnvio` que lista las faltantes; el bloqueo de edición tras enviar ya cubre la API (`AsegurarEdicionPermitida`). | `.../Infrastructure/Servicios/ValidadorCompletitudEnvio.cs`, `.../Infrastructure/RegistroDeInfraestructura.cs` | T-04 | V-03 |
| RF-CAP-009 | La revisión del supervisor incluye el estado de cada obligatoria; la marca usa la clave de ítem de la `Capacitacion` vinculada (RF-HDV-011); una obligatoria pendiente se marca con una clave estable de la obligatoria. | `.../Infrastructure/Servicios/ServicioRevision.cs`, `src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts` | T-05, T-07 | V-04 |
| RF-CAP-010 | Consulta de cumplimiento por capacitación y lista de pendientes, filtrada por institución. | `.../Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs`, `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts` | T-06, T-08 | V-05 |
| RF-CAP-011 | Hoja nueva y columnas en el Excel; el `.zip` ya incluye certificados por sección. | `.../Infrastructure/Servicios/ServicioExportacion.cs` | T-06 | V-05 |
| RF-CAP-012 | No se toca el estado de ninguna actualización al crear o activar una obligatoria; el cumplimiento se calcula al leer. | `.../Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs` | T-02 | V-02 |
| RF-CAP-013 | Filtro por institución (ADR-0004) y verificación en cada consulta por id. | Todos los servicios anteriores | T-02 a T-06 | V-02 |
| RF-CAP-016 | Consulta de solo lectura para el `admin` de actualizaciones en borrador de su institución, con marca «incompleto, no enviado», incluida en la exportación; cada lectura se audita. Requiere un permiso nuevo distinto del de la revisión del supervisor. | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioRevision.cs`, `.../Servicios/ServicioExportacion.cs`, `.../Application/Servicios/IServicioAuditoria.cs` | T-10 | V-08 |
| RF-CAP-017 | La regla de completitud y el bloque de la persona consultan si la sección «Capacitaciones» está abierta (spec-0010); si está cerrada, no exigen ni muestran. | `.../Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | T-04, T-07 | V-03 |
| Escenarios 1 a 5 | Recorrido de punta a punta. | `docs/specs/spec-0008/test-e2e.md` (pendiente de aprobación de la spec) | T-09 | V-07 |

Excepciones: ningún requisito queda sin tarea. `test-e2e.md` no se crea todavía (la guía de specs lo reserva a la aprobación).

## Diseño y contratos

**Dominio.** `CapacitacionObligatoria : EntidadInstitucional` con `Id`, `Nombre`, `InstitucionOrganizadora`, `HorasEsperadas?`, `TipoFuncionarioId?` (nulo = todas), `Activo`, `Orden`. Nombre único entre activas por institución. `Capacitacion` gana `CapacitacionObligatoriaId?`.

**Persistencia.** Tabla `capacitaciones_obligatorias` (índice único parcial por institución y nombre normalizado entre activas); columna nullable `capacitacion_obligatoria_id` en `capacitaciones` con FK y restricción de no borrar en cascada.

**API (nombres provisionales, a fijar en T-02).**
- `GET/POST/PUT/DELETE /api/configuracion/capacitaciones-obligatorias`: CRUD del `admin`, como `RequisitosDocumento` (se reutiliza `MapRecurso`).
- `GET /api/mis-datos/capacitaciones-obligatorias`: las que le aplican a la persona con `estado` (`pendiente`, `cargada`, `observada`).
- `GET /api/configuracion/capacitaciones-obligatorias/cumplimiento`: totales y pendientes por capacitación (solo `admin`).
- `GuardarCapacitacionRequest` gana `capacitacionObligatoriaId` opcional. Si se envía, debe ser una obligatoria activa de su institución que le aplica.

**Estados.** `pendiente` = sin `Capacitacion` vinculada; `cargada` = vinculada con respaldo; `observada` = vinculada y marcada por el supervisor en la última devolución. Se calculan al leer, no se guardan.

**Errores.** Obligatoria inexistente, de otra institución o que no le aplica: 404 (no revela existencia). Nombre repetido: 409 con mensaje. Envío incompleto: la estructura `FaltanteEnvioDto` existente, con sección `capacitaciones` y clave `capacitaciones.obligatoria.<id>`.

**Permisos.** Configurar: `admin`, `superadmin`. Leer las propias: `usuario`. Ver cumplimiento: `admin`. El supervisor las ve dentro de la revisión.

## ADR aplicables y por redactar

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| Modelo de capacitaciones obligatorias (opción B) | `docs/decisiones/ADR-0026-capacitaciones-obligatorias.md` | Vigente | T-01 a T-08 |
| Aislamiento por institución | `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Vigente | T-01 a T-06 |
| Archivos de respaldo | `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Vigente | T-03 |
| Marcas por ítem | `docs/decisiones/ADR-0008-granularidad-del-rechazo.md` | Vigente | T-05 |
| Campos configurables | `docs/decisiones/ADR-0009-campos-configurables.md` | Propuesto, no se cierra | Ninguna |

No hace falta ADR adicional salvo que PD-CAP-02 (cargo) o PD-CAP-04 (campaña) se resuelvan a favor de agregar cargo o vincular campañas: en ese caso se redacta uno antes de las tareas afectadas (T-01, T-02).

## Mapa de archivos

| Área | Crear o modificar | Responsabilidad | Depende de |
|---|---|---|---|
| Backend Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/CapacitacionObligatoria.cs` (crear) | Entidad y `AplicaA` | ADR-0026 |
| Backend Domain | `.../Domain/HojaDeVida/Capacitacion.cs` | Vínculo opcional | Entidad |
| Backend Infra | `.../Infrastructure/Persistence/Configuraciones/HojaDeVida/CapacitacionObligatoriaConfiguracion.cs` (crear), `.../Persistence/AplicacionDbContext.cs`, `.../Persistence/Migrations/*` (nueva) | Mapeo, índices, migración | Entidad |
| Backend Application | `.../Application/Modelos/ModelosHojaDeVida.cs`, `.../Application/Servicios/IServicioConfiguracionHojaDeVida.cs`, `.../IServicioHojaDeVida.cs` | DTO y contratos | Entidad |
| Backend Infra | `.../Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs`, `ServicioHojaDeVida.cs`, `ValidadorCompletitudEnvio.cs`, `ServicioRevision.cs`, `ServicioExportacion.cs`, `RegistroDeInfraestructura.cs` | Reglas de negocio | Contratos |
| Backend WebApi | `.../WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs`, `HojaDeVidaEndpoints.cs` | Endpoints | Servicios |
| Contrato | `openapi/v1.json`, `src/Frontend/src/app/api-client/index.ts` | Regenerados | Endpoints |
| Frontend admin | `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts` y su spec | Alta/edición y cumplimiento | Cliente |
| Frontend usuario | `src/Frontend/src/app/features/usuario/hoja-de-vida/secciones/capacitaciones/capacitaciones.component.ts` y su spec; `.../servicios/hoja-de-vida-state.service.ts` | Bloque de obligatorias | Cliente |
| Frontend supervisor | `src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts` y su spec | Cumplimiento y marcas | Cliente |
| Pruebas Backend | `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/HojaDeVidaTests.cs`, `.../WebApi.Tests/CapacitacionesObligatoriasTests.cs` (crear), `.../WebApi.Tests/Integracion/CapacitacionesObligatoriasIntegracionTests.cs` (crear) | Unitarias e integración (Postgres/Docker) | Cada tarea |

## Datos y migración

Una migración nueva: tabla `capacitaciones_obligatorias` y columna nullable en `capacitaciones`. Compatible con los datos existentes: las capacitaciones actuales quedan sin obligatoria y no cambian. No hay semillas. Se escribe en base de datos al guardar la obligatoria o la capacitación (un `SaveChangesAsync` por operación, como el resto de servicios). Despliegue: la migración se aplica con el flujo por etapas de ADR-0015; la tabla vacía no cambia el comportamiento de envío hasta que el `admin` cree una obligatoria.

## Orden de ejecución e integración

1. T-01 (dominio y migración) fija el esquema y es el único dueño de la migración y de `AplicacionDbContext.cs`.
2. T-02 a T-06 (backend) dependen de T-01 y entre sí por contrato: T-02 fija DTO y rutas; T-03, T-04, T-05 y T-06 tocan archivos distintos y pueden ir en paralelo después de T-02, salvo `ServicioHojaDeVida.cs` (solo T-03) y `ServicioRevision.cs` (solo T-05).
3. T-07 y T-08 (frontend) arrancan tras regenerar el cliente (T-02) y pueden ir en paralelo; cada una usa componentes distintos.
4. T-09 (cliente, suites, formato, lint y E2E) la ejecuta el coordinador al final.

## Riesgos y decisiones pendientes

| Riesgo o punto abierto | Efecto | Acción y responsable |
|---|---|---|
| Aprobación de la v0.1 pendiente | Rehacer plan y tareas | Revisor funcional (PR #98) |
| PD-CAP-02: cargo | Requeriría persistir el cargo y cambiar la carga de nómina | Revisor funcional; ADR nuevo si se pide |
| PD-CAP-04: campaña | Vincular a campaña cambia el modelo | Revisor funcional |
| Capacitación equivalente subida antes de crear la obligatoria | La persona la tendría que subir de nuevo o vincular | Punto abierto: decidir si se permite vincular una existente (nueva PD en la spec) |
| `develop` avanza (PR #94 y #87 abiertos) | Conflictos en `ServicioHojaDeVida.cs` y en el cliente | Rebase frecuente; regenerar cliente al final |
| spec-0010 (secciones por fases) aún sin aprobar | T-04 y T-07 dependen del interruptor; sin él, "Capacitaciones" quedaría siempre abierta | Implementar spec-0010 primero; hasta entonces T-04 y T-07 no se ejecutan | Revisor funcional |
| Pantalla de admin en reorganización (#83) | Conflicto en `configuracion-requisitos.component.ts` | Mantener la sección acotada y comprobar #83 antes de T-08 |

## Comprobación del plan

- [x] Las rutas y tecnologías se verificaron contra el árbol actual (`ConfiguracionHojaDeVidaEndpoints.cs`, `ServicioHojaDeVida.cs`, `ValidadorCompletitudEnvio.cs`, componentes de `features/`).
- [x] ADR-0026 está Vigente; los demás se respetan.
- [x] Cada requisito de la v0.1 tiene tarea.
- [x] Las tareas tienen dependencias y límites de edición.
- [ ] Revisar con quien desarrolla los nombres de endpoints (provisionales) antes de T-02.
- [ ] Spec aprobada: pendiente.
