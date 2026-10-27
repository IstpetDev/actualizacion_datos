# Capacitaciones obligatorias de la institución — Tareas

**Spec:** `spec.md` versión 0.3 (aprobada 2026-10-27)  
**Plan:** `plan.md` versión 0.3  
**Estado:** Preparado para implementación, con T-04 y T-07 bloqueadas por el interruptor de spec-0010. Si la spec cambia, se rehacen plan y tareas.

Rama: `feature/92-capacitaciones-obligatorias`. Cada tarea que cambie la API regenera `openapi/v1.json` y el cliente. Todas incluyen pruebas (criterio obligatorio del issue #92). Sin datos reales.

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Puede ir en paralelo con | Dueño |
|---|---|---|---|---|
| T-00 | Todos | Aprobación de la spec | Ninguna | Coordinador |
| T-01 | RF-CAP-001, 002, 003, 005, 006, 008 | T-00 | Ninguna | Coordinador |
| T-02 | RF-CAP-001, 003, 012, 013, 015 | T-01 | Ninguna | Coordinador |
| T-03 | RF-CAP-004, 005, 006, 013, 014 | T-02 | T-04, T-05, T-06 | Por asignar |
| T-04 | RF-CAP-007, 008 | T-02 | T-03, T-05, T-06 | Por asignar |
| T-05 | RF-CAP-009, 018 | T-02 | T-03, T-04, T-06 | Por asignar |
| T-06 | RF-CAP-010, 011 | T-02 | T-03, T-04, T-05 | Por asignar |
| T-07 | RF-CAP-004, 005, 009, 018 | T-03, T-05 | T-08 | Por asignar |
| T-08 | RF-CAP-001, 002, 003, 010 | T-02, T-06 | T-07 | Por asignar |
| T-10 | RF-CAP-016 | T-02 | T-03 a T-06 | Por asignar |
| T-09 | Todos | T-01 a T-08, T-10 | Ninguna | Coordinador |

## T-00 — Registrar la aprobación de la spec

**Objetivo:** dejar la aprobación en `spec.md`, crear `test-e2e.md` y confirmar que plan y tareas siguen vigentes.  
**Área y rama:** documentación; `feature/92-capacitaciones-obligatorias`.  
**Archivos exclusivos:** `docs/specs/spec-0008/spec.md`, `plan.md`, `tasks.md`, `test-e2e.md`, `docs/specs/README.md`.  
**Dependencias:** aprobación del revisor funcional. **ADR aplicable:** Ninguno.

- [x] Registrar versión, aprobador y evidencia en «Revisión funcional».
- [x] Resolver PD-CAP-02 a 11 y ajustar requisitos.
- [x] Ajustar plan y tareas a RF-CAP-018 (vincular por ayuda), en T-03, T-05 y T-07.
- [x] Crear `test-e2e.md`.

**Resultado registrado:** aprobación, test-e2e y ajuste de plan y tareas a RF-CAP-018 hechos el 2026-10-27.  
**Bloqueos:** Ninguno.

## T-01 — Dominio, persistencia y migración

**Objetivo:** entidad `CapacitacionObligatoria` con `FechaRealizacion` y `AplicaA`, `FechaIngresoInstitucion` en `Persona` (persistida desde nómina), vínculo en `Capacitacion` y esquema migrado (ADR-0032).  
**Área y rama:** Backend; `feature/92-capacitaciones-obligatorias`.  
**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/CapacitacionObligatoria.cs`, `.../Domain/HojaDeVida/Capacitacion.cs`, `.../Infrastructure/Persistence/Configuraciones/HojaDeVida/CapacitacionObligatoriaConfiguracion.cs`, `.../Persistence/AplicacionDbContext.cs`, `.../Persistence/Migrations/*`, `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/HojaDeVidaTests.cs`.  
**Entrada/contrato:** campos del plan, sección «Diseño y contratos».  
**Salida para integración:** entidad, migración y `DbSet`.  
**Dependencias:** T-00. **ADR aplicable:** ADR-0029.

- [x] Prueba de dominio que falle: nombre vacío, horas ≤ 0, `AplicaA` con alcance nulo, con tipo coincidente y distinto, y obligatoria inactiva (y exención por nuevo ingreso ADR-0032).
- [x] Implementar entidad, vínculo y configuración EF con índice único parcial.
- [x] Generar la migración y comprobar que `capacitaciones` existentes quedan intactas.
- [x] `dotnet test src/Backend --filter "Categoria!=Integracion"`.
- [x] Revisar RF-CAP-001, 002, 003, 005, 006, 008, 019.

**Resultado registrado:** completado el 2026-10-27; 117 pruebas de dominio y 566 unitarias pasando sin errores.  
**Bloqueos:** Ninguno.

## T-02 — Contratos y configuración del admin

**Objetivo:** CRUD de obligatorias, DTO y contratos fijados; cliente regenerado.  
**Área y rama:** Backend; misma rama.  
**Archivos exclusivos:** `.../Application/Modelos/ModelosHojaDeVida.cs`, `.../Application/Servicios/IServicioConfiguracionHojaDeVida.cs`, `.../Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs`, `.../WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs`, `openapi/v1.json`, `src/Frontend/src/app/api-client/index.ts`, `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/CapacitacionesObligatoriasTests.cs`.  
**Entrada/contrato:** rutas provisionales del plan, a confirmar al inicio.  
**Salida para integración:** endpoints y cliente que consumen T-03 a T-08.  
**Dependencias:** T-01. **ADR aplicable:** ADR-0029, ADR-0004.

- [x] Pruebas que fallen: crear, editar, nombre repetido (409), tipo de funcionario de otra institución (404), desactivar conserva certificados (RF-CAP-003), rol sin permiso (RF-CAP-015), aislamiento entre instituciones (RF-CAP-013) y que crear no cambie el estado de actualizaciones enviadas o aprobadas (RF-CAP-012).
- [x] Implementar servicio y endpoints reutilizando `MapRecurso`.
- [x] Regenerar `openapi/v1.json` y el cliente.
- [x] `dotnet test src/Backend` (incluye el contrato OpenAPI).
- [x] Revisar RF-CAP-001, 003, 012, 013, 015.

**Resultado registrado:** completado el 2026-10-27; endpoints CRUD, reporte de cumplimiento con detección automática de exención por fecha de ingreso, OpenAPI y cliente Angular actualizados; 7 pruebas específicas y 573 unitarias pasando.  
**Bloqueos:** Ninguno.

## T-03 — La persona ve y sube sus obligatorias

**Objetivo:** lectura de obligatorias con estado, guardado de capacitaciones vinculadas y vínculo de una capacitación existente de la propia persona (PD-CAP-11).  
**Área y rama:** Backend; misma rama.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioHojaDeVida.cs`, `.../Application/Servicios/IServicioHojaDeVida.cs`, `.../WebApi/Endpoints/HojaDeVidaEndpoints.cs`, `src/Backend/tests/.../WebApi.Tests/HojaDeVidaTests.cs`.  
**Entrada/contrato:** `GuardarCapacitacionRequest.capacitacionObligatoriaId` y endpoint de lectura del plan.  
**Salida para integración:** endpoints y estados `pendiente`, `cargada`, `observada`.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0006, ADR-0029.

- [ ] Pruebas que fallen: ve solo las que le aplican (RF-CAP-004, 008); vincular una que no le aplica o de otra institución (404, RF-CAP-013); una segunda vinculada reemplaza (RF-CAP-006); cambiar con actualización enviada o aprobada se rechaza por la API (RF-CAP-014); archivo no admitido se rechaza.
- [ ] Pruebas que fallen del vínculo propio: la persona vincula una capacitación suya sin obligatoria; no una ya vinculada a otra, ni de otra persona o institución; con actualización enviada o aprobada se rechaza.
- [ ] Implementar lectura y vínculo en el guardado, y la lista de capacitaciones propias sin vincular.
- [ ] `dotnet test src/Backend`.
- [ ] Revisar RF-CAP-004, 005, 006, 013, 014 y el vínculo propio de RF-CAP-005.

**Resultado registrado:** pendiente  
**Bloqueos:** T-02.

## T-04 — Bloqueo del envío

**Objetivo:** regla de completitud que impide enviar con obligatorias pendientes.  
**Área y rama:** Backend; misma rama.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ValidadorCompletitudEnvio.cs`, `.../Infrastructure/RegistroDeInfraestructura.cs`, `src/Backend/tests/.../WebApi.Tests/CapacitacionesObligatoriasTests.cs` (casos de envío; coordinar con T-02).  
**Entrada/contrato:** `FaltanteEnvioDto` con sección `capacitaciones` y clave `capacitaciones.obligatoria.<id>`.  
**Salida para integración:** regla registrada en el validador.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0029.

- [ ] Pruebas que fallen: falta una que le aplica → no envía y nombra cuál; no le aplica → envía; persona sin tipo solo con las de «todas» (RF-CAP-008); con todas cumplidas envía; **las reglas actuales de RF-HDV-009 y el envío válido existente no se rompen**.
- [ ] Implementar la regla y registrarla.
- [ ] `dotnet test src/Backend`.
- [ ] Revisar RF-CAP-007, 008.

**Resultado registrado:** pendiente  
**Bloqueos:** T-02.

## T-05 — Revisión del supervisor

**Objetivo:** cumplimiento visible en la revisión, marcas sobre obligatorias y vínculo por ayuda de un `supervisor` o `admin` (RF-CAP-018).  
**Área y rama:** Backend; misma rama.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioRevision.cs`, `.../Application/Modelos/ModelosRevision.cs`, `.../WebApi/Endpoints/FlujoActualizacionEndpoints.cs`, `src/Backend/tests/.../WebApi.Tests/MarcasPorItemTests.cs`, `src/Backend/tests/.../WebApi.Tests/VinculoPorAyudaTests.cs`.  
**Entrada/contrato:** clave de ítem de la `Capacitacion` vinculada; clave estable `capacitaciones.obligatoria.<id>` para la pendiente.  
**Salida para integración:** DTO de revisión ampliado.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0008.

- [ ] Pruebas que fallen: la revisión lista cada obligatoria que aplica con estado; marcar una vinculada y una pendiente; devolver sin observación general se rechaza (RF-FLU-003); un supervisor de otra institución no ve nada (RF-CAP-013).
- [ ] Pruebas del vínculo por ayuda que fallen: un `supervisor` y un `admin` vinculan una capacitación existente de la persona a una obligatoria pendiente y la persona la ve como cargada; solo vincula (no cambia otros datos); con actualización aprobada 409; con la capacitación de otra persona o ya vinculada 409; persona de otra institución 404; un `usuario` no puede usar la operación; queda en la auditoría con quién la hizo y sin contenido personal.
- [ ] Implementar.
- [ ] `dotnet test src/Backend`.
- [ ] Revisar RF-CAP-009 y 018.

**Resultado registrado:** pendiente  
**Bloqueos:** T-02.

## T-06 — Cumplimiento y exportación

**Objetivo:** resumen para el admin y columnas/hoja en el Excel.  
**Área y rama:** Backend; misma rama.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioExportacion.cs`, `src/Backend/tests/.../WebApi.Tests/ExportacionesTests.cs`; el endpoint de cumplimiento va en `ServicioConfiguracionHojaDeVida.cs` (coordinar con T-02, que ya lo dejó fijado).  
**Entrada/contrato:** DTO de cumplimiento del plan.  
**Salida para integración:** endpoint y Excel.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0029.

- [ ] Pruebas que fallen: totales cargada, aprobada y pendiente por capacitación; lista de pendientes; solo la propia institución (RF-CAP-013); el Excel trae el estado por persona; el `.zip` conserva certificados por sección.
- [ ] Implementar.
- [ ] `dotnet test src/Backend`.
- [ ] Revisar RF-CAP-010, 011.

**Resultado registrado:** pendiente  
**Bloqueos:** T-02.

## T-07 — Pantallas de la persona y del supervisor

**Objetivo:** bloque «Obligatorias de la institución» con «Usar una que ya tengo», y cumplimiento en la revisión con la acción de vincular por ayuda.  
**Área y rama:** Frontend; misma rama.  
**Archivos exclusivos:** `src/Frontend/src/app/features/usuario/hoja-de-vida/secciones/capacitaciones/capacitaciones.component.ts` y `.spec.ts`; `.../usuario/hoja-de-vida/servicios/hoja-de-vida-state.service.ts`; `src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts` y `.spec.ts`.  
**Entrada/contrato:** cliente regenerado en T-02, T-03 y T-05.  
**Salida para integración:** componentes.  
**Dependencias:** T-03, T-05. **ADR aplicable:** ADR-0029.

- [ ] Pruebas Vitest que fallen: muestra solo las que aplican con su estado; subir y reemplazar; mensaje claro al faltar al enviar; «Usar una que ya tengo» lista solo capacitaciones propias sin vincular; el supervisor ve el estado, puede marcar y vincular por ayuda con confirmación; con la actualización aprobada la acción no aparece.
- [ ] Implementar con el manejo de errores accesible existente.
- [ ] `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.
- [ ] Revisar RF-CAP-004, 005, 009, 018.

**Resultado registrado:** pendiente  
**Bloqueos:** T-03, T-05.

## T-08 — Pantalla de configuración del admin

**Objetivo:** alta, edición, desactivación y resumen de cumplimiento en una sección acotada de Configuración de requisitos.  
**Área y rama:** Frontend; misma rama.  
**Archivos exclusivos:** `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts` y `.spec.ts`, o un componente hijo nuevo en la misma carpeta si el archivo ya es grande.  
**Entrada/contrato:** cliente regenerado en T-02 y T-06.  
**Salida para integración:** componente.  
**Dependencias:** T-02, T-06. **ADR aplicable:** ADR-0029.

- [ ] Pruebas Vitest que fallen: crear con alcance «todas» y por tipo; nombre repetido muestra el error; desactivar; el resumen lista pendientes.
- [ ] Implementar; comprobar el estado del issue #83 antes de empezar para evitar conflicto.
- [ ] `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.
- [ ] Revisar RF-CAP-001, 002, 003, 010.

**Resultado registrado:** pendiente  
**Bloqueos:** T-02, T-06.

## T-10 — El admin ve los borradores incompletos al vencer la campaña

**Objetivo:** consulta y exportación de solo lectura de borradores de su institución, marcados como incompletos y auditados.  
**Área y rama:** Backend (y la lista del admin en Frontend); misma rama.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioRevision.cs`, `.../Infrastructure/Servicios/ServicioExportacion.cs`, `.../WebApi/Endpoints/FlujoActualizacionEndpoints.cs`, `src/Backend/tests/.../WebApi.Tests/FlujoRevisionTests.cs`; coordinar con T-05 y T-06 que tocan los mismos servicios.  
**Entrada/contrato:** RF-CAP-016, PD-CAP-10 opción 1.  
**Salida para integración:** endpoint y Excel con la marca.  
**Dependencias:** T-02. **ADR aplicable:** probablemente nuevo si cambia la política de visibilidad de borradores (RF-FLU-006); decidir antes de empezar.

- [ ] Pruebas que fallen: tras el fin de la campaña el `admin` ve el borrador de su institución con la marca; el `supervisor` no; otra institución no; cada lectura queda en auditoría sin contenido; antes del fin de la campaña no se ve.
- [ ] Implementar.
- [ ] `dotnet test src/Backend`.
- [ ] Revisar RF-CAP-016.

**Resultado registrado:** pendiente  
**Bloqueos:** T-02; posible ADR.

## T-09 — Verificación integral y PR

**Objetivo:** todo el comportamiento verificado y el PR listo.  
**Área y rama:** ambas; misma rama.  
**Archivos exclusivos:** `docs/specs/spec-0008/test-e2e.md` (resultados), `docs/specs/spec-0008/tasks.md`.  
**Dependencias:** T-01 a T-08. **ADR aplicable:** Ninguno nuevo.

- [ ] `dotnet build src/Backend` y `dotnet test src/Backend` (con Docker para la integración).
- [ ] `pnpm --dir src/Frontend test:ci`, `lint`, `format:check`.
- [ ] `openapi/v1.json` y cliente al día (job «Cliente OpenAPI al día»).
- [ ] Ejecutar los cinco escenarios de `test-e2e.md` con datos ficticios y registrar resultados.
- [ ] Abrir PR a `develop` con título `feat: capacitaciones obligatorias de la institución` y la salida real de las pruebas.

**Resultado registrado:** pendiente  
**Bloqueos:** T-01 a T-08.

## Integración y cierre

- [ ] El coordinador revisó cada diff y comprobó la evidencia de cada tarea.
- [ ] Se resolvieron dependencias y conflictos sin cambiar la spec aprobada.
- [ ] Se ejecutaron las pruebas de backend y frontend.
- [ ] Se ejecutó `test-e2e.md` y se registraron resultados por escenario.
- [ ] El cambio se integra mediante PR a `develop`.
- [ ] Solo los requisitos con evidencia integrada y prueba satisfactoria pasan a `Implementado`.
