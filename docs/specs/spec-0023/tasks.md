# Vínculos laborales e historia — Tareas

**Spec aprobado:** [spec.md](spec.md) v0.2, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md) y [decisiones E0 de #189](../../evidencia/issue-189/README.md).

**Plan:** [plan.md](plan.md) v1.0. **Estado:** puerta `T-VIN-00` resuelta en #189 y contratos congelados; tareas `T-VIN-01` y `T-VIN-02` desbloqueadas en cuanto a ADR/E0 y listas tras `T-MAR-01` (#190) para implementación en [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191).

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Paralelismo | Dueño funcional/técnico |
|---|---|---|---|---|
| T-VIN-00 | Todos los requisitos del área | Completada en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) (E0) | Ninguno sobre archivos compartidos | @bryancito1090; política TH/Jurídico registrada |
| T-VIN-01 | RF-VAC-VIN-001 RF-VAC-VIN-002 RF-VAC-VIN-003 RF-VAC-VIN-004 RF-VAC-VIN-005 RF-VAC-VIN-007 RF-VAC-VIN-008 | T-VIN-00 (resuelta en #189); T-MAR-01 (#190) | Secuencial | @bryancito1090 (#191); acoplamiento progresivo con #196 (@AnthonyPilatasig) |
| T-VIN-02 | RF-VAC-VIN-002 RF-VAC-VIN-003 RF-VAC-VIN-004 RF-VAC-VIN-005 RF-VAC-VIN-007 RF-VAC-VIN-008 | T-VIN-00 (resuelta en #189); DTO y cliente regenerado de T-VIN-01 | Secuencial | @bryancito1090 (#191) |
| T-VIN-D01 | RF-VAC-VIN-006 | Futura aprobación de Modo B | No ejecutable en Entrega 1 | Fuera de backlog de implementación A |

## T-VIN-00 — Condiciones previas

**Estado:** Completada en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) (E0); véase [evidencia de #189](../../evidencia/issue-189/README.md) y [backlog](../../evidencia/issue-182/backlog.md). **Responsable:** @bryancito1090 y autoridad/TH/Jurídico según pregunta.

Se revisaron PD-VIN-01 a PD-VIN-07, se cerró [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) como Vigente (Opción 1 acotada a Modo A en Entrega 1), se congelaron los contratos de [plan.md](plan.md#diseño-y-contratos) y se creó [#196](https://github.com/IstpetDev/actualizacion_datos/issues/196) (asignado a @AnthonyPilatasig) para especificar e implementar el módulo básico de contratos laborales acoplable progresivamente. No se editó código de producción en esta tarea documental.

## T-VIN-01 — Vínculos, fuentes y certificación auditada

**Backlog:** E2 ([#191](https://github.com/IstpetDev/actualizacion_datos/issues/191)), enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Puerta ADR/E0 resuelta en #189; espera secuencialmente a E1 (#190). **Responsable:** @bryancito1090; integrador técnico valida entrega.

**Área y rama:** Backend; rama futura `feature/<numero-issue>-vacaciones-vin-01` desde develop actualizado.

**Entrada/contrato:** T-MAR-01 (#190) y contrato congelado en [plan.md](plan.md#diseño-y-contratos) tras E0 (#189). **Requisitos:** RF-VAC-VIN-001 RF-VAC-VIN-002 RF-VAC-VIN-003 RF-VAC-VIN-004 RF-VAC-VIN-005 RF-VAC-VIN-007 RF-VAC-VIN-008.

**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VinculoLaboral.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/CertificacionIngreso.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosVinculoLaboral.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioVinculosLaborales.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs`; `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/VinculoLaboralConfiguracion.cs`; `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/VinculosLaboralesEndpoints.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/VinculoLaboralTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/VinculosLaboralesTests.cs`; `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/VinculosLaboralesIntegracionTests.cs`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.VinculosLaboralesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/vinculos-laborales.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-VIN-02 — Pantalla de contraste y certificación

**Backlog:** E2 ([#191](https://github.com/IstpetDev/actualizacion_datos/issues/191)), enlace en [registro](../../evidencia/issue-182/backlog.md). **Estado:** Puerta ADR/E0 resuelta en #189; espera secuencialmente a T-VIN-01. **Responsable:** @bryancito1090; integrador técnico valida entrega.

**Área y rama:** Frontend; rama futura `feature/<numero-issue>-vacaciones-vin-02` desde develop actualizado.

**Entrada/contrato:** DTO y cliente regenerado de T-VIN-01 según contrato congelado en [plan.md](plan.md#diseño-y-contratos). **Requisitos:** RF-VAC-VIN-002 RF-VAC-VIN-003 RF-VAC-VIN-004 RF-VAC-VIN-005 RF-VAC-VIN-007 RF-VAC-VIN-008.

**Archivos exclusivos:** `src/Frontend/src/app/features/vacaciones/vinculos-laborales.component.ts`; `src/Frontend/src/app/features/vacaciones/vinculos-laborales.component.spec.ts`.

Los archivos compartidos enumerados en el plan solo se modifican en el turno secuencial del área; migración/model snapshot pertenecen al mismo responsable. Rutas/menú finales pertenecen a E6. La tarea E5 modifica servicio/endpoint de actas después de E4, nunca simultáneamente.

**Salida para integración:** comportamiento y contrato del área, migración aditiva cuando aplique, cliente actualizado si cambia API, pruebas y registro de cobertura/fallos; ningún dato inferido.

- [ ] Resolver dependencias y ADR; si falta decisión, no iniciar implementación.
- [ ] Añadir pruebas de comportamiento donde corresponda, implementar solo alcance A y evitar nuevas dependencias sin decisión.
- [ ] Al cambiar API ejecutar `dotnet build src/Backend --configuration Debug` y versionar `openapi/v1.json` más `src/Frontend/src/app/api-client/` en el mismo PR.
- [ ] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter "FullyQualifiedName~.VinculosLaboralesTests.&Categoria!=Integracion"` para servidor; verificar que ejecuta más de cero casos.
- [ ] Para UI ejecutar `pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/vacaciones/vinculos-laborales.component.spec.ts`; E6 incluye también `mis-actas-vacaciones.component.spec.ts`.
- [ ] Cuando cambie persistencia ejecutar la clase de `Integracion/` indicada en el plan con PostgreSQL/Testcontainers; registrar casos reales.
- [ ] Compilar áreas modificadas: `dotnet build src/Backend` y/o `pnpm --dir src/Frontend build`; ampliar pruebas si cambian contratos compartidos.
- [ ] Ejecutar los casos aplicables de [test-e2e.md](test-e2e.md), registrar commit, comandos, cantidades, resultado y evidencias ficticias.

**Resultado registrado:** pendiente de implementación; no ejecutado en este milestone. **Criterio de entrega:** requisitos asignados observables, aislamiento efectivo, ausencia de saldo inventado y recuperación del error descrito. No cerrar issue futuro solo por existir archivos.

## T-VIN-D01 — Modo B diferido

No es una tarea ejecutable de Entrega 1 ni genera un issue de implementación en este milestone. Conserva trazabilidad del corte, cálculo/saldo/FIFO que la spec prevé condicionalmente. Requiere nuevo alcance aprobado, fuentes/reglas y ADR decididos; las pruebas positivas B siguen diferidas, no aprobadas.

## Integración y cierre posterior

- [ ] Integrador revisa diff y evidencia real de cada tarea futura, sin cambiar specs aprobadas por conveniencia.
- [ ] Pruebas pertinentes de servidor/UI/integración y E2E completadas; los casos B no cuentan como cobertura implementada.
- [ ] Recuperación y aislamiento comprobados; ningún informe/escaneo real en fixtures ni repo.
- [ ] PR de implementación hacia develop con CI sobre HEAD final y título convencional en español.

El cierre de #187 verifica que esta descomposición y sus pruebas están preparadas. Todas las casillas de ejecución quedan pendientes; cerrar la planificación no marca las tareas como implementadas ni decide ADR.
