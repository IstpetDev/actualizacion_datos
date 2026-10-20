# Fundación del repositorio — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el monorepo `actualizacion_datos` con documentación de gobierno, ADR y specs, esqueleto compilable de backend (.NET 10, Clean Architecture) y frontend (Angular 22), y CI de GitHub Actions por niveles con pruebas unitarias en verde.

**Architecture:** Monorepo con `src/Backend` y `src/Frontend`. El backend expone un endpoint de salud y genera `openapi/v1.json` al compilar; el cliente TypeScript (NSwag) se versiona y CI comprueba que esté al día. Los workflows siguen `plantilla-ci-cd` con filtro por rutas.

**Tech Stack:** .NET 10, xUnit, Angular 22, pnpm 12, Vitest, PostgreSQL, Docker, GitHub Actions, gitleaks, CodeQL, NSwag.

**Spec:** `docs/superpowers/specs/2026-10-20-fundacion-repositorio-design.md` (aprobado 2026-10-20). Se lee junto con este plan.

## Global Constraints

- Idioma: español en código, commits, documentos y mensajes. Prefijo `Istpet.ActualizacionDatos`.
- Ramas: `main` (solo PR desde `develop` y `hotfix/*`) y `develop` (PR desde `feature|fix|docs|chore|refactor|test|ci/*`). Título del PR: `<tipo>: <resumen en minúsculas>`; tipos `feat fix docs chore refactor test ci`.
- Sin datos personales reales en ningún archivo, ejemplo o test.
- Licencia PolyForm Noncommercial 1.0.0; contacto de seguridad `istpetdev@istpet.edu.ec`; propietario `@IstpetDev` en `CODEOWNERS` y `dependabot`.
- Sin `git push` ni cambios en GitHub (reglas, secretos, environments). Esas acciones se documentan como pasos manuales.
- Acciones de terceros en workflows fijadas por hash de commit.
- Sin lógica de negocio en el esqueleto.
- Fuentes a copiar y adaptar: plantillas internas del equipo (fuera de este repositorio): plantilla de CI/CD, `plantilla-dotnet-angular`, `plantilla_angular` y plantillas de spec.
- Commits terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

Entradas o condiciones que el diseño implica pero ninguna tarea de producto prueba; cada una tiene su prueba en la tarea indicada.

1. Un PR a `main` desde una rama que no es `develop` ni `hotfix/*` debe fallar la política (Task 8, prueba del script).
2. Título de PR con mayúsculas, sin tipo o con tipo desconocido debe fallar (Task 8).
3. Un cambio solo en `src/Frontend` no debe compilar el backend, y viceversa (Task 8, comprobación del filtro).
4. `openapi/v1.json` desactualizado respecto al código debe romper `ci-ok` (Task 6).
5. `/health` debe responder 200 sin autenticación y no exponer versión ni cadena de conexión (Task 5).

## Estructura de archivos

| Ruta | Responsabilidad |
|---|---|
| `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE` | Gobierno y orientación |
| `docs/decisiones/` | Plantilla, guía y ADR-0001…0009 |
| `docs/specs/` | Guía, `_plantilla/`, `spec-0001/` |
| `src/Backend/` | `Istpet.ActualizacionDatos.{Domain,Application,Infrastructure,WebApi}` + `tests/` |
| `src/Frontend/` | Angular 22 mínimo, cliente generado en `src/app/api-client/` |
| `openapi/v1.json` | Contrato exportado |
| `.github/` | Workflows, `dependabot.yml`, `CODEOWNERS`, plantilla de PR |
| Raíz | `docker-compose.yml`, `.gitignore`, `.editorconfig`, `.gitleaks.toml` |

## Task 0: Prerrequisitos del entorno

**Files:** ninguno.

- [ ] **Step 1:** Comprobar `dotnet --list-sdks`. Hoy solo hay 8.0.421 y 8.0.424; `global.json` exigirá `10.0.100` con `rollForward: latestFeature`. Si falta el SDK 10, pedir al usuario que lo instale (no instalar sin permiso) y detenerse.
- [ ] **Step 2:** Comprobar `node -v` (>=22.22.3 o >=26), `pnpm -v` (>=12.4), `docker --version`. Esperado: ya cumplen (v26.12.0, 11.1.3 → **pnpm 11.1.3 no cumple >=12.4**; instalar con `corepack prepare pnpm@12.4.1 --activate` o avisar al usuario).

## Task 1: Repositorio base y archivos de raíz

**Files:** Create `.gitignore`, `.editorconfig`, `.gitleaks.toml`, `LICENSE`, `SECURITY.md`.

**Produces:** repo Git local con `main` y `develop`.

- [ ] **Step 1:** `git init -b main` en el directorio del proyecto.
- [ ] **Step 2:** Copiar `.gitignore`, `.editorconfig` y `.gitleaks.toml` de `plantilla-dotnet-angular` y unirlos; añadir `.env`, `uploads/`, `*.zip`.
- [ ] **Step 3:** `LICENSE` con el texto oficial de PolyForm Noncommercial 1.0.0 (descargar del repositorio `polyformproject/polyform-licenses`; anotar la URL en el commit).
- [ ] **Step 4:** `SECURITY.md`: cómo reportar a `istpetdev@istpet.edu.ec`, no en incidencias públicas, versiones soportadas = solo `main`.
- [ ] **Step 5:** Verificar con `gitleaks detect --no-git` si está instalado; si no, anotarlo. Commit `chore: iniciar repositorio` y crear `develop` desde `main` (`git branch develop`).

## Task 2: Gobierno — README, CONTRIBUTING, AGENTS.md

**Files:** Create `README.md`, `CONTRIBUTING.md`, `AGENTS.md`.

- [ ] **Step 1:** `CONTRIBUTING.md`: copiar el de `plantilla-ci-cd`, quitar "Borrador", sustituir los `<...>` por comandos reales (`dotnet build src/Backend`, `dotnet test src/Backend`, `pnpm --dir src/Frontend test:ci`, `dotnet format`, `pnpm --dir src/Frontend lint`) y las versiones del entorno local. Quitar referencias a IIS; el destino es Docker. Añadir sección "Flujo con Superpowers": brainstorming → spec en `docs/specs/` → aprobación → `writing-plans` → tareas; ADR antes de las tareas que dependen de él.
- [ ] **Step 2:** `README.md`: partir del de `plantilla-ci-cd` (modelo de ramas, CI por niveles, workflows, opciones de despliegue A/B/C con la regla de oro del repo público), recortar lo específico de IIS y añadir: qué es el producto, roles, mapa de carpetas, cómo levantar con `docker compose up`, cómo regenerar el cliente OpenAPI, pasos manuales de GitHub (rulesets, check `ci-ok`, protección de `main` y `develop`).
- [ ] **Step 3:** `AGENTS.md`: resumen para agentes — stack, comandos de build/test, reglas de ramas y commits, "no datos reales", "decisiones nuevas → ADR", rutas de `docs/`, y qué NO hacer (push, tocar reglas de GitHub, secretos).
- [ ] **Step 4:** Verificar que todos los enlaces relativos existen: `grep -o '](\([^)]*\.md\))'` y comprobar cada ruta. Commit `docs: añadir README, CONTRIBUTING y AGENTS`.

## Task 3: ADR — plantilla, guía y ADR iniciales

**Files:** Create `docs/decisiones/README.md`, `docs/decisiones/ADR-0000-plantilla.md`, `docs/decisiones/ADR-0001…0009-*.md`.

**Produces:** formato común: `# ADR-NNNN — Título`, campos Estado (Propuesto/Vigente/Reemplazado), Fecha, Contexto, Opciones, Decisión, Consecuencias, ADR relacionados.

- [ ] **Step 1:** Escribir plantilla y README (numeración correlativa, cuándo se escribe, cómo se reemplaza, índice de ADR).
- [ ] **Step 2:** Escribir los nueve ADR del diseño. 0001–0005 en estado **Vigente**; 0006–0009 en **Propuesto** con las opciones que el diseño menciona y sin decisión final (la toma quien desarrolle). ADR-0003 documenta NSwag y `openapi/v1.json`; ADR-0005 documenta la tabla de CI del diseño.
- [ ] **Step 3:** Verificar que el índice del README lista los nueve y que ningún ADR tiene `<...>` sin completar (`grep -rn '<' docs/decisiones` solo debe encontrar la plantilla). Commit `docs: añadir ADR iniciales`.

## Task 4: Specs — guía, plantillas y spec-0001

**Files:** Create `docs/specs/README.md`, `docs/specs/_plantilla/{README,spec,plan,tasks,test-e2e}.md`, `docs/specs/spec-0001/spec.md`.

- [ ] **Step 1:** Copiar las cuatro plantillas de `departamento-medico/specs/plantillas` y adaptarlas: ruta de ADR → `docs/decisiones/`, "datos clínicos" → "datos personales", un solo repositorio, no hay "responsable funcional" fijo.
- [ ] **Step 2:** `docs/specs/README.md` y `_plantilla/README.md`: adaptar el flujo de fases del README de `departamento-medico/specs` (crear spec → aprobar → plan/tareas/e2e → implementar) y explicar cómo copiar `_plantilla/` a `spec-NNNN/` sin editar la plantilla.
- [ ] **Step 3:** `spec-0001/spec.md` con la plantilla: requisitos con IDs `RF-ACC-*` (acceso), `RF-CAM-*` (campañas), `RF-FLU-*` (flujo de estados), `RF-EXP-*` (exportación), `RF-DAT-*` (protección de datos), `RF-MUL-*` (multitenant), cada uno en forma "Dado/cuando/el sistema". Roles y reglas de la sección "Producto" del diseño. Vacíos como puntos abiertos. Estado: **Borrador para revisión funcional**; no crear plan/tasks/e2e de spec-0001.
- [ ] **Step 4:** Verificar que cada regla 1–8 del diseño tiene al menos un `RF-` y que no hay cédulas ni correos reales. Commit `docs: añadir plantillas de spec y spec-0001`.

## Task 5: Esqueleto del backend (TDD)

**Files:** Create `src/Backend/global.json`, `Directory.Build.props`, `Directory.Packages.props`, `Istpet.ActualizacionDatos.sln`, proyectos `Domain`, `Application`, `Infrastructure`, `WebApi` y `tests/{Domain.Tests,Application.Tests,WebApi.Tests}`, `src/Backend/Dockerfile`, `.dockerignore`.

**Interfaces — Produces:**
- Dependencias de proyecto: `WebApi → Application, Infrastructure`; `Infrastructure → Application`; `Application → Domain`; `Domain → ninguna`.
- `WebApi`: `GET /health` → 200 `{"estado":"ok"}`, anónimo.
- Clase `Program` accesible a `WebApplicationFactory<Program>` (`public partial class Program`).
- `Domain`: `public sealed record InstitucionId(Guid Valor)` (marcador mínimo del multitenant; sin más lógica).

- [ ] **Step 1:** Crear la solución y los proyectos copiando `global.json` (SDK `10.0.100`) y la gestión central de paquetes de `plantilla-dotnet-angular/backend`. Nullable, `TreatWarningsAsErrors` y analizadores en `Directory.Build.props`.
- [ ] **Step 2: Test que falla** en `WebApi.Tests/SaludTests.cs`: `Salud_responde_200_sin_autenticar` (GET `/health` → 200), `Salud_no_expone_version_ni_conexion` (el cuerpo es exactamente `{"estado":"ok"}`). En `Domain.Tests`: `InstitucionId_con_igual_valor_es_igual`. En `Application.Tests`: una prueba de arquitectura `Domain_no_depende_de_otras_capas` que lee las referencias de ensamblado.
- [ ] **Step 3:** Ejecutar `dotnet test src/Backend`. Esperado: FAIL (no compila / 404).
- [ ] **Step 4:** Implementar `InstitucionId`, el endpoint `/health` en `WebApi` (minimal API) y `Program` parcial. Conexión a PostgreSQL **no** se registra aún; `Infrastructure` queda con una clase de registro vacía `AgregarInfraestructura(this IServiceCollection)`.
- [ ] **Step 5:** `dotnet test src/Backend`. Esperado: todas PASS; `dotnet build -c Release` sin advertencias.
- [ ] **Step 6:** Prueba de integración `WebApi.Tests/Integracion/PostgresTests.cs` etiquetada `[Trait("Categoria","Integracion")]` que levanta PostgreSQL con `Testcontainers.PostgreSql` y comprueba `SELECT 1`. Los unitarios se ejecutan con `--filter "Categoria!=Integracion"`.
- [ ] **Step 7:** Commit `feat: esqueleto del backend con Clean Architecture`.

## Task 6: OpenAPI y esqueleto del frontend

**Files:** Create `openapi/v1.json` (generado), `src/Frontend/**` (Angular 22, pnpm), `src/Frontend/src/app/api-client/index.ts` (generado), `src/Backend/src/Istpet.ActualizacionDatos.WebApi/nswag.json`.

**Interfaces — Consumes:** `/health` de Task 5. **Produces:** script `pnpm generate-api`/target MSBuild que regenera `openapi/v1.json` y el cliente.

- [ ] **Step 1:** Configurar en `WebApi` la exportación de OpenAPI en compilación (patrón de `plantilla-dotnet-angular`: `GenerarClienteAngular=false` en Release/Docker) y `nswag.json` hacia `src/Frontend/src/app/api-client/index.ts`.
- [ ] **Step 2:** Compilar en Debug; verificar que `openapi/v1.json` contiene la ruta `/health` y que el cliente tiene un método de salud. Versionar ambos.
- [ ] **Step 3: Test que falla** en el frontend (`app.spec.ts`): `crea_la_aplicacion` y `muestra_titulo`. Ejecutar `pnpm --dir src/Frontend test:ci`; esperado FAIL.
- [ ] **Step 4:** Crear la app con `ng new` (standalone, rutas, estilos CSS, Vitest por defecto), pnpm, `packageManager` y `engines` como en `plantilla-dotnet-angular/web/package.json`. Si Angular 22 no se instala, usar la última disponible y anotarlo en ADR-0003. Componente raíz con un título "Actualización de datos".
- [ ] **Step 5:** `pnpm --dir src/Frontend test:ci` y `build`. Esperado: PASS.
- [ ] **Step 6:** Añadir `lint` (ESLint de Angular) y `format:check` (Prettier) a los scripts.
- [ ] **Step 7:** Check local de "cliente al día": regenerar y `git diff --exit-code openapi src/Frontend/src/app/api-client`. Esperado: sin diferencias. Provocar un cambio en el endpoint, ver que el diff falla, revertir.
- [ ] **Step 8:** Commit `feat: esqueleto del frontend y contrato OpenAPI`.

## Task 7: Docker

**Files:** Create `src/Frontend/Dockerfile`, `src/Frontend/nginx.conf`, `docker-compose.yml`, `.env.example`.

- [ ] **Step 1:** Dockerfiles multi-etapa copiados de `plantilla-dotnet-angular` (backend no depende de `web/`; usuario no root). `docker-compose.yml`: `postgres`, `backend`, `frontend`; credenciales por variables de `.env` (en `.gitignore`), `.env.example` con valores ficticios.
- [ ] **Step 2:** `docker compose build` y `docker compose up -d`; `curl -fsS http://localhost:<puerto>/health` → `{"estado":"ok"}`. Luego `docker compose down -v`.
- [ ] **Step 3:** Commit `ci: añadir Dockerfiles y compose`.

## Task 8: Workflows de GitHub

**Files:** Create `.github/workflows/{branch-policy,secrets-scan,ci,codeql}.yml`, `.github/scripts/validar-rama.sh`, `.github/scripts/pruebas/validar-rama.test.sh`, `.github/dependabot.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md`.

**Interfaces — Produces:** job final `ci-ok` en `ci.yml` (único check requerido).

- [ ] **Step 1: Test que falla**: `validar-rama.test.sh` con casos tabulados para `validar-rama.sh <base> <cabeza> <título>`. Debe aceptar: `develop←feature/login`, `main←develop`, `main←hotfix/x` con `fix: algo`. Debe rechazar: `main←feature/x`, `develop←main`, `develop←Feature/x`, título `Fix: Algo`, título sin tipo, tipo `foo:`. Ejecutar; esperado FAIL (script ausente).
- [ ] **Step 2:** Implementar `validar-rama.sh` según la tabla de ramas y tipos de la sección Global Constraints; salir 1 con mensaje en español. Ejecutar el test; esperado PASS.
- [ ] **Step 3:** `branch-policy.yml` (PR a `main`/`develop`, llama al script). `secrets-scan.yml` (gitleaks; diff en PR a `develop`, historial completo a `main`).
- [ ] **Step 4:** `ci.yml` con la tabla de CI del diseño: `paths-filter` (backend/frontend/docs), jobs paralelos con caché NuGet y pnpm, `concurrency` con `cancel-in-progress`, jobs solo-`main` (integración con PostgreSQL, formato como bloqueo, auditoría de dependencias, build Docker sin publicar, cliente OpenAPI al día en ambas ramas), avisos con `continue-on-error` en `develop`, disparo semanal y `ci-ok` que falla si cualquier requerido falla o se cancela y acepta `skipped` solo cuando el filtro lo omitió.
- [ ] **Step 5:** `codeql.yml` (PR a `main` + semanal, C# y JavaScript/TypeScript). `dependabot.yml` semanal hacia `develop` para `nuget`, `npm`, `docker` y `github-actions`, revisor `IstpetDev`.
- [ ] **Step 6:** Fijar todas las acciones por hash completo (resolver con `gh api repos/<owner>/<repo>/git/ref/tags/<tag>`) y anotar la versión en un comentario. `CODEOWNERS`: `* @IstpetDev`. Plantilla de PR con qué cambia, por qué, cómo se probó, capturas, casilla "sin datos reales".
- [ ] **Step 7:** Validar con `actionlint` (o `docker run rhysd/actionlint`) y simular el filtro: lista de archivos de ejemplo `src/Frontend/x.ts` solo activa frontend. Commit `ci: añadir workflows y políticas de GitHub`.

## Task 9: Verificación final

- [ ] **Step 1:** Desde cero: `dotnet test src/Backend --filter "Categoria!=Integracion"`, `pnpm --dir src/Frontend test:ci`, `docker compose build`, `.github/scripts/pruebas/validar-rama.test.sh`, `actionlint`. Pegar la salida real en el resumen; si algo falla, decirlo.
- [ ] **Step 2:** `gitleaks detect` y búsqueda de cédulas o correos reales (`grep -rEn '[0-9]{10}'`) en el repo.
- [ ] **Step 3:** Comprobar que `git status` está limpio, que `develop` y `main` apuntan al mismo commit y que no se configuró remoto ni se hizo push.
- [ ] **Step 4:** Entregar al usuario la lista de pasos manuales: crear/ajustar el remoto (confirmar `IstpetDev` vs `ItspetDev`), push, rulesets, check `ci-ok` requerido, CodeQL activo y confirmar con él los ADR 0006–0009.

## Autorrevisión

- **Cobertura del diseño:** estructura (T1–T4, T7), esqueleto (T5–T7), CI por rama (T8), ADR iniciales (T3), spec-0001 (T4), `AGENTS.md` y flujo Superpowers (T2), licencia/seguridad/propietarios (T1, T8), git local sin push (T1, T9). Sin huecos.
- **Riesgos conocidos:** falta el SDK de .NET 10 y el pnpm local es 11.1.3 (Task 0); `Testcontainers` necesita Docker en el runner (GitHub-hosted lo trae).
