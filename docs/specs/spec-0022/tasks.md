# Marco y régimen — Tareas

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md).

**Plan:** [plan.md](plan.md) v0.1. **Estado:** backlog documental preparado y publicación autorizada; implementación no iniciada. No se afirma aprobación de una opción técnica pendiente ni ejecución de pruebas futuras.

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Paralelismo | Dueño funcional/técnico |
|---|---|---|---|---|
| T-MAR-00 | Todos los requisitos del área | E0: decisiones registradas y activación institucional | Ninguno sobre archivos compartidos | Responsable técnico; TH/Jurídico aporta datos |
| T-MAR-01 | RF-VAC-MAR-001 RF-VAC-MAR-002 RF-VAC-MAR-003 RF-VAC-MAR-007 | T-MAR-00; Contrato propuesto anterior; G0 debe fijar representación y designaciones | Secuencial | Responsable técnico de E1, por asignar |
| T-MAR-02 | RF-VAC-MAR-004 RF-VAC-MAR-005 RF-VAC-MAR-006 | T-MAR-00; Salida de T-MAR-01 y cliente NSwag regenerado | Secuencial | Responsable técnico de E1, por asignar |

## T-MAR-00 — Condiciones previas

**Estado:** Bloqueada por ADR/datos de activación; referencia E0 en [backlog](../../evidencia/issue-182/backlog.md). **Responsable:** quien desarrolla y autoridad/TH/Jurídico según pregunta.

Revisar PD-MAR-01/02/03/04/06, resolver ADR dependientes sin cierre autónomo del agente y registrar alcance/valores autorizados. Contratos del plan son propuestas hasta esa revisión. Validación documental: estado del ADR, referencia de decisión y política institucional, sin subir informe físico ni datos reales. El resultado es una puerta de ejecución explícita, no un módulo habilitado. No editar producción en esta tarea documental.

## T-MAR-01 — Marco, fuentes y facultades en servidor

**Backlog:** E1, enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Bloqueada por ADR y dependencias. **Responsable:** desarrollador asignado al issue futuro; integrador técnico valida entrega.

**Área y rama:** Backend; rama futura `feature/<numero-issue>-vacaciones-mar-01` desde develop actualizado.

**Entrada/contrato:** Contrato propuesto anterior; G0 debe fijar representación y designaciones. DTO y errores de [plan.md](plan.md#diseño-y-contratos), cerrados antes de consumo. **Requisitos:** RF-VAC-MAR-001 RF-VAC-MAR-002 RF-VAC-MAR-003 RF-VAC-MAR-007.

**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/MarcoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/FacultadVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosMarcoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioMarcoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/MarcoVacacionalConfiguracion.cs`; `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/MarcoVacacionalEndpoints.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/MarcoVacacionalTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/MarcoVacacionalIntegracionTests.cs`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.MarcoVacacionalTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/marco-vacacional.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-MAR-02 — Presentar bloqueos, modo y límites de Entrega 1

**Backlog:** E1, enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Bloqueada por ADR y dependencias. **Responsable:** desarrollador asignado al issue futuro; integrador técnico valida entrega.

**Área y rama:** Frontend; rama futura `feature/<numero-issue>-vacaciones-mar-02` desde develop actualizado.

**Entrada/contrato:** Salida de T-MAR-01 y cliente NSwag regenerado. DTO y errores de [plan.md](plan.md#diseño-y-contratos), cerrados antes de consumo. **Requisitos:** RF-VAC-MAR-004 RF-VAC-MAR-005 RF-VAC-MAR-006.

**Archivos exclusivos:** `src/Frontend/src/app/features/vacaciones/marco-vacacional.component.ts`; `src/Frontend/src/app/features/vacaciones/marco-vacacional.component.spec.ts`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.MarcoVacacionalTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/marco-vacacional.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
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
