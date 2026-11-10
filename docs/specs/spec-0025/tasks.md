# Acta PDF y firma física — Tareas

**Spec aprobado:** [spec.md](spec.md) v0.2, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md) y [puertas E0 resueltas en #189](../../evidencia/issue-189/README.md).

**Plan:** [plan.md](plan.md) v1.0. **Estado:** puertas E0 (`T-ACT-00` y ADR-0046) resueltas en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) y contratos congelados; tareas `T-ACT-01` (#193), `T-ACT-02` (#194) y `T-ACT-03` (#195) listas para implementación secuencial tras #190–#192.

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Paralelismo | Dueño funcional/técnico |
|---|---|---|---|---|
| T-ACT-00 | Todos los requisitos del área | Completada en #189 (E0: decisiones registradas y contratos congelados) | Ninguno sobre archivos compartidos | `@bryancito1090`; TH/Jurídico |
| T-ACT-01 | RF-VAC-ACT-001 RF-VAC-ACT-002 RF-VAC-ACT-007 RF-VAC-ACT-009 | T-ACT-00 (completada en #189); T-SAL-01 (#192) y ADR-0046 vigente | Secuencial | Responsable técnico de E4 (#193) |
| T-ACT-02 | RF-VAC-ACT-004 RF-VAC-ACT-005 RF-VAC-ACT-006 RF-VAC-ACT-008 RF-VAC-ACT-009 RF-VAC-ACT-010 | T-ACT-00 (completada en #189); T-ACT-01 (#193) | Secuencial | Responsable técnico de E5 (#194) |
| T-ACT-03 | RF-VAC-ACT-001 RF-VAC-ACT-002 RF-VAC-ACT-003 RF-VAC-ACT-004 RF-VAC-ACT-005 RF-VAC-ACT-006 RF-VAC-ACT-007 RF-VAC-ACT-008 RF-VAC-ACT-009 RF-VAC-ACT-010 | T-ACT-00 (completada en #189); T-ACT-01 (#193), T-ACT-02 (#194) y API/contratos generados | Secuencial | Responsable técnico de E6 (#195) |

## T-ACT-00 — Condiciones previas

**Estado:** Completada en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) (E0); referencia en [backlog](../../evidencia/issue-182/backlog.md) y [evidencia #189](../../evidencia/issue-189/README.md). **Responsable:** `@bryancito1090` y autoridad/TH/Jurídico.

Se resolvieron PD-ACT-01/02/03/04/05/06/07/08, se aprobó [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) (Opción 1, estado `Vigente` para Modo A) y se congelaron los contratos en [plan.md](plan.md#diseño-y-contratos). Se exige doble firma manuscrita, verificación por operador autorizado distinto de la persona trabajadora titular con método y respaldo trazable (archivo privado `PDF`/`JPG`/`PNG` <= 10 MB, referencia física verificable o excepción motivada autorizada), numeración correlativa anual por institución sin reutilizar anulados, retención histórica permanente y escritura consistente BD + `IAlmacenArchivos` con SHA-256.

- [x] Registrar decisión expresa sobre ADR-0046 (Opción 1, `Vigente` para Modo A).
- [x] Confirmar firmas requeridas, método de verificación, respaldo/referencia física/excepción autorizada, numeración, retención/acceso histórico y recuperación base/archivos en `spec.md` v0.2 y `docs/evidencia/issue-189/README.md`.
- [x] Congelar contratos propuestos en `plan.md` v1.0 antes de implementar consumidores (#193, #194, #195).

## T-ACT-01 — Emitir PDF inmutable por versión

**Backlog:** E4 ([#193](https://github.com/IstpetDev/actualizacion_datos/issues/193)), enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Lista para ejecución tras E3 (#192) — puertas E0 y ADR-0046 resueltas en #189. **Responsable:** desarrollador asignado a #193; integrador técnico valida entrega.

**Área y rama:** Backend; rama futura `feature/193-vacaciones-act-01` desde develop actualizado.

**Entrada/contrato:** T-SAL-01 (#192), contenido/numeración/custodia definidos y ADR-0046 vigente (#189). DTO y errores congelados en [plan.md](plan.md#diseño-y-contratos). **Requisitos:** RF-VAC-ACT-001 RF-VAC-ACT-002 RF-VAC-ACT-007 RF-VAC-ACT-009.

**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/ActaVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VersionActaVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VerificacionFirmaFisica.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosActaVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioActasVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Documentos/IServicioGeneracionPdfActaVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Documentos/GeneradorPdfActaVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/ActaVacacionesConfiguracion.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/VerificacionFirmaFisicaConfiguracion.cs`; `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/ActasVacacionesEndpoints.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/ActaVacacionesTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/ActasVacacionesTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/GeneradorPdfActaVacacionesTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/ActasVacacionesIntegracionTests.cs`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.ActasVacacionesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/actas-vacaciones.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-ACT-02 — Verificar, observar y corregir con historia

**Backlog:** E5 ([#194](https://github.com/IstpetDev/actualizacion_datos/issues/194)), enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Lista para ejecución tras `T-ACT-01` (#193) — puertas E0 y ADR-0046 resueltas en #189. **Responsable:** desarrollador asignado a #194; integrador técnico valida entrega.

**Área y rama:** Backend; rama futura `feature/194-vacaciones-act-02` desde develop actualizado.

**Entrada/contrato:** T-ACT-01 (#193), método/evidencia/autoridades aprobados en #189. DTO y errores congelados en [plan.md](plan.md#diseño-y-contratos). **Requisitos:** RF-VAC-ACT-004 RF-VAC-ACT-005 RF-VAC-ACT-006 RF-VAC-ACT-008 RF-VAC-ACT-009 RF-VAC-ACT-010.

**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VerificacionFirmaFisica.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioActasVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/VerificacionFirmaFisicaConfiguracion.cs`; `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/ActasVacacionesEndpoints.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/ActasVacacionesTests.cs`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.ActasVacacionesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/actas-vacaciones.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-ACT-03 — Recorrido de trabajador y operador con evidencia E2E

**Backlog:** E6 ([#195](https://github.com/IstpetDev/actualizacion_datos/issues/195)), enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Lista para ejecución tras `T-ACT-01` (#193) y `T-ACT-02` (#194) — puertas E0 y ADR-0046 resueltas en #189. **Responsable:** desarrollador asignado a #195; integrador técnico valida entrega.

**Área y rama:** Frontend; rama futura `feature/195-vacaciones-act-03` desde develop actualizado.

**Entrada/contrato:** T-ACT-01 (#193), T-ACT-02 (#194) y todas las API/contratos generados. DTO y errores congelados en [plan.md](plan.md#diseño-y-contratos). **Requisitos:** RF-VAC-ACT-001 RF-VAC-ACT-002 RF-VAC-ACT-003 RF-VAC-ACT-004 RF-VAC-ACT-005 RF-VAC-ACT-006 RF-VAC-ACT-007 RF-VAC-ACT-008 RF-VAC-ACT-009 RF-VAC-ACT-010.

**Archivos exclusivos:** `src/Frontend/src/app/features/vacaciones/actas-vacaciones.component.ts`; `src/Frontend/src/app/features/vacaciones/mis-actas-vacaciones.component.ts`; `src/Frontend/src/app/features/vacaciones/actas-vacaciones.component.spec.ts`; `src/Frontend/src/app/features/vacaciones/mis-actas-vacaciones.component.spec.ts`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.ActasVacacionesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/actas-vacaciones.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## Integración y cierre posterior

- [ ] Integrador revisa diff y evidencia real de cada tarea futura, sin cambiar specs aprobadas por conveniencia.
- [ ] Pruebas pertinentes de servidor/UI/integración y E2E completadas; los casos B no cuentan como cobertura implementada.
- [ ] Recuperación y aislamiento comprobados; ningún informe/escaneo real en fixtures ni repo.
- [ ] PR de implementación hacia develop con CI sobre HEAD final y título convencional en español.

El cierre de #187 verifica que esta descomposición y sus pruebas están preparadas. Todas las casillas de ejecución quedan pendientes; cerrar la planificación no marca las tareas como implementadas ni decide ADR.
