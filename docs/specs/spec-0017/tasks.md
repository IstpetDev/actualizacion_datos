# Ejecución y organización de pruebas para agentes — Tareas

**Spec aprobado:** `spec.md` versión 0.1\
**Plan:** `plan.md` versión 0.1\
**Estado:** Verificado localmente

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Puede ir en paralelo con | Dueño |
|---|---|---|---|---|
| T-01 | RF-PRU-001, 006, 007 | Ninguna | Ninguna | Agente coordinador |
| T-02 | RF-PRU-002 a 007 | T-01 | Ninguna | Agente coordinador |
| T-03 | RF-PRU-008 y aceptación | T-02 | Ninguna | Agente coordinador |

## T-01 — Regla breve en AGENTS.md

**Objetivo:** Hacer visible para todo agente el ciclo local selectivo y la política de CI.\
**Área y rama:** Documentación; `docs/guia-pruebas-selectivas`\
**Archivos exclusivos:** `AGENTS.md`\
**Entrada/contrato:** Spec-0014 v0.1 y ADR-0005 vigente\
**Salida para integración:** Sección breve de pruebas locales que enlaza la guía detallada\
**Dependencias:** Ninguna\
**ADR aplicable:** ADR-0005\
**Responsable:** Agente coordinador

- [x] Indicar selección local por clase/archivo o carpeta y ampliación por impacto.
- [x] Mantener visibles los comandos completos y aclarar que CI sigue ADR-0005.
- [x] Comprobar `git diff --check` y cotejar RF-PRU-001, 006, 007.

**Resultado registrado:** 2026-10-28; `AGENTS.md` actualizado y diff sin errores.\
**Bloqueos:** Ninguno

## T-02 — Guía de creación y selección en CONTRIBUTING.md

**Objetivo:** Dar comandos copiables y convenciones de ubicación y nombre.\
**Área y rama:** Documentación; `docs/guia-pruebas-selectivas`\
**Archivos exclusivos:** `CONTRIBUTING.md`\
**Entrada/contrato:** Regla breve de T-01, estructura de pruebas existente\
**Salida para integración:** Sección «Pruebas locales»\
**Dependencias:** T-01\
**ADR aplicable:** ADR-0005\
**Responsable:** Agente coordinador

- [x] Describir proyectos `Domain.Tests`, `Application.Tests`, `WebApi.Tests` y trait de integración.
- [x] Documentar comandos .NET por proyecto, clase y método con `Categoria!=Integracion`.
- [x] Describir `.spec.ts` adyacente por componente, servicio o guardia y comandos Angular por archivo y carpeta.
- [x] Distinguir iteración local, cierre y ejecución de CI por nivel y rutas.
- [x] Comprobar `git diff --check` y cotejar RF-PRU-002 a 007.

**Resultado registrado:** 2026-10-28; `CONTRIBUTING.md` actualizado; ejemplos comprobados con 121, 25, 1, 8 y 13 pruebas.\
**Bloqueos:** Ninguno

## T-03 — Validar los ejemplos y registrar evidencias

**Objetivo:** Comprobar que los comandos documentados ejecutan pruebas reales y que los archivos compilan.\
**Área y rama:** Documentación; `docs/guia-pruebas-selectivas`\
**Archivos exclusivos:** `docs/specs/spec-0017/test-e2e.md`, `docs/specs/spec-0017/tasks.md`\
**Entrada/contrato:** Guías de T-01 y T-02\
**Salida para integración:** Matriz de resultados y limitaciones\
**Dependencias:** T-02\
**ADR aplicable:** ADR-0005\
**Responsable:** Agente coordinador

- [x] Ejecutar los ejemplos de backend y frontend y verificar cantidad de pruebas mayor que cero.
- [x] Ejecutar compilación y suites apropiadas; registrar salida y limitaciones.
- [x] Comprobar `git diff --check`, `git status --short` y que `.github/workflows/ci.yml` no cambió.

**Resultado registrado:** 2026-10-28; ver `test-e2e.md` para resultados y comandos.\
**Bloqueos:** Ninguno

## Integración y cierre

- [x] Evidencia de T-01 a T-03 registrada y revisada.
- [x] Sin cambios de API, base de datos ni CI.
- [x] `test-e2e.md` ejecutado y resultados registrados.
- [ ] Cambio listo para PR hacia `develop` con título `docs: guiar pruebas locales selectivas`.
