# ADR-0001 — Clean Architecture en el backend

- **Estado:** Vigente
- **Fecha:** 2026-10-20

## Contexto

El backend es .NET 10 con PostgreSQL y debe poder adaptarse a otras instituciones sin reescrituras. Hace falta separar reglas de negocio de infraestructura para probarlas con rapidez. La plantilla `plantilla-dotnet-clean` solo contiene `.gitlab-ci.yml`, así que no aporta una estructura de capas que copiar: la organización de proyectos es diseño propio.

## Opciones

1. **Clean Architecture con cuatro proyectos** (`Domain`, `Application`, `Infrastructure`, `WebApi`) más proyectos de pruebas. Dependencias hacia el dominio; pruebas unitarias sin base de datos.
2. **Un único proyecto web** con carpetas. Más simple al inicio, pero mezcla reglas de negocio con acceso a datos y dificulta las pruebas unitarias rápidas.

## Decisión

Se adopta la opción 1. Los proyectos usan el prefijo `Istpet.ActualizacionDatos`: `Istpet.ActualizacionDatos.Domain`, `.Application`, `.Infrastructure` y `.WebApi`. `Domain` no depende de nada; `Application` depende de `Domain`; `Infrastructure` implementa las abstracciones de `Application`; `WebApi` compone todo. Las pruebas usan xUnit. Los nombres internos de clases y carpetas de cada capa los decide quien construya.

## Consecuencias

- Las pruebas unitarias de dominio y aplicación no necesitan PostgreSQL, lo que mantiene el CI rápido.
- Las abstracciones (por ejemplo, el almacenamiento de archivos) permiten cambiar la implementación sin tocar el negocio.
- Hay más proyectos y algo de ceremonia para cambios pequeños.
- Al ser una estructura propia, no hay plantilla de referencia: este ADR es la referencia.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos (abstracción `IAlmacenArchivos`).
