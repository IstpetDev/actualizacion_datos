# ADR-0006 — Almacenamiento de archivos

- **Estado:** Propuesto
- **Fecha:** 2026-10-20

## Contexto

Las personas suben documentos e imágenes como parte de la actualización de sus datos. Son datos personales y deben estar protegidos. Solo se conserva la última versión aprobada. El diseño sugiere una opción pero no la cierra; quien desarrolle decide y registra aquí la decisión.

## Opciones

1. **Disco del servidor**, con una carpeta por institución; la base de datos guarda la referencia, no el binario.
2. **Binarios en la base de datos** (PostgreSQL).
3. **Almacenamiento de objetos externo** (servicio compatible con S3 u otro).

Sugerencias del diseño, aplicables a cualquiera de las opciones:

- Los archivos los sirve el backend, **verificando permisos**; nunca una carpeta pública.
- Acceso detrás de una abstracción (`IAlmacenArchivos`) para poder cambiar de almacenamiento sin tocar el negocio.
- Límite de 10 a 15 MB por archivo, con advertencia en el frontend desde 5 MB.
- Tipos permitidos: PDF, JPG y PNG.

## Decisión

Pendiente. La toma quien desarrolle. La sugerencia del diseño es la opción 1 con las condiciones anteriores.

## Consecuencias

A completar al decidir. Puntos a considerar: copias de seguridad de la carpeta junto con la base, aislamiento por institución, exportación `.zip` por persona, validación de tipo real del archivo y análisis de contenido malicioso.

## ADR relacionados

- ADR-0001 — Clean Architecture en el backend.
- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
