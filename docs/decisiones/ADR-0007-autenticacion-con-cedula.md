# ADR-0007 — Autenticación con cédula, cambio obligatorio y correo

- **Estado:** Vigente
- **Fecha:** 2026-10-21

## Contexto

Las personas permitidas se cargan por número de documento (cédula). Entran con la cédula como usuario. De ellas no se tiene el correo. Antes el acceso era por enlace mágico enviado al correo; ahora será con login. Reglas acordadas:

- Si la contraseña coincide con el usuario (estado inicial), el sistema **obliga a cambiarla** en el primer ingreso.
- El correo se pide en el primer ingreso, como parte de la actualización de datos.
- Cómo se verifica ese correo y cómo se recupera una contraseña lo decide quien desarrolla. Se decidió en el issue #4.

Riesgo conocido: una contraseña inicial igual a la cédula es débil, porque la cédula no es secreta. Hasta que la persona la cambie, cualquiera que conozca su número de documento podría entrar a su cuenta.

El frontend (Angular) y la API se sirven desde orígenes distintos, pero en el mismo sitio (mismo dominio o subdominio).

## Opciones

Verificación del correo:

1. Enviar un código o enlace de confirmación al correo indicado.
2. Aceptarlo sin verificar y marcarlo como no verificado.

Recuperación de contraseña:

1. Restablecimiento por correo verificado.
2. Restablecimiento por el admin de la institución.

Mitigaciones del riesgo de la contraseña inicial:

1. Bloqueo temporal tras varios intentos fallidos.
2. Código enviado por correo en el primer ingreso, además de la cédula.
3. Ventana de validez limitada de la contraseña inicial.
4. Registro y auditoría de los intentos de acceso.

## Decisión

**Verificación del correo: opción 1, código.** Al capturar el correo se envía un código numérico de 6 dígitos, válido 15 minutos y con un máximo de 5 intentos. En la base solo se guarda su hash. Hasta que se verifique, el correo consta como «no verificado». Para enviar la actualización a revisión hace falta un correo **verificado** (refuerza RF-ACC-005). La persona puede pedir un código nuevo; el anterior se invalida.

**Recuperación de contraseña: opción 1 y, como respaldo, la opción 2.**

- Con correo verificado: «olvidé mi contraseña» envía un enlace de un solo uso con un token aleatorio de 32 bytes, válido 30 minutos y guardado como hash. La respuesta es siempre la misma, exista o no el documento.
- Sin correo verificado: el `admin` de la institución genera una **contraseña temporal aleatoria**, que se muestra una sola vez. La cuenta vuelve al estado de cambio obligatorio. No se restablece a la cédula. La acción queda en la auditoría.

**Mitigaciones adoptadas: 1 y 4.**

- Bloqueo de la cuenta durante 15 minutos tras 5 intentos fallidos seguidos. El mensaje es el mismo que el de credenciales incorrectas o documento inexistente (RF-ACC-004).
- Auditoría de todo inicio de sesión, exitoso o fallido, con actor, institución, fecha y resultado, sin la contraseña (RF-DAT-004 y RF-DAT-005).
- No se adopta la opción 2, porque en el primer ingreso todavía no se conoce el correo de la persona. Tampoco la opción 3: la contraseña inicial ya solo sirve mientras la persona está habilitada (RF-MUL-002), y una caducidad adicional complicaría la carga sin un beneficio claro.

**Almacenamiento y política de contraseñas.** El hash se calcula con `PasswordHasher<T>` de `Microsoft.Extensions.Identity.Core` (PBKDF2 con sal, iteraciones según la versión del paquete). No se adopta la interfaz completa de ASP.NET Identity. Una contraseña nueva debe tener al menos 8 caracteres y ser distinta del documento (RF-ACC-003).

**Cambio obligatorio.** Con la contraseña inicial, la sesión lleva una marca de «debe cambiar contraseña». Una política de autorización global rechaza cualquier endpoint que no sea el de cambio de contraseña o el de cierre de sesión (RF-ACC-002). Esto también se aplica por la API, no solo en el frontend.

**Sesión.** Se usa una cookie de autenticación de ASP.NET Core, `HttpOnly`, `Secure`, `SameSite=Strict`. Caduca tras 30 minutos de inactividad (renovación deslizante) y como máximo a las 8 horas. Las peticiones que modifican datos exigen el token antiforgery (`XSRF-TOKEN` / `X-XSRF-TOKEN`, que Angular soporta de serie). CORS solo admite el origen configurado del frontend, con credenciales. No se usan JWT en el navegador.

## Consecuencias

- **Dependencia del correo.** Verificar el correo y recuperar la contraseña requieren el servidor de correo de notificaciones, que aún no está configurado. Hasta entonces, en `Development` el envío se sustituye por una implementación que escribe el mensaje en el log. Fuera de desarrollo, ninguna persona podrá enviar su actualización sin un correo operativo: configurarlo es requisito para el primer despliegue.
- La abstracción `IEnviadorCorreo` vive en `Application`, y sus implementaciones (log en desarrollo, SMTP después) en `Infrastructure`.
- El riesgo de la contraseña inicial se reduce con el bloqueo y la auditoría, pero no desaparece. La institución debe comunicar a las personas que la cambien en cuanto se habilite su acceso.
- El bloqueo por intentos puede usarse para impedir que alguien entre conociendo su cédula (denegación de servicio por cuenta). Se acepta: el bloqueo es temporal y queda en la auditoría.
- Con la cookie `SameSite=Strict`, el frontend y la API deben estar en el mismo sitio. Si el despliegue los separa en dominios distintos, este ADR se reemplaza.
- Los códigos y tokens se guardan como hash. Un volcado de la base no permite usarlos.
- Las tablas de credenciales, códigos y tokens llevan `institucion_id` cuando corresponde a una persona de una institución (ADR-0004).

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0003 — Cliente OpenAPI generado en el frontend.
