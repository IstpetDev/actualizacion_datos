# Guía de contribución

Esta guía describe cómo se trabaja en este repositorio. Es público: no debe contener nombres de servidores, direcciones IP, credenciales ni datos personales reales.

## Principios

- Nadie hace `push` directo a `main` ni a `develop`. Todo cambio entra por Pull Request (PR).
- `main` es la rama estable. Fusionar en `main` no despliega nada por ahora (el despliegue se definirá en otra etapa; ver [README.md](README.md#despliegue)).
- `develop` es la integración diaria.
- Ninguna credencial entra al repositorio, ni siquiera "temporalmente". Una credencial subida queda en el historial aunque se borre después, y debe considerarse comprometida.
- Ningún dato personal real (cédulas, nombres, correos) en código, ejemplos, pruebas ni capturas. Usar datos inventados.

## Ramas

| Rama | Para qué | Acepta PRs desde |
| --- | --- | --- |
| `main` | Estable. Rama por defecto | Solo `develop` y `hotfix/*` |
| `develop` | Integración | `feature/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`, `test/*`, `ci/*`, `main` (solo para devolver un hotfix) y `dependabot/*` (solo PR abiertos por `dependabot[bot]`) |

**Nombre de la rama:** `<tipo>/<descripcion-corta>`, en minúsculas y con guiones. Ejemplos: `feature/login-con-cedula`, `fix/fecha-fin-de-campana`, `hotfix/fecha-fin-de-campana`. Opcionalmente con el número de la incidencia: `feature/123-login-con-cedula`.

## Flujo normal

1. Crear la rama desde `develop` actualizado.
2. Hacer commits pequeños con mensajes claros, en español.
3. Abrir un PR hacia `develop`. El título sigue [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).
4. Esperar a que pasen los checks y atender la revisión.
5. Fusionar. La rama de trabajo se borra.
6. Cada cierto tiempo, un PR de release `develop` → `main` agrupa lo acumulado. Pasa el CI completo y exige al menos una aprobación.

## Incidencias y ramas

Por defecto, una incidencia = una rama = un PR. Vincula la rama a la incidencia con `gh issue develop <n> --base develop --name <tipo>/<n>-<descripcion>`.

Los PR a `develop` no cierran la incidencia solos, porque `main` es la rama por defecto. Ciérrala a mano al fusionar el último PR.

Si una incidencia es grande, divídela en sub-incidencias (lista de tareas `- [ ] #N` en la incidencia padre), cada una con su rama y su PR.

Si una incidencia necesita varias ramas:

- Todas empiezan por el número: `feature/7-login-api`, `feature/7-login-correo`. Así `gh issue develop --list 7` las muestra todas.
- Todas salen de `develop`, nunca una de otra. Si una depende de otra, espera a que se fusione la primera.
- Los PR intermedios escriben "Parte de #7" en la descripción; solo el último escribe "Cierra #7".
- Evita ramas paralelas que toquen los mismos archivos.

## Hotfix (arreglo urgente)

1. Crear `hotfix/<descripcion>` desde `main`.
2. Abrir el PR hacia `main`. Pasa el mismo CI completo que un release, aunque sea urgente.
3. Tras fusionar, **abrir otro PR de `main` hacia `develop`** para no perder el arreglo. `develop` acepta PRs desde `main` solo para esto; el título sigue el formato, por ejemplo `chore: devolver hotfix de main a develop`.

## Título del PR

Formato: `<tipo>: <resumen en minúsculas>`.

| Tipo | Uso |
| --- | --- |
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Solo documentación |
| `chore` | Mantenimiento sin efecto funcional |
| `refactor` | Reorganización sin cambio de comportamiento |
| `test` | Pruebas |
| `ci` | Flujos de integración o despliegue |

Ejemplo: `fix: evitar fecha de fin anterior al inicio de la campaña`.

Reglas exactas (las comprueba `.github/scripts/validar-rama.sh`):

- Un solo espacio después de los dos puntos; sin ámbito (`feat(api):`) ni `!`.
- El resumen empieza por una letra minúscula o un dígito y no contiene mayúsculas, tampoco acentuadas (`fix: Algo` y `fix: corregir Error` se rechazan).
- Excepción: los PR que abre `dependabot[bot]` desde `dependabot/*` pueden llevar mayúsculas en el nombre del paquete. Una persona que use una rama `dependabot/*` no tiene esa excepción y su PR se rechaza.

## Flujo con Superpowers

Toda idea nueva o cambio de comportamiento sigue este orden:

1. **`brainstorming`**: aclarar la intención, las opciones y los riesgos.
2. **Spec** en `docs/specs/` (copiar `docs/specs/_plantilla/`). Ver [docs/specs/README.md](docs/specs/README.md).
3. **Aprobación** funcional de la spec por quien corresponda. Sin aprobación no se planifica ni se programa.
4. **`writing-plans`**: convertir la spec aprobada en un plan.
5. **Tareas**: ejecutar el plan tarea por tarea, con pruebas.

**ADR antes de las tareas que dependen de él.** Toda decisión de arquitectura nueva se registra en `docs/decisiones/` (plantilla `ADR-0000-plantilla.md`, guía en [docs/decisiones/README.md](docs/decisiones/README.md)) *antes* de ejecutar las tareas que la necesitan. Los ADR en estado "Propuesto" los cierra quien desarrolla.

## Pruebas locales

Durante el desarrollo, ejecuta primero las pruebas directamente relacionadas con el cambio. Antes de terminar, compila el área modificada y vuelve a ejecutar las pruebas pertinentes. Si cambias contratos, código compartido, configuración o infraestructura de pruebas, ejecuta la suite completa de cada área afectada. Por ejemplo, un cambio en la API y su cliente requiere comprobar backend y frontend. Registra los comandos, el número de pruebas ejecutadas y el resultado real; **cero pruebas encontradas no cuenta como verificación**.

### Backend: proyecto, clase y método

Ubica cada prueba en `Domain.Tests` para reglas de dominio, `Application.Tests` para casos de uso o validación, y `WebApi.Tests` para HTTP, infraestructura o persistencia. Nombra la clase por la unidad o comportamiento seguido de `Tests` y agrupa allí sus escenarios. Una clase `partial` puede distribuir la misma unidad en varios archivos. No hace falta reorganizar las clases existentes. Las pruebas que requieren PostgreSQL con Testcontainers se guardan en `WebApi.Tests/Integracion/` y llevan `[Trait("Categoria", "Integracion")]` en la clase; así las reconoce el filtro existente de CI.

Desde la raíz del repositorio, estos ejemplos ejecutan pruebas unitarias sin Docker:

```bash
# Todas las pruebas del proyecto de dominio.
dotnet test src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests --filter 'Categoria!=Integracion'

# Una clase de WebApi.Tests. El nombre completo evita coincidencias parciales.
dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter 'FullyQualifiedName~Istpet.ActualizacionDatos.WebApi.Tests.CuentaBancariaTests.&Categoria!=Integracion'

# Un método de esa clase.
dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter 'FullyQualifiedName~Istpet.ActualizacionDatos.WebApi.Tests.CuentaBancariaTests.Sin_sesion_responde_401&Categoria!=Integracion'
```

Para todas las unitarias del backend: `dotnet test src/Backend --filter 'Categoria!=Integracion'`. Para incluir integración se necesita Docker y se usa `dotnet test src/Backend`.

### Frontend: archivo y carpeta

Coloca cada `.spec.ts` junto al componente, servicio o guardia que verifica. Usa el mismo nombre base (`mi-cuenta-bancaria.component.ts` → `mi-cuenta-bancaria.component.spec.ts`) y agrupa escenarios de esa unidad. Describe el comportamiento observable en `describe` e `it`; no hace falta dividir los specs existentes.

Las rutas de `--include` son relativas a `src/Frontend/src`, no a la raíz del repositorio. Desde la raíz:

```bash
# Un componente.
pnpm --dir src/Frontend exec ng test --watch=false --include=app/features/cuenta-bancaria/mi-cuenta-bancaria.component.spec.ts

# Todos los specs de una carpeta funcional.
pnpm --dir src/Frontend exec ng test --watch=false '--include=app/features/cuenta-bancaria/**/*.spec.ts'
```

Para toda la suite del frontend: `pnpm --dir src/Frontend test:ci`. El comando `pnpm --dir src/Frontend test` activa observación de cambios en una terminal interactiva; usa `--watch=false` en una ejecución puntual.

### Relación con CI

La selección anterior es solo local. El CI de [ADR-0005](docs/decisiones/ADR-0005-ci-por-niveles.md) conserva su filtro por rutas: en PR a `develop` ejecuta todas las unitarias del área afectada; en PR a `main` ejecuta unitarias e integración, y también hace una ejecución completa semanal sobre `develop`. Ningún comando local selectivo se añade al workflow.

## Qué comprueban los PR

Los checks se ejecutan solos. El agregador `ci-ok` debe estar en verde para fusionar. "Aviso" significa que corre y anota el PR, pero no impide fusionar.

| Check | PR a `develop` | PR a `main` |
| --- | --- | --- |
| Política de ramas y título | Bloquea | Bloquea |
| Escaneo de secretos | Bloquea (diff del PR) | Bloquea (historial) |
| Compilación | Debug, solo lo que cambió | Release, backend y frontend |
| Pruebas | Unitarias de .NET y Angular | Unitarias e integración con PostgreSQL |
| Formato y lint | Aviso | Bloquea |
| Dependencias vulnerables | Aviso | Bloquea si son altas o críticas |
| Cliente OpenAPI al día | Bloquea | Bloquea |
| Build de imágenes Docker | No corre | Bloquea (sin publicar) |
| CodeQL | No corre | Bloquea |
| Validación de workflows | Solo si cambian | Bloquea |
| `ci-ok` | Requerido | Requerido |

Qué hacer si falla un check:

- **Escaneo de secretos:** no basta con borrar la línea. Avisar al responsable para rotar la credencial.
- **Compilación o pruebas:** reproducir en local con `dotnet build src/Backend`, `dotnet test src/Backend` y `pnpm --dir src/Frontend test:ci`.
- **Formato:** si falla `dotnet format`, ejecutar `dotnet format src/Backend`; si falla `format:check`, ejecutar `pnpm --dir src/Frontend format`; los fallos de lint se corrigen con `pnpm --dir src/Frontend lint`. Subir el cambio.
- **Cliente OpenAPI:** regenerarlo (ver [README.md](README.md#cliente-openapi)) y versionar el resultado.
- **Dependencias:** actualizar el paquete señalado o justificar la excepción en el PR.

## Secretos y configuración

- No subir contraseñas, cadenas de conexión, claves privadas ni tokens. Tampoco en comentarios ni en archivos de ejemplo.
- La configuración real vive en variables de entorno o en el entorno de despliegue, no en el repositorio. Un `appsettings.Development.json` local (el que ASP.NET Core carga en Development) está en `.gitignore` y en `.dockerignore`: no se publica ni entra en la imagen. Aun así, no poner secretos en ningún `appsettings*.json`; usar variables de entorno (por ejemplo `ConnectionStrings__Default` en `.env`) o *user-secrets*.
- En Angular todo lo que se compila es visible en el navegador: solo configuración pública, como la URL de la API.
- Si cree haber subido una credencial: avisar de inmediato; no intentar limpiar el historial por su cuenta.

## Revisión

- `main` exige al menos una aprobación. `CODEOWNERS` indica quién revisa cada ruta.
- Describir en el PR qué cambia, por qué y cómo se probó. Incluir capturas si cambia la interfaz.
- Mantener los PR pequeños. Un cambio grande conviene dividirlo.

## Entorno local

Requisitos:

- .NET SDK 10.0.100 o superior (lo fija `global.json`).
- Node.js `^22.22.3 || ^24.15.0 || >=26` (rango de `engines` en `src/Frontend/package.json`); `src/Frontend/.nvmrc`, CI y Docker usan Node 24.
- pnpm 12.4 o superior (se probó con 12.4.1).
- Docker, para PostgreSQL y las imágenes.

Instalar y ejecutar:

```bash
pnpm --dir src/Frontend install      # dependencias del frontend
dotnet build src/Backend             # compilar el backend
cp .env.example .env && docker compose up --build   # levantar PostgreSQL y la aplicación
```

Pruebas y calidad:

```bash
dotnet test src/Backend                                        # todas las pruebas del backend
dotnet test src/Backend --filter "Categoria!=Integracion"      # solo unitarias (no requiere Docker)
pnpm --dir src/Frontend test:ci                                # pruebas del frontend
dotnet format src/Backend                                      # formato del backend
pnpm --dir src/Frontend lint                                   # lint del frontend
pnpm --dir src/Frontend format                                 # formato del frontend (prettier --write)
```

## Seguridad

Los problemas de seguridad no se reportan en incidencias públicas. Ver [SECURITY.md](SECURITY.md) o escribir a `istpetdev@istpet.edu.ec`.
