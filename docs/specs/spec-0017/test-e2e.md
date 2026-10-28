# Ejecución y organización de pruebas para agentes — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.1\
**Plan:** `plan.md` versión 0.1\
**Responsable de ejecución:** Agente coordinador\
**Ambiente:** Local, sin servicios de producto ni datos personales

## Preparación

Usar la rama `docs/guia-pruebas-selectivas`, .NET SDK 10, pnpm 12.4.1 y dependencias ya restauradas. Las pruebas unitarias no requieren PostgreSQL. No se accede a datos de producción ni se crean cuentas.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| Backend | `dotnet --version` | SDK 10 disponible |
| Frontend | `pnpm --version` | pnpm 12.4.1 disponible |
| CI | `.github/workflows/ci.yml` | Sin modificaciones |

## Matriz de cobertura

| Caso | Requisito y escenario del spec | Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | RF-PRU-002, 004, 008; escenario 1 | T-02, T-03 | Proyecto, clase y método .NET | Cada filtro ejecuta más de cero pruebas |
| E2E-02 | RF-PRU-003, 005, 008; escenario 2 | T-02, T-03 | Archivo y carpeta Angular | Cada selección ejecuta solo los specs esperados |
| E2E-03 | RF-PRU-001, 006, 007; escenario 3 | T-01 a T-03 | Revisión de guía y CI | CI no cambió y la guía describe su nivel actual |

No hay interfaz nueva, permisos nuevos ni datos persistidos. Las verificaciones de compilación y suites existentes cubren la calidad del repositorio; estos recorridos comprueban la utilidad de la documentación.

## E2E-01 — Filtros .NET

**Precondición:** SDK y proyectos de pruebas restaurados.\
**Datos:** Clases de prueba existentes, sin datos personales.\
**Pasos:**

1. Ejecutar los comandos por proyecto, clase y método de `CONTRIBUTING.md`.
2. Leer la cantidad `Passed` de cada salida y exigir que sea mayor que cero.
3. Confirmar que el filtro local excluye `Categoria=Integracion`.

**Resultado esperado:** Cada comando termina con código cero y al menos una prueba aprobada.\
**Resultado obtenido:** Proyecto `Domain.Tests`: 121/121; clase `CuentaBancariaTests` con nombre completo: 25/25; método `Sin_sesion_responde_401`: 1/1. Los tres comandos terminaron con código cero. El filtro corto inicial encontró 44 pruebas porque incluyó otras clases con nombres coincidentes; se corrigió antes del cierre.\
**Evidencia:** Salida de los tres comandos `dotnet test` documentados en `CONTRIBUTING.md`.\
**Fecha y ejecutor:** 2026-10-28; agente coordinador\
**Incidencia:** Ninguna

## E2E-02 — Filtros Angular

**Precondición:** Dependencias del frontend instaladas.\
**Datos:** Specs existentes de cuenta bancaria.\
**Pasos:**

1. Ejecutar los comandos por archivo y carpeta de `CONTRIBUTING.md`.
2. Leer `Test Files` y `Tests` de cada salida y exigir que sean mayores que cero.
3. Confirmar que el archivo ejecuta un spec y la carpeta dos specs.

**Resultado esperado:** Ambos comandos terminan con código cero y contienen solo los archivos elegidos.\
**Resultado obtenido:** Archivo: 1 spec, 8/8 pruebas; carpeta: 2 specs, 13/13 pruebas. Ambos comandos terminaron con código cero.\
**Evidencia:** Salida de los dos comandos `ng test` documentados en `CONTRIBUTING.md`.\
**Fecha y ejecutor:** 2026-10-28; agente coordinador\
**Incidencia:** Ninguna

## E2E-03 — Aislamiento de CI

**Precondición:** Guías editadas.\
**Datos:** Ninguno.\
**Pasos:**

1. Ejecutar `git diff -- .github/workflows/ci.yml` y comprobar que está vacío.
2. Cotejar `AGENTS.md` y `CONTRIBUTING.md` con ADR-0005.
3. Ejecutar `git diff --check`.

**Resultado esperado:** CI no cambió; las guías describen los niveles actuales; sin errores de espacios.\
**Resultado obtenido:** `git diff -- .github/workflows/ci.yml` y `git diff --check` no produjeron salida; las guías reflejan ADR-0005.\
**Evidencia:** Salida de `git diff -- .github/workflows/ci.yml`, `git diff --check` y lectura de `AGENTS.md` y `CONTRIBUTING.md`.\
**Fecha y ejecutor:** 2026-10-28; agente coordinador\
**Incidencia:** Ninguna

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 | Aprobado | 121/121, 25/25 y 1/1 | Ninguna |
| E2E-02 | Aprobado | 1 archivo y 8/8; 2 archivos y 13/13 | Ninguna |
| E2E-03 | Aprobado | Diff de CI vacío; `git diff --check` sin errores | Ninguna |

## Comprobación adicional

- `dotnet test src/Backend --filter 'Categoria!=Integracion'`: 121/121 `Domain.Tests`, 134/134 `Application.Tests` y 394/394 `WebApi.Tests`; 649 pruebas unitarias aprobadas.
- `pnpm --dir src/Frontend test:ci`: 40 archivos y 416/416 pruebas aprobadas.
- `dotnet build src/Backend --no-restore -m:1 --disable-build-servers -p:GenerarClienteAngular=false --verbosity quiet`: compilación correcta, cero advertencias y cero errores.
- `pnpm --dir src/Frontend build --configuration development`: compilación correcta.
- No se ejecutaron pruebas de integración con PostgreSQL: esta tarea solo cambió documentación y no modificó CI ni código del producto.

## Verificación tras integrar `develop` (2026-10-28)

- `dotnet test src/Backend --filter 'Categoria!=Integracion' -p:GenerarClienteAngular=false`: 135/135 `Domain.Tests`, 134/134 `Application.Tests` y 413/413 `WebApi.Tests`; 682 pruebas unitarias aprobadas.
- `pnpm --dir src/Frontend test:ci`: 42 archivos y 450/450 pruebas aprobadas.
- `dotnet build src/Backend --no-restore -m:1 --disable-build-servers -p:GenerarClienteAngular=false --verbosity quiet`: compilación correcta, cero advertencias y cero errores.
- `pnpm --dir src/Frontend build --configuration development`: compilación correcta.
- `git diff origin/develop --check`: sin errores. La diferencia con `develop` se limita a la guía y `spec-0017`.
