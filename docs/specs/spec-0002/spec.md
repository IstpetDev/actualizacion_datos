# Pantallas del usuario — Spec

**ID:** spec-0002 / issue #11  
**Versión:** 0.1  
**Estado:** Aprobado  
**Revisor funcional:** Solicitante del issue en esta sesión  
**Fecha:** 2026-10-22  
**Áreas afectadas:** `src/Frontend`

## Problema y resultado esperado

El login actual crea sesiones ficticias con un selector de roles. El panel de usuario es un marcador sin formulario. Una persona habilitada debe autenticarse contra la API, cambiar su contraseña inicial, verificar su correo y actualizar datos y documentos durante una campaña, consultar las observaciones y enviar su actualización a revisión.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Restricción |
|---|---|---|
| Issue aprobado para ejecución | https://github.com/IstpetDev/actualizacion_datos/issues/11 | Pantallas, pruebas, lint, formato y PR a develop |
| Referencia funcional en borrador | `docs/specs/spec-0001/spec.md` | RF-ACC-002 a 005, RF-CAM-002/003, RF-FLU-001/004, RF-DAT-001; no se considera aprobada la spec completa |
| ADR-0003, Vigente | `docs/decisiones/ADR-0003-cliente-openapi-generado.md` | Consumir el cliente generado |
| ADR-0006, Vigente | `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | PDF/JPG/PNG; máximo 10 MB, aviso desde 5 MB |
| ADR-0007, Vigente | `docs/decisiones/ADR-0007-autenticacion-con-cedula.md` | Cookie de sesión, cambio obligatorio, código de correo |
| ADR-0008, Vigente | `docs/decisiones/ADR-0008-granularidad-del-rechazo.md` | Observaciones generales y marcas por clave |
| ADR-0009, Propuesto | `docs/decisiones/ADR-0009-campos-configurables.md` | No decidir ni implementar formularios configurables |
| API disponible en develop | `src/Frontend/src/app/api-client/index.ts` | AutenticacionClient, MisDatosClient, ArchivosClient y EstadoEdicionDto |

## Alcance

**Incluye:** login real sin selector de roles; cambio obligatorio de clave; captura y verificación de correo; formulario de contacto; gestión de archivos; aceptación explícita del tratamiento; guardado y envío; estados y observaciones; cierre real de sesión.  
**Excluye:** recuperación de contraseña (sin endpoint disponible), configuración institucional de formularios, texto legal institucional, pantallas administrativas, cambios en API y despliegue.  
**Límites del proceso:** desde el ingreso hasta el envío o consulta de la actualización; las API existentes validan los permisos y las reglas.

## Requisitos verificables

| ID | Comportamiento observable | Prioridad | Fuente |
|---|---|---|---|
| RF-UI-001 | Login con documento y contraseña contra la API; rol obtenido exclusivamente de su respuesta; error genérico al fallar. La sesión usa la cookie existente y se comprueba al acceder. Salir invalida la cookie en la API. | Obligatorio | RF-ACC-002/004; ADR-0007 |
| RF-UI-002 | Antes de entrar al panel, la contraseña inicial debe cambiarse por una de al menos ocho caracteres, distinta del documento y confirmada. La ruta privada respeta la marca de cambio obligatorio. | Obligatorio | RF-ACC-002/003; ADR-0007 |
| RF-UI-003 | Capturar correo, solicitar o reenviar código y verificar seis dígitos; mostrar errores y estado de verificación. Sin correo verificado no se envía a revisión. | Obligatorio | RF-ACC-005; ADR-0007 |
| RF-UI-004 | Editar teléfono, dirección y ciudad como campos de contacto opcionales con claves estables `telefono`, `direccion`, `ciudad`, ya utilizadas en pruebas de la API; guardar en datosJson y conservar cualquier otra propiedad existente. Mostrar campaña, fechas, estado y mensaje de edición del servidor. | Propuesta funcional para aprobación | RF-CAM-002/003; contrato actual sin catálogo de campos |
| RF-UI-005 | Subir, listar, descargar y eliminar archivos mediante la API; clave de documento indicada por la persona; aviso desde 5 MB y rechazo local por encima de 10 MB o extensión no permitida. La API verifica el contenido real. | Obligatorio | ADR-0006; issue #10 |
| RF-UI-006 | Mostrar aceptación sin marcar por defecto y registrarla solo tras acción explícita. Guardar datos antes de enviar y exigir aceptación y correo verificado. Enviado/aprobado o fuera de campaña bloquea datos, subida, eliminación y envío. | Obligatorio | RF-DAT-001; RF-FLU-001; RF-CAM-003 |
| RF-UI-007 | Mostrar rondas, observación general y marcas de campos/archivos. Devuelto permite corregir y reenviar cuando la API habilita edición. Errores de red o rechazo conservan el borrador visible. | Obligatorio | RF-FLU-004; ADR-0008 |

## Escenarios del proceso

1. **Primer ingreso:** documento y clave inicial válidos → cambio de clave → panel → envío de código → verificación de correo. Claves distintas o códigos inválidos conservan el paso y muestran un error.
2. **Campaña abierta:** editar contacto → adjuntar archivo permitido → aceptar tratamiento → guardar y enviar. El envío exitoso bloquea la edición. Un error de guardado impide continuar al envío.
3. **Devolución:** mostrar observaciones y marcas → corregir datos/archivos → reenviar. Sin campaña abierta solo se permite consultar y descargar.
4. **Entradas y sesión inválidas:** login fallido no crea sesión; sesión caducada redirige al login; archivos grandes/no admitidos no se envían; errores conservan los datos escritos.

## Datos, seguridad e integraciones

Solo datos inventados en pruebas: documento `0000000000` y correo `usuario@ejemplo.test`. No guardar contraseñas ni generar tokens en el navegador. Consumir la API con la sesión por cookie y el soporte antiforgery de Angular. No enviar documento ajeno en las operaciones del usuario. No tratar sessionStorage como autorización del servidor. Descargar binarios por HTTP autenticado porque la firma generada `descargarArchivo(): Observable<void>` no expone el cuerpo. Mantener el cliente generado intacto si no cambia la API.

## Criterios de aceptación

- [ ] RF-UI-001 a 007 cubiertos con pruebas de componentes y de integración HTTP del frontend.
- [ ] Compilación, pruebas, lint y format:check del frontend satisfactorios.
- [ ] Compilación y pruebas del backend ejecutadas y salida real registrada.
- [ ] PR a develop sin conflictos y con ci-ok verde antes de merge y cierre de #11.

## Puntos que requieren decisión

| ID | Punto | Impacto | Quién decide |
|---|---|---|---|
| PD-UI-01 | El contrato contiene JSON libre y no define campos institucionales. Se proponen teléfono, dirección y ciudad opcionales, preservando propiedades adicionales. | Define el formulario v1 sin resolver ADR-0009 | Solicitante al aprobar esta versión |
| PD-UI-02 | El texto legal institucional sigue fuera del alcance; se muestra una aceptación explícita de tratamiento para la actualización institucional. | No se inventa una política legal | Institución antes de producción |

No se introduce una decisión arquitectónica: se reutilizan Angular Forms, guards, servicios y API existentes bajo los ADR vigentes. ADR-0009 permanece Propuesto.

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** Aprobado  
**Aprobó:** Solicitante en esta sesión  
**Fecha y evidencia de aprobación:** 2026-10-22, mensaje explícito: «apruebo el spect, recuerda que debe cumplir con todos los criterios que te pase del issue».  
**Ajustes solicitados:** Ninguno

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
