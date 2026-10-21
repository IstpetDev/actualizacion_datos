# AGENTS.md

Reglas para agentes de IA (y personas) que trabajan en este repositorio. Idioma: **español** en código, commits, documentos y mensajes. Prefijo de proyectos: `Istpet.ActualizacionDatos`.

## Qué es

Aplicación para que personas de una institución educativa actualicen sus datos y documentos dentro de campañas con fechas; un supervisor los revisa y un admin exporta. Roles: `usuario`, `supervisor`, `admin`, `superadmin`. Multi-institución. Más contexto en [README.md](README.md).

## Stack

- Backend: .NET 10, Clean Architecture (`Domain`, `Application`, `Infrastructure`, `WebApi`), xUnit, en `src/Backend`.
- Frontend: Angular 22, pnpm, cliente OpenAPI generado con NSwag, en `src/Frontend`.
- Base de datos: PostgreSQL. Despliegue: Docker (aún no implementado).
- Entorno: .NET SDK 10.0.100+ (`global.json`), Node `^22.22.3 || ^24.15.0 || >=26` (`src/Frontend/.nvmrc`, CI y Docker usan Node 24), pnpm &gt;=12.4 (12.4.1), Docker.

## Comandos

```bash
dotnet build src/Backend
dotnet test src/Backend
dotnet test src/Backend --filter "Categoria!=Integracion"   # unitarias, sin Docker
pnpm --dir src/Frontend test:ci
dotnet format src/Backend
pnpm --dir src/Frontend lint
pnpm --dir src/Frontend format   # prettier --write; format:check solo verifica
cp .env.example .env && docker compose up --build
```

Ejecutar compilación y pruebas antes de dar una tarea por terminada, y reportar la salida real.

## Ramas y commits

- `main`: solo PR desde `develop` y `hotfix/*`. `develop`: PR desde `feature|fix|docs|chore|refactor|test|ci/*` y desde `main` solo para devolver un hotfix (título p. ej. `chore: devolver hotfix de main a develop`). Solo `dependabot[bot]` puede abrir PR a `develop` desde `dependabot/*`.
- Nombre de rama: `<tipo>/<descripcion-corta>` en minúsculas con guiones.
- Título de PR (se valida): `<tipo>: <resumen en minúsculas>`; tipos `feat fix docs chore refactor test ci`. Los commits no se validan; se recomienda Conventional Commits (`<tipo>: <resumen>`) sin exigir minúsculas.
- Commits pequeños, en español. Detalle en [CONTRIBUTING.md](CONTRIBUTING.md).

## Flujo de trabajo

Idea nueva o cambio: `brainstorming` -&gt; spec en `docs/specs/` -&gt; aprobación funcional -&gt; `writing-plans` -&gt; tareas. No programar sin spec aprobada.

## Reglas

- **No datos reales.** Ninguna cédula, nombre ni correo reales en código, ejemplos, pruebas, capturas ni documentos. Usar datos inventados evidentes.
- **Decisiones nuevas -&gt; ADR.** Toda decisión de arquitectura se registra en `docs/decisiones/` antes de ejecutar las tareas que dependen de ella. No cerrar por cuenta propia los ADR en estado "Propuesto".
- Sin lógica de negocio fuera de lo que pida la spec aprobada.
- Si cambia la API, regenerar `openapi/v1.json` y el cliente del frontend en el mismo cambio.
- Acciones de terceros en workflows fijadas por hash de commit.

## Rutas de `docs/`

- [docs/decisiones/](docs/decisiones/README.md): ADR y plantilla `ADR-0000-plantilla.md`.
- [docs/specs/](docs/specs/README.md): guía, `_plantilla/` y `spec-NNNN/`.
- [docs/superpowers/](docs/superpowers/specs/2026-10-20-fundacion-repositorio-design.md): diseño y plan de la fundación.

## Qué NO hacer

- **No cambiar reglas de GitHub** (rulesets, protección de ramas, environments, CodeQL, Dependabot) ni configurar el remoto. Son pasos manuales documentados en el [README.md](README.md#pasos-manuales-en-github).
- **No tocar secretos**: no crear, leer, mover ni escribir credenciales, tokens ni cadenas de conexión reales; no desactivar el escaneo de secretos.
- **No usar datos personales reales** bajo ningún pretexto.
- No usar un runner propio ni proponer uno: el repositorio es público; el despliegue futuro es por empuje desde GitHub a red privada.
- No saltarse hooks ni checks (`--no-verify`) ni reescribir historial compartido.