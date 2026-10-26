# ADR-0006 — Almacenamiento de archivos

- **Estado:** Vigente
- **Fecha:** 2026-10-21

## Contexto

Las personas suben documentos e imágenes como parte de la actualización de sus datos. Son datos personales y deben estar protegidos. Solo se conserva la última versión aprobada. El diseño sugería una opción sin cerrarla. La decisión la tomó quien desarrolla, en el issue #4.

Restricciones que pesan en la elección: el despliegue es por empuje a una red privada con Docker, no hay ningún servicio de almacenamiento de objetos disponible y el equipo es pequeño.

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

Se adopta la **opción 1, disco del servidor**, con estas condiciones:

- **Abstracción.** El dominio y la aplicación solo conocen `IAlmacenArchivos` (guardar, abrir para lectura y eliminar), definida en `Application`. La implementación en disco vive en `Infrastructure`. Cambiar a la opción 2 o 3 solo requiere otra implementación.
- **Ubicación.** La raíz es configurable (`Almacenamiento:RutaRaiz`) y en Docker es un volumen con nombre, nunca una carpeta dentro de `wwwroot` ni servida por nginx. Estructura: `<raiz>/<institucion_id>/<persona_id>/<archivo_id>`. El nombre en disco es un identificador generado (GUID), nunca el nombre original. El nombre original, el tipo, el tamaño y el hash SHA-256 se guardan en la base junto con `institucion_id` (ADR-0004).
- **Acceso.** Solo se descarga por un endpoint del backend que comprueba el rol y la institución del solicitante antes de abrir el archivo (RF-DAT-003). Las respuestas llevan `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff`.
- **Límites.** Máximo **10 MB** por archivo; la API lo rechaza por encima. El frontend avisa desde 5 MB. El tamaño máximo de petición del servidor se configura de acuerdo con ese límite.
- **Tipos.** PDF, JPG y PNG. Se valida la extensión **y** la firma real del contenido (bytes iniciales), y se rechaza si no coinciden.
- **Versiones.** Al aprobarse una actualización, los archivos que sustituye se eliminan; solo queda la última versión aprobada (RF-FLU-005). Los archivos de un borrador o de una actualización devuelta se pueden reemplazar libremente.

## Consecuencias

- Operación sencilla: no hay un servicio extra; la base no crece con binarios.
- La copia de seguridad debe incluir **el volumen de archivos junto con la base**, tomados en el mismo momento. Si no, quedan referencias huérfanas o archivos sin referencia.
- El aislamiento por institución depende de la consulta previa en la base: el endpoint de descarga no acepta rutas, solo el identificador del archivo, y lo resuelve con el filtro de institución.
- La exportación `.zip` (RF-EXP-002) lee del mismo almacén a través de `IAlmacenArchivos`.
- No se escalan horizontalmente varias instancias del backend sin un volumen compartido; si hiciera falta, se pasa a la opción 3 con un ADR nuevo.
- Queda pendiente el análisis antivirus del contenido. No se incluye en v1 y se registra como riesgo.
- Los archivos huérfanos (subidos a un borrador abandonado) necesitarán una limpieza periódica, que se definirá en el plan.

## ADR relacionados

- ADR-0001 — Clean Architecture en el backend.
- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0008 — Granularidad del rechazo (archivos editables tras la devolución).
