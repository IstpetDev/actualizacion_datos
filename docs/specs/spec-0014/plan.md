# Ejecución y organización de pruebas para agentes — Plan de implementación

**Spec aprobado:** `spec.md` versión 0.1, aprobación explícita del solicitante el 2026-10-28\
**Objetivo:** Enseñar a agentes y colaboradores a crear y ejecutar pruebas locales por unidad afectada, conservando CI actual.\
**Áreas:** Documentación de `src/Backend` y `src/Frontend`\
**Tecnologías:** .NET 10 con xUnit; Angular 22 con Vitest y pnpm

## Correspondencia con el spec

| Requisito o escenario | Decisión de diseño | Archivo | Tarea | Verificación |
|---|---|---|---|---|
| RF-PRU-001, 006; escenarios 1 y 2 | Distinguir iteración local, cierre y CI; ampliar pruebas por impacto | `AGENTS.md`, `CONTRIBUTING.md` | T-01, T-02 | V-01 |
| RF-PRU-002, 004; escenario 1 | Comandos por proyecto, clase y método; convención por capa y trait de integración | `CONTRIBUTING.md` | T-02 | V-02 |
| RF-PRU-003, 005; escenario 2 | Comandos Angular por archivo y carpeta; spec adyacente a la unidad | `CONTRIBUTING.md` | T-02 | V-03 |
| RF-PRU-007; escenario 3 | Mantener CI y describir sus niveles actuales | `AGENTS.md`, `CONTRIBUTING.md` | T-01, T-02 | V-04 |
| RF-PRU-008; escenarios 1 y 2 | Ejecutar ejemplos y comprobar cantidad mayor que cero | `test-e2e.md` | T-03 | V-02, V-03 |

## Diseño y contratos

`AGENTS.md` ofrece la regla breve y remite a `CONTRIBUTING.md` para comandos y convenciones. `CONTRIBUTING.md` contiene ejemplos copiables, rutas de pruebas y criterios para ampliar el alcance local. No hay contratos de producto, API, base de datos ni despliegue.

Los filtros .NET usan el proyecto de pruebas concreto y el nombre completo de la clase, seguido de un punto, para evitar coincidencias parciales; `Categoria!=Integracion` se usa cuando no hay Docker. Angular recibe rutas relativas a `src/Frontend/src` mediante `--include`; se conserva `pnpm test:ci` como comando de suite completa. Un resultado con cero pruebas no sirve como verificación.

El cierre local requiere compilar las áreas modificadas y ejecutar las pruebas pertinentes; cambios transversales requieren la suite completa de las áreas afectadas. CI mantiene el filtro por rutas y la separación de unitarias e integración de ADR-0005. Las instrucciones no modifican `.github/workflows/ci.yml`.

## ADR aplicables y por redactar

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| CI por niveles y rutas | `docs/decisiones/ADR-0005-ci-por-niveles.md` | Vigente | T-01, T-02 |

No se introduce una decisión de arquitectura nueva.

## Mapa de archivos

| Área | Crear o modificar | Responsabilidad | Depende de |
|---|---|---|---|
| Guía de agentes | `AGENTS.md` | Regla breve de ejecución local y referencia | T-01 |
| Guía de contribución | `CONTRIBUTING.md` | Comandos y organización por backend y frontend | T-02 |
| Evidencia de proceso | `docs/specs/spec-0014/test-e2e.md` | Verificación de comandos de la guía | T-03 |
| Control de tareas | `docs/specs/spec-0014/tasks.md` | Estado y evidencias | T-01 a T-03 |

## Datos y migración

No hay datos nuevos, migraciones ni cambios de despliegue. Los ejemplos usan nombres existentes de clases y componentes y no incluyen datos personales.

## Orden de ejecución e integración

1. T-01: actualizar la regla breve en `AGENTS.md`.
2. T-02: desarrollar los comandos y convenciones en `CONTRIBUTING.md`.
3. T-03: ejecutar los ejemplos, revisar que ninguna selección devuelva cero pruebas, compilar y registrar resultados.

La misma persona integra las tres tareas en la rama `docs/guia-pruebas-selectivas`. No se requiere trabajo paralelo.

## Riesgos y decisiones pendientes

| Riesgo o punto abierto | Efecto | Acción y responsable |
|---|---|---|
| Un filtro devuelve cero pruebas | Falsa señal de verificación | T-03 comprueba cantidad y salida; responsable de implementación |
| Un cambio compartido afecta otras unidades | Selección local insuficiente | T-02 define cuándo ejecutar la suite completa del área; responsable de implementación |
| El CI actual omite integración en PR a `develop` | Interpretación equivocada de «suite completa en CI» | T-02 describe el comportamiento vigente; cambiarlo queda fuera de esta spec por aclaración del solicitante |

## Comprobación del plan

- [x] Rutas y tecnologías cotejadas con el repositorio.
- [x] ADR-0005 respetado; no se requiere ADR nuevo.
- [x] Todos los requisitos tienen tarea y verificación.
- [x] Las tareas tienen rutas y orden claros.
- [x] Al ser un cambio documental, los recorridos E2E son comandos reales; no se añaden pruebas del producto que dupliquen la documentación.
