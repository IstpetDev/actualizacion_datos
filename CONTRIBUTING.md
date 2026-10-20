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
| `develop` | Integración | `feature/*`, `fix/*`, `docs/*`, `chore/*`, `refactor/*`, `test/*`, `ci/*` y `main` (solo para devolver un hotfix) |

**Nombre de la rama:** `<tipo>/<descripcion-corta>`, en minúsculas y con guiones. Ejemplos: `feature/login-con-cedula`, `fix/fecha-fin-de-campana`, `hotfix/fecha-fin-de-campana`. Opcionalmente con el número de la incidencia: `feature/123-login-con-cedula`.

## Flujo normal

1. Crear la rama desde `develop` actualizado.
2. Hacer commits pequeños con mensajes claros, en español.
3. Abrir un PR hacia `develop`. El título sigue [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).
4. Esperar a que pasen los checks y atender la revisión.
5. Fusionar. La rama de trabajo se borra.
6. Cada cierto tiempo, un PR de release `develop` → `main` agrupa lo acumulado. Pasa el CI completo y exige al menos una aprobación.

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

## Flujo con Superpowers

Toda idea nueva o cambio de comportamiento sigue este orden:

1. **`brainstorming`**: aclarar la intención, las opciones y los riesgos.
2. **Spec** en `docs/specs/` (copiar `docs/specs/_plantilla/`). Ver [docs/specs/README.md](docs/specs/README.md).
3. **Aprobación** funcional de la spec por quien corresponda. Sin aprobación no se planifica ni se programa.
4. **`writing-plans`**: convertir la spec aprobada en un plan.
5. **Tareas**: ejecutar el plan tarea por tarea, con pruebas.

**ADR antes de las tareas que dependen de él.** Toda decisión de arquitectura nueva se registra en `docs/decisiones/` (plantilla `ADR-0000-plantilla.md`, guía en [docs/decisiones/README.md](docs/decisiones/README.md)) *antes* de ejecutar las tareas que la necesitan. Los ADR en estado "Propuesto" los cierra quien desarrolla.

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
- **Formato:** ejecutar `dotnet format src/Backend` y `pnpm --dir src/Frontend lint`, y subir el cambio.
- **Cliente OpenAPI:** regenerarlo (ver [README.md](README.md#cliente-openapi)) y versionar el resultado.
- **Dependencias:** actualizar el paquete señalado o justificar la excepción en el PR.

## Secretos y configuración

- No subir contraseñas, cadenas de conexión, claves privadas ni tokens. Tampoco en comentarios ni en archivos de ejemplo.
- La configuración real vive en variables de entorno o en el entorno de despliegue, no en el repositorio. Los archivos `appsettings.Development.json` con valores propios no se publican.
- En Angular todo lo que se compila es visible en el navegador: solo configuración pública, como la URL de la API.
- Si cree haber subido una credencial: avisar de inmediato; no intentar limpiar el historial por su cuenta.

## Revisión

- `main` exige al menos una aprobación. `CODEOWNERS` indica quién revisa cada ruta.
- Describir en el PR qué cambia, por qué y cómo se probó. Incluir capturas si cambia la interfaz.
- Mantener los PR pequeños. Un cambio grande conviene dividirlo.

## Entorno local

Requisitos:

- .NET SDK 10.0.100 o superior (lo fija `global.json`).
- Node.js 22.22.3 o superior (o 26 o superior).
- pnpm 12.4 o superior (se probó con 12.4.1).
- Docker, para PostgreSQL y las imágenes.

Instalar y ejecutar:

```bash
pnpm --dir src/Frontend install      # dependencias del frontend
dotnet build src/Backend             # compilar el backend
docker compose up                    # levantar PostgreSQL y la aplicación
```

Pruebas y calidad:

```bash
dotnet test src/Backend                                        # todas las pruebas del backend
dotnet test src/Backend --filter "Categoria!=Integracion"      # solo unitarias (no requiere Docker)
pnpm --dir src/Frontend test:ci                                # pruebas del frontend
dotnet format src/Backend                                      # formato del backend
pnpm --dir src/Frontend lint                                   # lint del frontend
```

## Seguridad

Los problemas de seguridad no se reportan en incidencias públicas. Ver [SECURITY.md](SECURITY.md) o escribir a `istpetdev@istpet.edu.ec`.
