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

Requisitos: Docker, .NET SDK 10.0.100+ (`global.json`), Node.js `^22.22.3 || ^24.15.0 || >=26` (rango de `engines` en `src/Frontend/package.json`; `src/Frontend/.nvmrc`, CI y Docker usan Node 24), pnpm 12.4+.

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

Para probar los endpoints desde el navegador, en `Development` el backend sirve Scalar en `/scalar/v1` (con Docker: `http://127.0.0.1:8080/scalar/v1`, o el `BACKEND_PUERTO` de su `.env`). Llame primero a `POST /api/auth/login`; la cookie de sesión queda en el navegador y se envía en las llamadas siguientes. En producción no existe. Decisión: [ADR-0016](docs/decisiones/ADR-0016-interfaz-de-prueba-de-la-api.md).

Para regenerarlos tras cambiar la API:

```bash
dotnet build src/Backend                  # en Debug regenera openapi/v1.json y el cliente
pnpm --dir src/Frontend generar:api       # equivalente: ejecuta ese mismo build de la WebApi en Debug
```

Subir en el mismo PR los cambios de `openapi/v1.json` y del cliente. Decisión: [ADR-0003](docs/decisiones/ADR-0003-cliente-openapi-generado.md).

## Modelo de ramas

Dos ramas permanentes: `main` (estable; solo recibe PR de `develop` y `hotfix/*`) y `develop` (integración; recibe `feature|fix|docs|chore|refactor|test|ci/*` y, solo para devolver un hotfix, `main`; también los PR que abre `dependabot[bot]` desde `dependabot/*`). Nadie hace `push` directo. Detalle de nombres, flujo y hotfix en [CONTRIBUTING.md](CONTRIBUTING.md). Decisión: [ADR-0002](docs/decisiones/ADR-0002-monorepo-y-ramas.md).

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
| `ci.yml` | PR y push a `develop` o `main`, semanal (sobre `develop`) y manual | Filtro por rutas, compilación, pruebas, formato, dependencias, cliente OpenAPI, imágenes Docker y actionlint; llama a los dos siguientes y cierra con `ci-ok` |
| `branch-policy.yml` | Lo llama `ci.yml` en cada PR | Valida origen, nombre de rama y título (script `.github/scripts/validar-rama.sh`) |
| `secrets-scan.yml` | Lo llama `ci.yml` | Escaneo de secretos con gitleaks (commits del PR en `develop`; historial completo en `main` y semanal) |
| `codeql.yml` | PR a `main`, semanal y manual | Análisis estático de C# y JavaScript/TypeScript |
| `dependabot.yml` | Semanal | PRs de actualización a `develop` (nuget, npm, docker, docker-compose, github-actions) |

La política de ramas y el escaneo de secretos se ejecutan dentro de `ci.yml` para que `ci-ok` sea el único check requerido. Editar el PR (título o rama base) vuelve a ejecutar el CI.

Todas las acciones de terceros se fijan por hash de commit, no solo por versión. Los workflows viven en [.github/workflows/](.github/workflows/).

## Despliegue

El destino de producción es Docker sobre un servidor en la red privada institucional, implementado bajo la **Opción B: Empuje por red privada** ([ADR-0011](docs/decisiones/ADR-0011-despliegue-a-produccion.md)). Por seguridad, nunca se utiliza un GitHub Self-Hosted Runner.

### Flujo del despliegue automático (`deploy.yml`)

1. **Disparador:** Se ejecuta automáticamente tras fusionar un PR a la rama `main` (o manualmente por `workflow_dispatch`).
2. **Construcción:** El runner de GitHub Actions construye las imágenes Docker de backend y frontend, etiquetándolas con el SHA del commit (`${{ github.sha }}`) y `latest`.
3. **Conexión privada:** El workflow se conecta de forma efímera a la red privada institucional mediante la acción oficial de **Tailscale** (`tailscale/github-action`).
4. **Transferencia de imágenes:** Las imágenes se transfieren comprimidas por SSH directo (`docker save ... | gzip | ssh ... gunzip | docker load`) sin necesidad de un registro intermedio de imágenes.
5. **Migraciones explícitas:** El contenedor del backend ejecuta `docker compose -f docker-compose.prod.yml run --rm backend --migrar`. Si la migración falla, el despliegue se detiene de inmediato sin tocar los servicios productivos en ejecución.
6. **Arranque y origen único:** Se recrean los servicios (`docker compose -f docker-compose.prod.yml up -d --remove-orphans`). Un proxy inverso Nginx local (`actualizacion_proxy`) unifica el Frontend y la API bajo el mismo origen, garantizando el cumplimiento de la cookie de sesión `SameSite=Strict` ([ADR-0007](docs/decisiones/ADR-0007-autenticacion-con-cedula.md)).
7. **Exposición:** **Cloudflare Tunnel (`cloudflared`)** apunta al puerto local del proxy inverso (8088), publicando la aplicación en el dominio institucional sin abrir ningún puerto entrante en el router ni en el firewall.
8. **Smoke Tests:** Se verifica que `/health` responda HTTP 200 con `{"estado":"ok"}`.

### Procedimiento de reversión (*Rollback*)

Si se detecta un incidente en producción tras un despliegue:
1. Ir a la pestaña **Actions** en GitHub y seleccionar el workflow **Reversión en producción** (`rollback.yml`).
2. Hacer clic en **Run workflow**, seleccionar la rama `main` e introducir el SHA del commit de la versión previa que se desea restaurar.
3. El workflow conectará por VPN y reconfigurará los contenedores con dicha versión en menos de 60 segundos. *Nota: la reversión cambia los contenedores de software; no revierte migraciones de base de datos.*

## Pasos manuales en GitHub

Estas acciones las hace una persona con permisos de administración; el código del repositorio no las ejecuta.

1. Remoto `https://github.com/IstpetDev/actualizacion_datos` (organización `IstpetDev`) y primer `push` de `main` y `develop`: hecho. El equipo `@IstpetDev/hijos-del-ing-henry` es el propietario en `CODEOWNERS` y necesita permiso de escritura en el repositorio (Settings → Collaborators and teams).
   - `main` y `develop` deben subirse desde el mismo commit: la política de ramas usa el script de la rama base, que tiene que existir en ambas.
2. Crear los *rulesets* de GitHub para `main` y `develop`:
   - PR obligatorio (sin `push` directo).
   - Check `ci-ok` requerido.
   - Sin force push ni borrado.
   - Recomendado (ruleset opcional): exigir revisión de code owners en `develop` para `.github/**`, porque los workflows corren desde la referencia de fusión del PR.
   - En `main`: al menos una aprobación, revisión de `CODEOWNERS` y la regla *Require code scanning results* (CodeQL), que es la que hace bloqueante a CodeQL.
3. Fijar `main` como rama por defecto y proteger también `develop`.
4. Activar el escaneo de secretos con *push protection* si el plan lo permite. CodeQL corre con `codeql.yml` (configuración avanzada): **no** activar la configuración por defecto de CodeQL, porque entra en conflicto con el workflow.
5. Activar las alertas de Dependabot. Las actualizaciones de versión llegan a `develop` con `dependabot.yml`; las *security updates* automáticas abren PR hacia `main` y la política de ramas las rechaza, así que conviene dejarlas desactivadas y aplicar el arreglo desde `develop`.
6. Configurar el **Environment `produccion`**:
   - En `Settings` → `Environments`, crear el entorno `produccion` y restringir el despliegue únicamente a la rama `main`.
   - Agregar los siguientes secretos en el entorno:
     - `TAILSCALE_AUTHKEY`: Clave de autenticación efímera generada en la consola de Tailscale.
     - `SSH_HOST`: Dirección IP privada del servidor dentro de la red Tailscale (ej. `100.x.y.z`).
     - `SSH_USER`: Nombre del usuario de sistema en el servidor de producción.
     - `SSH_PRIVATE_KEY`: Clave privada SSH autorizada en el servidor para despliegues.
   - (Opcional) Variable de entorno `DEPLOY_DIR`: Ruta base en el servidor (por defecto `C:/actualizacion_datos`).

## Qué no se debe copiar al repositorio

- Nombres de servidores, IP ni rutas internas.
- Claves, tokens ni cadenas de conexión reales.
- Datos personales reales, ni siquiera en ejemplos o pruebas.
