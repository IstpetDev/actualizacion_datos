# Períodos, calendario y registro sin saldo — Tareas

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md).

**Plan:** [plan.md](plan.md) v0.1. **Estado:** backlog documental preparado y publicación autorizada; implementación no iniciada. No se afirma aprobación de una opción técnica pendiente ni ejecución de pruebas futuras.

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Paralelismo | Dueño funcional/técnico |
|---|---|---|---|---|
| T-SAL-00 | Todos los requisitos del área | E0: decisiones registradas y activación institucional | Ninguno sobre archivos compartidos | Responsable técnico; TH/Jurídico aporta datos |
| T-SAL-01 | RF-VAC-SAL-001 RF-VAC-SAL-002 RF-VAC-SAL-004 RF-VAC-SAL-005 RF-VAC-SAL-007 RF-VAC-SAL-008 RF-VAC-SAL-009 | T-SAL-00; T-VIN-01, política de solapes y ADR-0045 revisado/decidido para A | Secuencial | Responsable técnico de E3, por asignar |
| T-SAL-02 | RF-VAC-SAL-001 RF-VAC-SAL-002 RF-VAC-SAL-004 RF-VAC-SAL-005 RF-VAC-SAL-008 RF-VAC-SAL-009 | T-SAL-00; T-SAL-01 y cliente regenerado | Secuencial | Responsable técnico de E3, por asignar |
| T-SAL-D01 | RF-VAC-SAL-003, RF-VAC-SAL-006 | Futura aprobación de Modo B | No ejecutable en Entrega 1 | Fuera de backlog de implementación A |

## T-SAL-00 — Condiciones previas

**Estado:** Bloqueada por ADR/datos de activación; referencia E0 en [backlog](../../evidencia/issue-182/backlog.md). **Responsable:** quien desarrolla y autoridad/TH/Jurídico según pregunta.

Revisar PD-SAL-02/04/05/06/07/08, resolver ADR dependientes sin cierre autónomo del agente y registrar alcance/valores autorizados. Contratos del plan son propuestas hasta esa revisión. Validación documental: estado del ADR, referencia de decisión y política institucional, sin subir informe físico ni datos reales. El resultado es una puerta de ejecución explícita, no un módulo habilitado. No editar producción en esta tarea documental.

## T-SAL-01 — Períodos certificados y eventos de Modo A

**Backlog:** E3, enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Bloqueada por ADR y dependencias. **Responsable:** desarrollador asignado al issue futuro; integrador técnico valida entrega.

**Área y rama:** Backend; rama futura `feature/<numero-issue>-vacaciones-sal-01` desde develop actualizado.

**Entrada/contrato:** T-VIN-01, política de solapes y ADR-0045 revisado/decidido para A. DTO y errores de [plan.md](plan.md#diseño-y-contratos), cerrados antes de consumo. **Requisitos:** RF-VAC-SAL-001 RF-VAC-SAL-002 RF-VAC-SAL-004 RF-VAC-SAL-005 RF-VAC-SAL-007 RF-VAC-SAL-008 RF-VAC-SAL-009.

**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/PeriodoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/EventoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosPeriodoVacacional.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioPeriodosVacacionales.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/PeriodoVacacionalConfiguracion.cs`; `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/PeriodosVacacionalesEndpoints.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/PeriodoVacacionalTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/PeriodosVacacionalesTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/PeriodosVacacionalesIntegracionTests.cs`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.PeriodosVacacionalesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/periodos-vacacionales.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-SAL-02 — Presentar fechas, procedencia y ausencia de saldo

**Backlog:** E3, enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Bloqueada por ADR y dependencias. **Responsable:** desarrollador asignado al issue futuro; integrador técnico valida entrega.

**Área y rama:** Frontend; rama futura `feature/<numero-issue>-vacaciones-sal-02` desde develop actualizado.

**Entrada/contrato:** T-SAL-01 y cliente regenerado. DTO y errores de [plan.md](plan.md#diseño-y-contratos), cerrados antes de consumo. **Requisitos:** RF-VAC-SAL-001 RF-VAC-SAL-002 RF-VAC-SAL-004 RF-VAC-SAL-005 RF-VAC-SAL-008 RF-VAC-SAL-009.

**Archivos exclusivos:** `src/Frontend/src/app/features/vacaciones/periodos-vacacionales.component.ts`; `src/Frontend/src/app/features/vacaciones/periodos-vacacionales.component.spec.ts`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.PeriodosVacacionalesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/periodos-vacacionales.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-SAL-D01 — Modo B diferido

No es una tarea ejecutable de Entrega 1 ni genera un issue de implementación en este milestone. Conserva trazabilidad del corte, cálculo/saldo/FIFO que la spec prevé condicionalmente. Requiere nuevo alcance aprobado, fuentes/reglas y ADR decididos; las pruebas positivas B siguen diferidas, no aprobadas.

## Integración y cierre posterior

- [ ] Integrador revisa diff y evidencia real de cada tarea futura, sin cambiar specs aprobadas por conveniencia.
- [ ] Pruebas pertinentes de servidor/UI/integración y E2E completadas; los casos B no cuentan como cobertura implementada.
- [ ] Recuperación y aislamiento comprobados; ningún informe/escaneo real en fixtures ni repo.
- [ ] PR de implementación hacia develop con CI sobre HEAD final y título convencional en español.

El cierre de #187 verifica que esta descomposición y sus pruebas están preparadas. Todas las casillas de ejecución quedan pendientes; cerrar la planificación no marca las tareas como implementadas ni decide ADR.
