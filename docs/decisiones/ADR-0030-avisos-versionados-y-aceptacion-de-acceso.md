# ADR-0030 — Avisos versionados y aceptación como condición de acceso

- **Estado:** Vigente
- **Fecha:** 2026-10-27

## Contexto

Spec-0011 v0.2 completa el alcance funcional de #99. El solicitante delegó en esta sesión completar la spec e implementar la solución más adecuada. Esta decisión nueva se registra y revisa contra ADR-0001, 0003, 0004, 0007, 0023, 0024 y 0026 antes del código. No cambia el estado de un ADR Propuesto existente ni autoriza contenido legal en nombre de la institución.

Se revisaron los servicios, controlador y entidades de Mi_ISTPET en `dev_jb`, commit `4517511220d89c808a5a20a7abc6d88a8848e904`. Solo se reutiliza el concepto destinatarios → versión → aceptación individual. La identidad y persistencia de este producto siguen siendo propias.

## Opciones

1. Ampliar el booleano de Persona y confiar en el login: no conserva versiones ni impide continuar con cookies antiguas.
2. Avisos y aceptaciones institucionales propias en PostgreSQL, con condición global en cada petición y comprobación adicional al enviar: conserva evidencia y protege llamadas directas.
3. Compartir tablas, servicios o base de SIGAFI: agrega acoplamiento, mezcla identidades y requiere una integración que no ha sido aprobada.

## Decisión

Opción 2. `AvisoProteccionDatos` conserva contenido y declaración de aceptación institucionales, referencia de autorización, fuente, versión, destinatarios por roles y período UTC. El contenido publicado es inmutable; sustituirlo crea otro identificador. `AceptacionProteccionDatos` vincula persona, institución, aviso y fecha UTC. Restricciones únicas y claves foráneas compuestas impiden duplicados y relaciones entre instituciones.

Un servicio en Infrastructure, con contrato en Application, selecciona la única versión aplicable a la institución y rol de la cuenta. Ausencia, caducidad o ambigüedad nunca equivalen a aceptación. Incluso superadmin acepta para la institución de su propia identidad. El booleano histórico de Persona se conserva por compatibilidad y nunca basta para autorizar; la respuesta de mis datos y el envío usan la evidencia vigente.

La API exige autenticación para sus operaciones de negocio y obtiene identidad, rol e institución de la cookie. Las cabeceras de contexto dejan de ser credenciales; si contradicen la sesión se rechazan. Tras el cambio obligatorio de clave, solo se admiten sesión mínima, aviso propio, aceptación propia y logout hasta completar el flujo. La respuesta de login/sesión oculta nombre, documento y correo durante la restricción. La autorización no depende de una marca de aceptación en la cookie.

`GET /api/proteccion-datos/aviso` devuelve el aviso aplicable y su estado; `POST /api/mis-datos/aceptar-tratamiento` recibe identificador de aviso y confirmación explícita, exclusivamente para la persona de la cookie. No existe otra aceptación al enviar ni aceptación por representación. La consulta de sesión indica `requiereAceptarProteccionDatos` para resolver la ruta Angular. Los errores mantienen el contrato de ADR-0026, con códigos que distinguen aceptación pendiente y aviso no disponible.

La publicación se realiza con `--publicar-aviso ruta.json`, fuera del flujo web, por el operador autorizado con acceso al entorno. El archivo debe identificar institución, versión, roles, vigencia, texto íntegro y declaración provistos por la institución, fuente y evidencia de su autorización. No se descarga automáticamente texto de una URL ni se ejecuta HTML externo. En la UI el contenido se representa como texto preservando párrafos; no se inserta HTML arbitrario. No se siembra contenido real o ficticio en producción.

Publicación y aceptación son transacciones que bloquean la fila de la institución en PostgreSQL y vuelven a comprobar la vigencia dentro del bloqueo. Una sustitución cierra la vigencia previa en el inicio de la nueva, sin cambiar contenido. Las categorías pueden ser grupos disjuntos de roles; no se permite sustituir parcialmente un grupo solapado sin republicar el grupo completo. Solicitudes repetidas devuelven la evidencia original. Esta serialización por institución es suficiente para la carga inicial; si la contención se mide como problema, se revisará la granularidad conservando la coordinación con publicación.

Las pruebas nuevas ejercitan cookies y servicio reales, SQLite para recorridos HTTP y PostgreSQL para migración, integridad y concurrencia. Los tests anteriores que inyectaban cabeceras se adaptan a una fábrica de autenticación exclusiva de pruebas y un doble de la política nueva para aislar sus reglas anteriores; ese doble no se usa para validar spec-0011 ni forma parte de la aplicación desplegada.

## Consecuencias

- Un aviso no provisionado bloquea a todos sus destinatarios; el operador debe cargar el texto autorizado antes del uso. La publicación no necesita una excepción web para cuentas pendientes.
- Las aceptaciones antiguas no se convierten en evidencia versionada. Los expedientes y archivos se conservan.
- Nuevas versiones restringen sesiones abiertas en la siguiente petición protegida. No se revocan respuestas ya entregadas.
- Se actualizan OpenAPI y cliente Angular en el mismo cambio.
- El 2026-10-27 el solicitante confirmó la aprobación rectoral del aviso en documento físico firmado bajo su custodia. El agente registra esa declaración sin inspeccionar ni publicar el original. El operador debe cargar el contenido de esa fuente autorizada antes del uso; el cierre de la entrega de código no implica publicar datos ni configurar producción.

## ADR relacionados

- ADR-0001 — Clean Architecture.
- ADR-0003 — Cliente generado.
- ADR-0004 — Aislamiento institucional.
- ADR-0007 — Contraseña y correo.
- ADR-0023 — Revocación de acceso.
- ADR-0024 — Contexto autenticado.
- ADR-0026 — Contrato uniforme de errores.
