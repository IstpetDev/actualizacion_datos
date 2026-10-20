# Actualización de datos — Diseño de la fundación del repositorio

**Fecha:** 2026-10-20
**Estado:** Borrador para aprobación
**Repositorio:** `https://github.com/ItspetDev/actualizacion_datos` (público)

## Intención y porqué

Instituciones educativas necesitan que docentes y otras personas actualicen sus datos personales y suban documentos e imágenes en fechas concretas. Hoy el proceso entraba por un enlace mágico enviado al correo. Ahora se hará con login. Los datos aprobados actualizan carpetas y procesos de la institución.

Esta primera versión es para **una institución concreta**, pero el producto debe poder adaptarse a cualquier otra sin una migración dolorosa.

Este diseño cubre **solo la fundación del repositorio**: documentación, decisiones de arquitectura, esqueleto del monorepo y CI. **No cubre la lógica del aplicativo**, que se desarrollará después a partir de las specs.

## Objetivos

- Monorepo con `src/Frontend` y `src/Backend`.
- Ramas, contribución y README basados en `seguridad_redes/devops/plantilla-ci-cd` (`CONTRIBUTING.md`, `README.md`).
- CI en GitHub Actions rápido, con pruebas unitarias reales sobre un esqueleto compilable.
- Decisiones registradas como ADR y cambios como specs, con plantillas que todos usen igual.
- `AGENTS.md` para que cualquier agente de IA trabaje con las mismas reglas.
- Que el modelo de datos y el diseño contemplen multi-institución y campos configurables desde el inicio.

## No objetivos

- No se implementa lógica de negocio, pantallas ni migraciones reales.
- No se configura despliegue (queda para otra etapa; ver Restricciones).
- No se hace `git push` ni se configuran reglas de GitHub sin que el usuario lo pida.
- No se decide aquí el diseño interno de formularios configurables: solo se exige no cerrar esa puerta.

## Antiobjetivos (fracasaría aunque "funcione")

- Que quede ningún dato personal real (ni cédulas, ni nombres, ni correos) en el repo, en ejemplos o en tests.
- Que un CI lento desincentive hacer PR pequeños.
- Que el diseño ate el producto a una sola institución.

## Producto (contexto para las specs futuras)

### Roles (cuatro, en este orden de jerarquía)

| Rol | Quién | Puede |
|---|---|---|
| `usuario` | Docente u otra persona cargada | Ver y editar solo sus datos y archivos dentro de una ventana abierta; enviarlos a revisión |
| `supervisor` | Revisor de la institución | Ver datos y documentos de las personas de su institución, aprobar o rechazar. **No** genera exportaciones masivas |
| `admin` | Administrador de la institución | Todo lo del supervisor, cargar la lista de personas, definir campañas y **generar exportaciones** de su institución |
| `superadmin` | Equipo de desarrollo | Crear instituciones, asignar admins y operar entre instituciones |

### Reglas de negocio acordadas

1. **Acceso:** la lista de personas permitidas se carga por número de documento (cédula). La persona entra con esa cédula como usuario. Si la contraseña coincide con el usuario (estado inicial), el sistema **obliga a cambiarla** en el primer ingreso.
2. **Correo:** de las personas no se tiene el correo. Se pide en el primer ingreso, como parte de la actualización de datos. El cómo se verifica ese correo y cómo se recupera una contraseña queda **pendiente para quien desarrolle** (ADR).
3. **Ventanas:** la actualización solo está habilitada dentro de **campañas** con fechas de inicio y fin, definidas por el admin. Fuera de campaña, el usuario no edita. Una institución puede tener una campaña a la vez o varias (a definir en la spec).
4. **Flujo de estados:** borrador → enviado → aprobado o devuelto. Un rechazo vuelve al usuario con observaciones. La granularidad del rechazo (por dato, por archivo, general) la **decide quien desarrolle** (ADR).
5. **Versionado:** solo se conserva la última versión aprobada. Sin historial de versiones de datos ni documentos.
6. **Exportación:** el admin genera un `.zip` o un Excel. El `.zip` contiene una carpeta estructurada, por ejemplo `<institucion>_<fecha>_datos/`, con un `.md` índice y una carpeta por persona (nombrada por documento o id) con toda su información ordenada. El supervisor no puede generarlo.
7. **Protección de datos:** todo dato personal está protegido. El usuario debe **aceptar el tratamiento de datos** antes de enviar. Se prevé auditoría de accesos y exportaciones (a detallar en la spec).
8. **Multitenant:** el superadmin elige la institución y los usuarios que se mandan a actualizar, y con eso se habilitan sus accesos.

### Archivos (decisión sugerida, no cerrada)

- Sugerencia: archivos en disco del servidor bajo una carpeta por institución; en la base de datos se guarda la referencia, no el binario. Los archivos los sirve el backend, **verificando permisos**, y no una carpeta pública. Detrás de una abstracción (`IAlmacenArchivos`) para poder cambiar a otro almacenamiento.
- Límites sugeridos: máximo de 10 a 15 MB por archivo, con advertencia en el frontend desde 5 MB. Tipos permitidos sugeridos: PDF, JPG, PNG.
- Quien desarrolle decide y registra el ADR.

## Restricciones y decisiones tomadas

| Tema | Decisión | Origen |
|---|---|---|
| Backend | .NET 10, Clean Architecture (`Domain`, `Application`, `Infrastructure`, `WebApi`) | Usuario; la estructura es **diseño propio** porque `plantilla-dotnet-clean` solo contiene `.gitlab-ci.yml` |
| Frontend | Angular 22, pnpm, cliente OpenAPI generado (NSwag) a partir de `openapi/v1.json`, como `plantilla-dotnet-angular` | Usuario aprobó; cliente OpenAPI propuesto por Claude, a registrar como ADR |
| Base de datos | PostgreSQL | Usuario |
| Despliegue | Docker; repo público, así que el despliegue futuro será la **opción B** de `plantilla-ci-cd` (nunca runner propio) | Usuario / plantilla |
| Multitenant | Esquema único con columna `institucion_id` y filtro global; migrable a una base por institución | Propuesta de Claude |
| Idioma | Español en código, commits y documentos; prefijo `Istpet.ActualizacionDatos` | Propuesta de Claude |
| Pruebas | xUnit en backend; en frontend, el ejecutor por defecto de Angular 22 | Propuesta de Claude |
| Correo | Hay un correo de notificaciones por configurar | Usuario |

## Estructura del repositorio

```
/
├── AGENTS.md
├── README.md                 # basado en plantilla-ci-cd, adaptado
├── CONTRIBUTING.md           # ramas, PR, secretos, flujo con Superpowers
├── SECURITY.md  LICENSE  .gitignore  .editorconfig  .gitleaks.toml
├── docker-compose.yml        # backend, frontend, PostgreSQL (desarrollo)
├── .github/
│   ├── workflows/            # branch-policy, secrets-scan, ci, codeql, (deploy después)
│   ├── dependabot.yml  CODEOWNERS  pull_request_template.md
├── docs/
│   ├── decisiones/           # ADR-0000-plantilla.md, README.md, ADR-0001-…
│   └── specs/
│       ├── README.md         # cómo usar el fichero de specs
│       ├── _plantilla/       # spec.md, plan.md, tasks.md, test-e2e.md (adaptadas) + README
│       └── spec-0001/        # "Fundación del producto"
├── openapi/v1.json
└── src/
    ├── Backend/              # sln, Domain, Application, Infrastructure, WebApi, tests
    └── Frontend/             # Angular 22 mínimo con una prueba
```

Las plantillas de spec se adaptan desde `gitlab/departamento-medico/specs/plantillas`: se sustituyen las rutas de ADR a `docs/decisiones/` y las referencias a datos clínicos por datos personales. Los ADR usan `docs/decisiones/ADR-NNNN-nombre.md` con una plantilla propia (contexto, opciones, decisión, consecuencias, estado).

## CI por rama

Parte de `plantilla-ci-cd`. "Aviso" no bloquea.

| Check | PR a `develop` | PR a `main` |
|---|---|---|
| Política de ramas y título (Conventional Commits) | Bloquea | Bloquea |
| Escaneo de secretos | Bloquea (diff del PR) | Bloquea (historial) |
| Compilación | Debug, solo lo que cambió (filtro por rutas) | Release, backend y frontend |
| Pruebas | Unitarias de .NET y Angular | Unitarias e integración con PostgreSQL en contenedor |
| Formato y lint | Aviso | Bloquea |
| Dependencias vulnerables | Aviso | Bloquea si altas o críticas |
| Cliente OpenAPI al día | Bloquea | Bloquea |
| Build de imágenes Docker | No corre | Bloquea (sin publicar) |
| CodeQL | No corre | Bloquea |
| Validación de workflows (actionlint) | Solo si cambian | Bloquea |
| `ci-ok` | Requerido | Requerido |

Velocidad: cachés de NuGet y pnpm, cancelación de ejecuciones previas del mismo PR, backend y frontend en paralelo, y ejecución completa semanal sobre `develop`. Acciones de terceros fijadas por hash. El despliegue no se implementa aquí.

## ADR iniciales (propuestos)

- ADR-0001 Clean Architecture en el backend (estructura propia).
- ADR-0002 Monorepo y ramas `main` / `develop`.
- ADR-0003 Cliente OpenAPI generado en el frontend.
- ADR-0004 Multitenancy: esquema único con `institucion_id`.
- ADR-0005 CI por niveles y filtro por rutas.
- ADR-0006 Almacenamiento de archivos — **Propuesto**, para quien desarrolle.
- ADR-0007 Autenticación con cédula, cambio obligatorio y correo — **Propuesto**, para quien desarrolle.
- ADR-0008 Granularidad del rechazo — **Propuesto**, para quien desarrolle.
- ADR-0009 Campos configurables por institución — **Propuesto**, para el futuro.

## Esqueleto: alcance

Solución .NET con las cuatro capas más un proyecto de pruebas por capa que lo requiera, cada uno con una prueba de ejemplo que pasa. Frontend Angular 22 mínimo con una prueba que pasa. Sin lógica de negocio. Un `docker-compose` que levanta PostgreSQL. Todo debe compilar y los tests unitarios deben pasar en CI desde el primer commit.

## Flujo de trabajo con Superpowers (a escribir en `AGENTS.md` y `CONTRIBUTING.md`)

Idea nueva o cambio: `brainstorming` → spec en `docs/specs/` → aprobación funcional → `writing-plans` → tareas. Toda decisión de arquitectura nueva se registra como ADR **antes** de ejecutar las tareas que dependen de ella.

## Fuentes locales para copiar y adaptar

Rutas bajo `/home/joeman/Documents/istpet-dev/`. El constructor las lee y adapta; no inventa su contenido.

| Para | Fuente |
|---|---|
| Ramas, política de PR, CONTRIBUTING, README, workflows previstos, `ci-ok` | `seguridad_redes/devops/plantilla-ci-cd/{CONTRIBUTING,README}.md` |
| Política de ramas exacta | Tabla "Ramas" de ese CONTRIBUTING: `main` solo recibe PR de `develop` y `hotfix/*`; `develop` recibe `feature/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`, `test/*`, `ci/*`. Título del PR: `<tipo>: <resumen en minúsculas>` |
| Cliente OpenAPI con NSwag, pnpm, Angular 22 | `gitlab/demos/plantilla-dotnet-angular` y `gitlab/demos/plantilla_angular` |
| Plantillas de spec | `gitlab/departamento-medico/specs/plantillas` |
| `.gitleaks.toml`, `.editorconfig`, Dockerfiles | Mismas carpetas de `demos` |

`plantilla-dotnet-clean` está vacía: la estructura de Clean Architecture es diseño propio (ADR-0001).

## Decisiones del autor del diseño (revisables)

- El esqueleto incluye un endpoint de salud mínimo, un `Dockerfile` por proyecto, un `docker-compose` con PostgreSQL y una prueba de integración sencilla. Así cada check de `main` tiene algo real que ejecutar y el CI queda en verde desde el primer commit.
- `openapi/v1.json` se genera en la compilación del backend (como en `plantilla-dotnet-angular`) y el cliente NSwag generado **se versiona**. El check compara lo regenerado con lo versionado.
- Si Angular 22 no pudiera instalarse, se usa la última versión disponible y se anota en un ADR.
- `git init` local con ramas `main` y `develop` y un commit inicial; sin push. Las reglas de protección de GitHub quedan como pasos manuales documentados.
- `spec-0001` es una spec funcional del producto, escrita con la plantilla a partir de los roles y reglas de este diseño; los vacíos quedan como puntos abiertos.

## Licencia, seguridad y propietarios (decididos por el usuario)

- **Licencia:** PolyForm Noncommercial 1.0.0 (confirmada por el usuario). No es una licencia de código abierto según la OSI; el repo sigue siendo público y legible.
- **Contacto de seguridad:** `istpetdev@istpet.edu.ec`.
- **Propietario en `CODEOWNERS` y `dependabot`:** `@IstpetDev` (grafía dada por el usuario). La URL del remoto que le entregaron dice `ItspetDev`; el constructor usa `@IstpetDev` en `CODEOWNERS` y, al configurar el remoto, comprueba con el usuario cuál grafía es la real.

## Qué queda al criterio de quien construya

Versiones exactas de paquetes, nombres internos de clases y carpetas dentro de cada capa, herramienta de lint del frontend, contenido literal de `AGENTS.md` y redacción de los ADR (respetando las decisiones de arriba), y las configuraciones de `.editorconfig` y `.gitleaks.toml`.

## Fuera de este diseño (decide el equipo después)

Los puntos marcados "Propuesto" en los ADR, las plantillas de datos concretas de la institución, la duración de la sesión, el texto legal del consentimiento y el destino de despliegue.
