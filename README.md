# Actualización de datos

Aplicación para que docentes y otras personas de una institución educativa actualicen sus datos personales y suban documentos e imágenes dentro de fechas concretas (campañas). Una persona con el rol de revisión aprueba o devuelve lo enviado, y los datos aprobados alimentan las carpetas y procesos de la institución.

La primera versión es para una institución concreta, pero el diseño contempla varias instituciones y campos configurables desde el inicio.

**Estado:** fundación del repositorio. Hay esqueleto, documentación y CI; la lógica del producto se desarrollará a partir de las specs en [docs/specs/](docs/specs/README.md).

Guía para contribuir: [CONTRIBUTING.md](CONTRIBUTING.md). Reglas para agentes de IA: [AGENTS.md](AGENTS.md). Seguridad: [SECURITY.md](SECURITY.md). Licencia: PolyForm Noncommercial 1.0.0 ([LICENSE](LICENSE)); no es una licencia de código abierto según la OSI, aunque el repositorio es público.

## Roles

Cuatro roles, en orden de jerarquía:

| Rol | Quién | Puede |
| --- | --- | --- |
| `usuario` | Docente u otra persona cargada | Ver y editar solo sus datos y archivos dentro de una campaña abierta; enviarlos a revisión |
| `supervisor` | Revisor de la institución | Ver datos y documentos de las personas de su institución, aprobar o rechazar. No genera exportaciones masivas |
| `admin` | Administrador de la institución | Todo lo del supervisor, cargar la lista de personas, definir campañas y generar exportaciones de su institución |
| `superadmin` | Equipo de desarrollo | Crear instituciones, asignar admins y operar entre instituciones |

Las reglas de negocio completas (acceso por cédula, campañas, estados, exportación, protección de datos) están en el diseño y en la spec funcional: [docs/superpowers/specs/2026-10-20-fundacion-repositorio-design.md](docs/superpowers/specs/2026-10-20-fundacion-repositorio-design.md) y [docs/specs/spec-0001/](docs/specs/spec-0001/).

## Mapa de carpetas

```
/
├── AGENTS.md  README.md  CONTRIBUTING.md  SECURITY.md  LICENSE
├── docker-compose.yml        # backend, frontend y PostgreSQL (desarrollo)
├── .github/                  # workflows, dependabot, CODEOWNERS, plantilla de PR
├── docs/
│   ├── decisiones/           # ADR (decisiones de arquitectura)
│   ├── specs/                # specs por cambio: _plantilla/ y spec-NNNN/
│   └── superpowers/          # diseño y plan de la fundación
├── openapi/v1.json           # contrato de la API, generado
└── src/
    ├── Backend/              # .NET 10, Clean Architecture
    └── Frontend/             # Angular 22 con cliente generado
```

- Backend: `Istpet.ActualizacionDatos.{Domain,Application,Infrastructure,WebApi}` más proyectos de pruebas. Ver [ADR-0001](docs/decisiones/ADR-0001-clean-architecture-backend.md).
- Frontend: Angular 22 con pnpm. El cliente de la API se genera con NSwag a partir de `openapi/v1.json`.
- Base de datos: PostgreSQL.

## Cómo levantar con Docker

Requisitos: Docker, .NET SDK 10.0.100+ (`global.json`), Node.js 22.22.3+ o 26+, pnpm 12.4+.

```bash
cp .env.example .env   # valores ficticios de desarrollo
docker compose up --build
```

Levanta PostgreSQL, el backend y el frontend para desarrollo. Las credenciales de desarrollo son valores locales de ejemplo; nunca se usan en otro entorno.

Sin Docker, para trabajar por partes:

```bash
dotnet build src/Backend
dotnet test src/Backend
pnpm --dir src/Frontend install
pnpm --dir src/Frontend test:ci
```

## Cliente OpenAPI

El backend exporta el contrato a `openapi/v1.json` al compilar. El cliente de Angular (`src/Frontend/src/app/api-client/`) se genera con NSwag a partir de ese archivo y **se versiona**. El CI regenera ambos y falla si lo versionado está desactualizado.

Para regenerarlos tras cambiar la API:

```bash
dotnet build src/Backend                  # actualiza openapi/v1.json
pnpm --dir src/Frontend generar:api       # regenera el cliente
```

Subir en el mismo PR los cambios de `openapi/v1.json` y del cliente. Decisión: [ADR-0003](docs/decisiones/ADR-0003-cliente-openapi-generado.md).

## Modelo de ramas

Dos ramas permanentes: `main` (estable; solo recibe PR de `develop` y `hotfix/*`) y `develop` (integración; recibe `feature|fix|docs|chore|refactor|test|ci/*` y, solo para devolver un hotfix, `main`). Nadie hace `push` directo. Detalle de nombres, flujo y hotfix en [CONTRIBUTING.md](CONTRIBUTING.md). Decisión: [ADR-0002](docs/decisiones/ADR-0002-monorepo-y-ramas.md).

## CI por niveles

`develop` recibe un CI rápido que bloquea solo lo esencial. `main` recibe el CI completo. "Aviso" significa que el check corre y anota el PR, pero no impide fusionar.

| Check | PR hacia `develop` | PR hacia `main` |
| --- | --- | --- |
| Política de ramas y título del PR | Bloquea | Bloquea |
| Escaneo de secretos | Bloquea (diff del PR) | Bloquea (historial completo) |
| Compilación | Debug, solo lo que cambió (filtro por rutas) | Release, backend y frontend |
| Pruebas | Unitarias de .NET y Angular | Unitarias e integración con PostgreSQL en contenedor |
| Formato y lint | Aviso | Bloquea |
| Dependencias vulnerables | Aviso | Bloquea si son altas o críticas |
| Cliente OpenAPI al día | Bloquea | Bloquea |
| Build de imágenes Docker | No corre | Bloquea (sin publicar) |
| CodeQL | No corre | Bloquea |
| Validación de workflows (actionlint) | Solo si cambian | Bloquea |
| `ci-ok` (agregador) | Requerido | Requerido |

Velocidad: cachés de NuGet y pnpm, cancelación de ejecuciones previas del mismo PR, backend y frontend en paralelo, y ejecución completa semanal sobre `develop`. Decisión: [ADR-0005](docs/decisiones/ADR-0005-ci-por-niveles.md).

## Workflows

| Archivo | Se dispara en | Qué hace |
| --- | --- | --- |
| `branch-policy.yml` | PR a `develop` o `main` | Valida origen, nombre de rama y título |
| `secrets-scan.yml` | PR y push | Escaneo de secretos (diff en `develop`, completo en `main`) |
| `ci.yml` | PR, push a `develop` y semanal | Filtro por rutas, compilación, pruebas, formato, dependencias; cierra con `ci-ok` |
| `codeql.yml` | PR a `main` y semanal | Análisis estático de C# y JavaScript/TypeScript |
| `dependabot.yml` | Semanal | PRs de actualización a `develop` (nuget, npm, docker, github-actions) |

Todas las acciones de terceros se fijan por hash de commit, no solo por versión. Los workflows viven en [.github/workflows/](.github/workflows/).

## Despliegue

El destino es Docker. El despliegue **no está implementado** en esta etapa. Como el repositorio es público, el despliegue futuro será la opción B; nunca un runner propio.

| Opción | Cómo funciona | Cuándo elegirla |
| --- | --- | --- |
| **A. Híbrida** | Compila GitHub; un runner propio en el servidor copia el resultado | Repositorio **privado** |
| **B. Empuje por red privada** | Compila y despliega GitHub, que se une a una red privada como nodo temporal y despliega por SSH | Repositorio **público** (la elegida) |
| **C. Compila el servidor** | El runner propio compila todo | No recomendada |

**Regla de oro:** no usar un runner propio en un repositorio público. Un PR desde un fork podría ejecutar código en el servidor.

La configuración de producción vive en el servidor o en el *environment* de GitHub, nunca en el repositorio ni en la imagen. Ningún dato real ni secreto se incluye en las imágenes.

## Pasos manuales en GitHub

Estas acciones las hace una persona con permisos; el código del repositorio no las ejecuta.

1. Crear o ajustar el remoto y confirmar la grafía del propietario (`IstpetDev` o `ItspetDev`), y hacer el primer `push` de `main` y `develop`.
2. Crear los *rulesets* de GitHub para `main` y `develop`:
   - PR obligatorio (sin `push` directo).
   - Check `ci-ok` requerido.
   - Sin force push ni borrado.
   - En `main`: al menos una aprobación y revisión de `CODEOWNERS`.
3. Fijar `main` como rama por defecto y proteger también `develop`.
4. Activar CodeQL y el escaneo de secretos con *push protection* si el plan lo permite.
5. Activar Dependabot (alertas y actualizaciones de seguridad).
6. Al implementar el despliegue (opción B), crear el *environment* con sus variables y secretos, restringido a `main`.

## Qué no se debe copiar al repositorio

- Nombres de servidores, IP ni rutas internas.
- Claves, tokens ni cadenas de conexión reales.
- Datos personales reales, ni siquiera en ejemplos o pruebas.
