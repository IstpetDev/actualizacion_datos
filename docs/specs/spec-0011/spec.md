# Aceptación de protección de datos al iniciar sesión — Spec

**ID:** spec-0011; issue #99
**Versión:** 0.2
**Estado:** Aprobada; autorización rectoral confirmada por el solicitante (2026-10-27)
**Revisor funcional:** Solicitante del issue, con decisiones funcionales y técnicas delegadas en esta sesión
**Fecha:** 2026-10-27
**Áreas afectadas:** `src/Backend`, `src/Frontend`, persistencia PostgreSQL y contrato OpenAPI

## Problema y resultado esperado

RF-DAT-001 de spec-0001 exige aceptar el tratamiento de datos al enviar a revisión, pero permite consultar datos, guardar borradores y subir archivos antes de aceptar. El indicador actual no identifica el contenido aceptado ni una versión. El issue #99 solicita adelantar la aceptación al acceso autenticado y bloquear las operaciones con datos personales desde el servidor mientras esté pendiente.

Resultado propuesto: tras validar las credenciales y resolver el cambio obligatorio de contraseña, la persona lee el aviso institucional vigente y decide explícitamente si lo acepta. Solo una aceptación persistida de esa versión habilita las operaciones del sistema. Un nuevo inicio de sesión no repite una aceptación todavía válida; una nueva versión aplicable sí la exige.

Este documento propone ampliar RF-DAT-001 y la secuencia del escenario 1 de spec-0001, manteniendo la comprobación de RF-FLU-001 antes de enviar. **No modifica ni aprueba retroactivamente spec-0001.** Todas las opciones funcionales señaladas como propuestas requieren aprobación de esta versión.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Encargo | [Issue #99](https://github.com/IstpetDev/actualizacion_datos/issues/99) | Aprobación previa, referencia conceptual SIGAFI, bloqueo UI/API, evidencia versionada, migración y pruebas. Consultado el 2026-10-27: abierto, sin comentarios de aprobación. |
| Fuente institucional autorizada | Documento físico firmado de aprobación rectoral del aviso de Actualización de Datos, bajo custodia del solicitante; confirmado por este en la sesión del 2026-10-27 | Aprobación institucional declarada por el solicitante. El agente no inspeccionó el original; su contenido y vigencia se toman de esa fuente al provisionar el aviso. |
| Spec aprobada | [spec-0001](../spec-0001/spec.md), RF-DAT-001, RF-FLU-001, RF-ACC-002, RF-ACC-005, escenario 1 y PD-10 | Aceptación antes del envío; cambio obligatorio previo a otras acciones; correo requerido; texto legal pendiente de la institución. |
| Referencia oficial | [Quinto Suplemento al Registro Oficial n.º 459](https://www.registroficial.gob.ec/quinto-suplemento-al-registro-oficial-no-459/) | Publicación de la Ley Orgánica de Protección de Datos Personales, 26 de mayo de 2021. Identifica la norma; no sustituye el aviso específico aprobado por la institución ni acredita que el consentimiento sea la base jurídica adecuada para cada finalidad. |
| ADR-0001 | Vigente; [Clean Architecture](../../decisiones/ADR-0001-clean-architecture-backend.md) | Dominio, aplicación, infraestructura y API con responsabilidades separadas. |
| ADR-0003 | Vigente; [cliente OpenAPI generado](../../decisiones/ADR-0003-cliente-openapi-generado.md) | Un cambio de API actualiza `openapi/v1.json` y el cliente Angular generado en el mismo cambio. |
| ADR-0004 | Vigente; [aislamiento institucional](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) | Avisos y aceptaciones institucionales aislados por `institucion_id`; privilegios explícitos del superadmin. |
| ADR-0007 | Vigente; [autenticación](../../decisiones/ADR-0007-autenticacion-con-cedula.md) | Cambio de contraseña obligatorio antes de otras acciones y correo verificado antes del envío. La propuesta mantiene esa prioridad. |
| ADR-0023 | Vigente; [acceso de personas](../../decisiones/ADR-0023-habilitar-y-deshabilitar-acceso-de-personas.md) | El acceso deshabilitado revoca la sesión; aceptar un aviso no habilita una cuenta. |
| ADR-0024 | Vigente; [validación y dominios institucionales](../../decisiones/ADR-0024-validacion-y-dominios-institucionales.md) | El contexto autenticado determina la institución; no se confía en cabeceras del cliente para seleccionar identidad o institución. |
| ADR-0026 | Vigente; [contrato uniforme de errores](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) | Errores compatibles con `MensajeRespuesta`, sin revelar datos recibidos ni detalles internos. |
| Implementación | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Persona.cs`, `AceptarTratamientoDatos` y `EnviarARevision` | Se guarda un booleano y una fecha UTC; no hay versión del aviso. |
| Implementación | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioDatosUsuario.cs`, `AceptarTratamientoDatosAsync` y `EnviarARevisionAsync` | La aceptación actual y el envío dependen del indicador de `Persona`. |
| Implementación | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Program.cs`, autenticación y `/api/mis-datos/aceptar-tratamiento` | Hay restricción global por cambio de contraseña, pero no por aceptación vigente. El endpoint admite un documento opcional: la nueva aceptación deberá ser exclusivamente propia. |
| Implementación | `src/Frontend/src/app/core/auth/auth.guard.ts`, `features/auth/login.component.ts` y `features/usuario/usuario-dashboard.component.ts` | La navegación considera cambio de contraseña y rol; el dashboard registra la aceptación al enviar. |
| Referencia conceptual parcial | Entidades `PdCategoriasTerminosCondiciones`, `PdTerminosCondiciones`, `PdAceptacionesUsuarios` del proyecto local RRHH, bajo `src/Backend/RRHH.Domain/Entities/` | Se comprobaron las relaciones categoría/destinatarios → aviso/versiones → aceptación por identidad. No se copian sus tablas, código, dependencias, texto, IP ni dispositivo. Esta revisión no sustituye la de Mi_ISTPET exigida por #99. |

**Hechos comprobados:** los descritos como implementación y referencia parcial. **Referencia revisada posteriormente:** `IstpetDev/Mi_ISTPET`, rama `dev_jb`, commit `4517511220d89c808a5a20a7abc6d88a8848e904`: `Mi_ISPET_BackEnd/Mi_ISTPET.Infrastructure/Services/TerminosService.cs`, `Mi_ISPET_BackEnd/Mi_ISTPET/Controllers/Auth/TerminosController.cs` y las tres entidades de `Mi_ISPET_BackEnd/Mi_ISTPET.Domain/Entities/`. Se revisaron los cinco archivos mediante GitHub CLI porque el conector no encontró el repositorio. El servicio selecciona categoría/versión y consulta aceptación individual; el controlador deriva la identidad de la sesión. La implementación propia no adopta su permiso por ausencia de aviso, la selección arbitraria entre vigentes, ni el registro de IP/dispositivo; valida versión y duplicados. No se consultó ninguna base externa. PD-PDP-07 queda resuelto.

La decisión nueva se registra antes de implementar en ADR-0030, vigente por la delegación técnica del solicitante. No se cierra ningún ADR preexistente en estado Propuesto.

## Alcance

**Incluye:** selección del aviso por institución y destinatario; lectura y aceptación propia tras autenticar; restricción de acceso en UI y API; rechazo y cierre de sesión; evidencia mínima; versiones y sesiones abiertas; cuentas existentes; coherencia con el envío a revisión; pruebas con datos ficticios y regeneración de contratos si cambian.

**Propuesta de roles:** aplica a `usuario`, `supervisor`, `admin` y `superadmin`. Cada cuenta acepta el aviso que corresponde a su propia institución y rol antes de acceder a sus funciones. Para `superadmin`, su aceptación se vincula a la institución de su cuenta, sin trasladarse a otra persona o institución al gestionar instituciones. La institución debe aprobar que el aviso aplicable cubra sus funciones; no se presume una base jurídica común para los cuatro roles. No hay exención técnica automática por privilegio. Ver PD-PDP-02.

**Excluye:** redactar o interpretar el aviso legal, resolver la aplicabilidad de LOEI, sustituir otras bases jurídicas por consentimiento, copiar SIGAFI, conectar su base de datos, importar aceptaciones sin versión acreditada, agregar IP/dispositivo/firma biométrica y construir un gestor general de documentos legales.

**Límites del proceso:** comienza tras autenticar una cuenta habilitada; termina con una aceptación persistida del aviso aplicable y el acceso a las funciones autorizadas, o con la salida. Las operaciones necesarias de autenticación y seguridad preceden al acceso a datos de negocio; no se cambia su base jurídica mediante esta spec.

## Reglas funcionales propuestas para aprobación

1. **Orden:** credenciales válidas → cambio obligatorio de contraseña, si corresponde → aviso vigente y aceptación → funciones del rol. El correo se captura y verifica después de aceptar, dentro del flujo existente; sigue siendo obligatorio verificarlo antes de enviar a revisión. La consulta mínima del estado de acceso no entrega ficha, nombre, documento, correo ni archivos mientras esté restringida. Si se exige mostrar o aceptar el aviso antes del cambio de clave, debe aprobarse expresamente la modificación de RF-ACC-002 y ADR-0007.
2. **Destinatarios:** categorías determinadas por los roles propios del producto. Una versión identifica su institución y roles destinatarios. Para cada combinación institución/rol existe exactamente un aviso aplicable vigente; ausencia, vencimiento o ambigüedad bloquean el acceso. No se heredan las categorías alumno/docente/administrativo/externo de SIGAFI ni se usa `EsDocente` para el control.
3. **Contenido:** mostrar institución responsable, título, identificador/versionado exacto, fecha de vigencia y contenido íntegro aprobado. La institución entrega las finalidades, base jurídica, responsables, vigencia, reglas de aceptación y canal para ejercer derechos. La referencia a la LOPDP no se usa como sustituto de esos contenidos. No hay aviso ficticio activo ni texto legal escrito por el equipo técnico.
4. **Acción explícita:** casilla inicialmente desmarcada con la fórmula aprobada por la institución y botón «Aceptar y continuar» deshabilitado hasta marcarla. La casilla identifica el aviso y versión visibles. Cargar, desplazarse, cerrar, navegar, iniciar sesión o enviar otra operación nunca aceptan implícitamente.
5. **Rechazo:** «No aceptar y cerrar sesión» sale sin registrar aceptación ni motivo. Cerrar el aviso, recargar o usar navegación directa mantiene la restricción. Al autenticar de nuevo se presenta el aviso pendiente. No se propone borrar datos existentes por rechazar; el tratamiento de solicitudes de supresión o retiro debe seguir el canal institucional aprobado.
6. **Sin aviso o con fallo:** mostrar el impedimento sin datos personales y permitir reintentar o cerrar sesión. Fallar al leer o guardar no libera la restricción. Ante un resultado incierto al guardar, consultar el estado persistido; un reintento no duplica la evidencia ni altera su fecha original.
7. **Publicación:** solo puede activarse contenido autorizado por la institución, con versión y destinatarios inequívocos. Un contenido ya publicado no se sobrescribe: una corrección crea otra versión. Los cambios de vigencia conservan la historia de qué contenido fue aceptado. El canal operativo de publicación y el modo de acreditar la autorización se deciden en PD-PDP-05 y el ADR futuro; no se permite una aceptación por representación para resolver la falta de un aviso.
8. **Nueva versión:** se exige desde su entrada en vigencia a sus destinatarios, también en sesiones abiertas, antes de la siguiente operación protegida. No se espera al próximo login ni se confía solo en una cookie o estado local. Si ocurre durante una edición, la redirección obligatoria al aviso descarta cambios locales no guardados y prevalece sobre el modal de salida de spec-0006; no se intenta guardarlos automáticamente con el acceso bloqueado. No se cambia por ello el estado de un expediente enviado/aprobado ni se borran sus archivos.
9. **Concurrencia:** si la versión deja de ser vigente entre su lectura y la aceptación, no se registra como aceptación vigente; se muestra la nueva versión sin casilla marcada. Dos solicitudes de la misma aceptación producen una sola evidencia y conservan la fecha inicial. La operación protegida se autoriza con la vigencia comprobada para esa solicitud, sin prometer revocar respuestas ya entregadas.
10. **Legado:** todas las cuentas existentes sin evidencia de una versión exacta aceptan el aviso vigente al siguiente acceso protegido, incluso con sesión abierta. No se convierte el booleano antiguo en evidencia de una versión desconocida. Sus valores se conservan como histórico durante la transición, sin usarlos como autorización. Las actualizaciones y los archivos existentes se conservan. La ventana de despliegue requiere avisos aprobados para todas las combinaciones de institución/rol en uso antes de activar el bloqueo.

Estas reglas son propuestas funcionales, no conclusiones sobre el cumplimiento jurídico de la institución.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-PDP-001 | Dada una cuenta autenticada y habilitada de un rol incluido, cuando resuelve el cambio obligatorio de clave, el sistema presenta su aviso institucional aplicable si carece de aceptación vigente y evita cargar datos de negocio previamente. | Sin priorizar | #99, puntos 1 y 3; regla 1 |
| RF-PDP-002 | Dada una aceptación pendiente, cualquier petición de consulta, edición, carga, descarga, eliminación, revisión, exportación o administración de datos de negocio se rechaza desde el servidor sin ejecutar la operación. Las rutas nuevas quedan bloqueadas por defecto. | Sin priorizar | #99, punto 3 |
| RF-PDP-003 | Mientras haya aceptación pendiente se permiten únicamente estado mínimo del flujo, lectura del aviso propio, aceptación propia, cierre de sesión y operaciones de seguridad necesarias según la secuencia aprobada. Los endpoints públicos de infraestructura no proporcionan datos personales ni permiten aceptar. | Sin priorizar | #99, punto 3; ADR-0007 |
| RF-PDP-004 | Dada una versión aplicable visible, solo una petición explícita que identifique exactamente esa versión y confirme la aceptación puede registrar la evidencia para la identidad e institución de la sesión. No se aceptan documentos o instituciones arbitrarios, ni aceptación por un admin para terceros. | Sin priorizar | #99, puntos 3 y 4 |
| RF-PDP-005 | Una aceptación confirmada persiste una sola evidencia con identificador de persona, institución, identificador de aviso/versionado exacto y fecha UTC del servidor. No almacena documento, nombre, correo, IP, dispositivo ni motivo de rechazo como parte de la evidencia nueva. | Sin priorizar | #99, punto 4 |
| RF-PDP-006 | Una aceptación de la versión vigente se reutiliza entre sesiones sin cambiar su fecha. Una versión nueva aplicable vuelve a restringir el acceso, incluida una sesión abierta; no sirve la aceptación de otra institución, persona o aviso. | Sin priorizar | #99, punto 4; ADR-0004 |
| RF-PDP-007 | Rechazar, cerrar o abandonar el aviso no crea evidencia. Reingresar vuelve a presentar el pendiente. Se puede cerrar sesión incluso si no hay aviso o está fallando su carga. | Sin priorizar | #99, criterio 3 |
| RF-PDP-008 | La ausencia, caducidad, ambigüedad o fallo al cargar un aviso, y el fallo al persistir la aceptación, mantienen el bloqueo y permiten reintentar sin registrar aceptación implícita. | Sin priorizar | #99, punto 4; reglas 2 y 6 |
| RF-PDP-009 | La publicación de versiones y su vigencia no alteran el contenido asociado a evidencias previas. Aceptar una versión que ya no aplica exige cargar la vigente y decidir de nuevo. Las solicitudes simultáneas de una misma aceptación son idempotentes. | Sin priorizar | #99, punto 4; reglas 7 a 9 |
| RF-PDP-010 | El envío a revisión comprueba en backend la aceptación actualmente válida además de correo verificado, campaña, completitud y demás reglas existentes. El dashboard no solicita una segunda aceptación ni crea otra evidencia al enviar. | Sin priorizar | #99, punto 5; RF-FLU-001 |
| RF-PDP-011 | `POST /api/mis-datos/aceptar-tratamiento` deja de admitir aceptación sin versión y por documento ajeno. Si se conserva como ruta de compatibilidad usa la misma operación y evidencia propia que el flujo de acceso; si se retira, falla sin mutar datos. La elección del contrato queda para el diseño posterior a la aprobación. | Sin priorizar | #99, punto 5 |
| RF-PDP-012 | Las cuentas y sesiones existentes sin evidencia versionada quedan pendientes según la regla 10. No se fabrican aceptaciones a partir del booleano o su fecha ni se eliminan expedientes o archivos. | Sin priorizar | #99, punto 1 |
| RF-PDP-013 | Institución, persona y roles efectivos provienen de la identidad autenticada. Alterar cuerpo, consulta, ruta o cabeceras no permite omitir la restricción, aceptar por terceros ni leer avisos/evidencias ajenos. Los privilegios del superadmin no lo eximen de su aceptación propia. | Sin priorizar | #99, punto 2; ADR-0004, ADR-0024 |
| RF-PDP-014 | La interfaz permite leer y aceptar con teclado, etiquetas accesibles y errores visibles. Navegación directa, recarga y caducidad de sesión resuelven al paso permitido sin mostrar brevemente datos personales. | Sin priorizar | #99, punto 3 |
| RF-PDP-015 | Backend, frontend y pruebas de integración verifican los escenarios siguientes con datos ficticios; compilación, pruebas y checks se ejecutan y reportan con salida real antes del PR final. Todo cambio de API regenera OpenAPI y cliente Angular en el mismo cambio. | Sin priorizar | #99, punto 5 y criterio 7; AGENTS.md; ADR-0003 |

## Escenarios del proceso

En todos los casos se usan exclusivamente identidades y avisos ficticios de prueba, nunca avisos ficticios activos en producción. Instituciones «Institución Ficticia A» y «Institución Ficticia B»; persona de ejemplo con documento `0000000000`.

| Escenario | Actor y precondición | Disparador y secuencia | Resultado y variantes | Requisitos |
|---|---|---|---|---|
| E-PDP-01 Primer acceso | Cuenta habilitada sin aceptación y con cambio obligatorio | Login → cambio de clave → aviso → casilla desmarcada → aceptación → funciones del rol | Sin datos de negocio antes de aceptar; correo/verificación después; error de clave mantiene su paso | 001 a 005, 014 |
| E-PDP-02 Acceso sin cambio obligatorio | Cuenta con clave cambiada y sin aceptación | Login presenta directamente el aviso | Se repite para cada uno de los cuatro roles propuestos; el superadmin acepta el de su cuenta | 001, 003, 013 |
| E-PDP-03 Rechazo y abandono | Aviso pendiente | No aceptar y salir; cerrar aviso; recargar; reingresar | Cero evidencias; sesión cerrada al rechazar; cualquier sesión restante sigue restringida | 002, 007 |
| E-PDP-04 Aceptación y sesión posterior | Aviso vigente aceptado | Cerrar sesión e ingresar otra vez | Acceso sin pedirlo de nuevo; fecha original intacta | 005, 006 |
| E-PDP-05 Nueva versión | Sesión abierta con aceptación de v1 | Entra en vigencia v2 → petición protegida → aviso v2 → aceptación explícita | Bloqueo antes de operar; v1 conservada como historia; no se modifica el estado del expediente | 002, 006, 009 |
| E-PDP-06 Fallo al cargar | Sin aviso, aviso vencido, dos avisos aplicables o error de lectura | Login o reintento de carga | Mensaje de impedimento; solo reintentar/salir; sin ficha ni evidencia | 003, 008 |
| E-PDP-07 Fallo al guardar | Aviso pendiente visible | Aceptar con fallo antes de persistir; variante de respuesta perdida después de persistir | Sin liberar acceso si falla el guardado; consultar estado y reintentar recupera el resultado confirmado sin duplicarlo | 005, 008, 009 |
| E-PDP-08 Concurrencia | v1 visible o aceptación repetida | Publicar v2 antes de aceptar v1; dos aceptaciones simultáneas de la misma versión | v1 obsoleta no habilita; v2 inicia desmarcada; una sola evidencia y fecha inicial para solicitudes duplicadas | 004, 005, 009 |
| E-PDP-09 Llamada directa a API | Aceptación pendiente | Consultar/editar ficha y cuenta bancaria; subir/listar/descargar/borrar archivos; enviar, revisar, exportar o administrar según el rol | Todas las operaciones de negocio quedan bloqueadas antes de ejecutarse; un nuevo endpoint protegido queda restringido por defecto | 002, 003, 013 |
| E-PDP-10 Aislamiento | Mismo documento ficticio en A y B, avisos propios y otra persona en A | Aceptar en A; intentar usar esa evidencia en B, la versión de B en A o suplantar identidad/institución mediante cabeceras/parámetros | B sigue pendiente; no se aceptan ni revelan avisos o evidencias ajenos; nadie acepta por otra persona | 004 a 006, 013 |
| E-PDP-11 Envío y endpoint anterior | Cuenta con borrador y requisitos de envío satisfechos salvo aceptación | Enviar sin aceptación; aceptar; enviar; invocar ruta anterior sin versión o con documento ajeno | Primer envío rechazado; envío válido sin aceptación duplicada; peticiones antiguas inseguras sin efecto | 010, 011 |
| E-PDP-12 Migración | Cuenta antigua con booleano verdadero, fecha antigua y expediente enviado/aprobado; variante con borrador | Desplegar avisos aprobados y activar el control; usar cookie anterior | Requiere aceptación exacta nueva; conserva archivos, estado e histórico, sin fabricar evidencias | 006, 012 |
| E-PDP-13 Restricciones acumuladas | Acceso deshabilitado, sesión caducada o correo sin verificar | Intentar aceptar o enviar; repetir después de aceptación válida | Aceptar no habilita una cuenta deshabilitada ni sustituye autenticación/cambio de clave/correo; caducidad lleva a login | 001, 003, 010, 014 |
| E-PDP-14 Publicación y destinatarios | Contenido autorizado de una institución y roles definidos | Activar versión para sus destinatarios; intentar solaparla, modificar contenido ya publicado o usar otro rol | Vigencia inequívoca y contenido histórico íntegro; no se admite acceso por una categoría distinta; alcance del cambio de rol se evalúa de nuevo | 006, 008, 009, 013 |

## Datos, seguridad e integraciones

La evidencia nueva vincula el identificador interno de persona, su institución, el identificador de una versión inmutable del aviso y la fecha UTC fijada por el servidor. El contenido aprobado se conserva una sola vez por versión y permanece recuperable para verificar qué se aceptó. No se duplica el texto en cada aceptación ni se añade telemetría personal. La política de conservación, acceso de auditoría y tratamiento de solicitudes de retiro requiere instrucción institucional; no se inventan plazos.

La consulta del aviso durante la restricción no devuelve el perfil ni información de otras personas. La identidad de la aceptación no se toma de un documento enviado por el navegador. No se registran cuerpos de aceptación, texto legal completo, datos de la ficha ni motivos de rechazo en logs. Una casilla o variable de Angular no autoriza operaciones en el servidor.

La lectura del estado y la aceptación deben resolver vigencia e institución de forma coherente, incluso ante nuevas versiones y peticiones repetidas. Las garantías técnicas de persistencia, autorización y protección de las operaciones de escritura se definen en un ADR posterior a la aprobación funcional. Se mantiene PostgreSQL y la identidad propia del producto; SIGAFI aporta solo conceptos, sin conectividad ni dependencia de ejecución.

La fuente institucional del aviso es el documento físico firmado de aprobación rectoral para Actualización de Datos, conservado por el solicitante. Su existencia y aprobación fueron confirmadas por este en la sesión del 2026-10-27. El agente no recibió ni examinó el documento y no transcribe ni interpreta su contenido. El operador debe tomar de ese original el texto íntegro, declaración, versión, destinatarios y vigencia al publicarlo mediante el procedimiento documentado. La publicación en el entorno operativo es configuración de despliegue y no se ejecutó como parte de este cambio. El enlace al Registro Oficial identifica la ley y no sustituye el aviso particular.

## Criterios de aceptación

- [x] Esta versión tiene aprobación funcional explícita con roles, secuencia, rechazo, nuevas versiones y transición resueltos, y el aviso institucional autorizado o su fuente exacta está identificado (RF-PDP-001, 007, 009, 012; PD-PDP-01 a 05).
- [x] Se revisaron `TerminosService`, `TerminosController` y las tres entidades solicitadas, con procedencia y conclusiones conceptuales registradas, sin copiar código ni conectar bases externas (PD-PDP-07).
- [x] El primer acceso presenta la decisión explícita antes de cualquier dato de negocio y UI/API aplican el mismo bloqueo, incluidas llamadas directas, rutas nuevas, archivos y todos los roles aprobados (RF-PDP-001 a 004, 013, 014; E-PDP-01, 02, 09, 13).
- [x] Rechazar o cerrar no acepta; reingresar muestra el pendiente; una aceptación vigente no se pide de nuevo (RF-PDP-005 a 007; E-PDP-03, 04).
- [x] La evidencia mínima identifica persona, institución y versión exacta con fecha UTC; es idempotente y permite comprobar contenido histórico. Una versión nueva bloquea también sesiones abiertas (RF-PDP-005, 006, 009; E-PDP-05, 08, 14).
- [x] Fallos de carga/guardado, ausencia/vencimiento/ambigüedad y respuestas perdidas no generan aceptación implícita ni acceso anticipado (RF-PDP-008, 009; E-PDP-06, 07, 08).
- [x] Enviar sigue exigiendo aceptación vigente en backend; el flujo anterior no crea registros o decisiones incoherentes (RF-PDP-010, 011; E-PDP-11).
- [x] Las cuentas y sesiones antiguas siguen la transición aprobada; el booleano previo no acredita una versión y no se eliminan expedientes (RF-PDP-012; E-PDP-12).
- [x] Hay pruebas con datos ficticios de todos los escenarios, incluidos aislamiento institucional, suplantación, concurrencia y accesibilidad. OpenAPI y cliente se regeneran cuando cambie la API; resultados reales de compilación, pruebas y checks constan en el PR final (RF-PDP-015).
- [x] Toda nueva decisión de arquitectura tiene ADR revisado antes de sus tareas dependientes; ningún ADR propuesto se cierra por cuenta del agente (PD-PDP-06).

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Propuesta y efecto | Quién decide |
|---|---|---|---|
| PD-PDP-01 | Resuelto para la entrega del desarrollo por confirmación del solicitante: Rectorado aprobó el aviso en documento físico firmado, bajo su custodia. El agente no inspeccionó el original. | Esa fuente institucional gobierna contenido, destinatarios, declaración y vigencia al publicar. No se inventan disposiciones de LOPDP/LOEI ni se copia un aviso de alumnos. El operador carga el original autorizado antes de habilitar el uso. | Rectorado; documento bajo custodia del solicitante |
| PD-PDP-02 | #99 pide definir roles; RF-DAT-001 menciona solo `usuario`. | Aplicar a los cuatro roles con aviso para su institución y funciones. Superadmin acepta el correspondiente a la institución de su propia cuenta; sus privilegios no permiten aceptación por terceros. Si se aprueban exenciones o avisos distintos, documentar destinatarios y razón institucional. | Revisor funcional e institución |
| PD-PDP-03 | Mostrar el aviso inmediatamente tras validar credenciales puede entrar en conflicto con RF-ACC-002 y ADR-0007, que priorizan el cambio obligatorio. | Conservar cambio de clave → aviso → captura/verificación de correo y funciones. El aviso impide consultar o guardar datos de negocio. Si se elige aviso antes del cambio, registrar explícitamente el cambio de regla y un ADR que sustituya la prioridad actual. | Revisor funcional; responsable de arquitectura si cambia ADR-0007 |
| PD-PDP-04 | No hay política aprobada de rechazo, versiones, vigencia o legado. | Rechazo cierra sesión; falta/error de aviso bloquea; cada versión nueva aplicable exige aceptación, incluso en sesiones abiertas; sin conversión del booleano histórico. Aprobar también ausencia de borrado automático y conservación de expedientes, y definir conservación/retirada por canal institucional. | Institución y revisor funcional |
| PD-PDP-05 | #99 no define quién autoriza/publica el aviso, el canal ni cómo evitar un bloqueo operativo inicial. | Autorización por institución antes de activar la versión; publicación controlada, sin aceptar por terceros, y provisión de todas las instituciones/roles antes de activar el bloqueo. Confirmar el responsable operativo y si basta un procedimiento de carga o se requiere administración en la aplicación; no se presupone un gestor adicional. | Institución y responsable operativo |
| PD-PDP-06 | Persistencia versionada y restricción global de acceso son decisiones nuevas, no cubiertas por ADR vigentes. | Tras aprobar la spec, el plan debe identificar y registrar un ADR sobre modelo propio PostgreSQL, garantías de integridad/idempotencia, selección de vigencia/destinatarios, publicación, contexto autenticado, comprobación en cada solicitud y convivencia con el endpoint previo. Comparar opciones sin seleccionar aquí esquema, middleware ni nuevos endpoints. Revisar el ADR antes de implementar; no cerrarlo automáticamente. | Responsable de arquitectura/desarrollo |
| PD-PDP-07 | No se localizó el código exacto de `Mi_ISTPET` ni sus servicios/controladores. La referencia local de RRHH solo permite revisar las entidades homónimas. | Facilitar ruta o repositorio accesible y referencia de versión del código fuente. Revisar solo los archivos necesarios, sin configuraciones ni credenciales. No declarar cumplida esta parte por inferencia del modelo. | Solicitante del issue o custodio del repositorio de referencia |

## Revisión funcional

**Versión revisada:** 0.2
**Decisión:** Aprobada funcionalmente; autorización rectoral del aviso confirmada por el solicitante. La publicación real sigue el procedimiento de despliegue.
**Aprobó:** Solicitante del issue en esta sesión; delegó completar la spec y resolver las decisiones funcionales y técnicas
**Fecha y evidencia de aprobación:** 2026-10-27, respuesta a la v0.1: «hazlo tu, lo que pienses que sea lo mejor para el sistema, si te pide programar spect o completarla, hazlo».
**Ajustes solicitados:** Completar y ejecutar el trabajo con autonomía. Se confirman los cuatro roles, orden clave → aviso → datos/correo, rechazo con salida, aceptación por versión, legado sin conversión y publicación por procedimiento operativo controlado. La aprobación funcional del solicitante no se presenta como autorización institucional del texto legal.

La delegación recibida después de presentar la v0.1 habilita el plan y la implementación de las reglas completadas en esta v0.2. La institución autorizó el aviso mediante el documento físico firmado cuya custodia confirmó el solicitante. Esa declaración se registra como evidencia institucional recibida en esta sesión; no como inspección independiente del documento. El contenido se toma del original al publicar un aviso real.

### Resolución de puntos abiertos

- PD-PDP-02, 03 y 04: reglas funcionales confirmadas por delegación, con el alcance anterior. No se diseña un procedimiento jurídico de conservación o retiro; se remite al canal que especifique el aviso autorizado.
- PD-PDP-05: publicación operativa mediante comando de la aplicación y archivo JSON autorizado, sin panel nuevo ni excepción de acceso para administradores pendientes. El operador provisiona el primer aviso antes de habilitar el uso.
- PD-PDP-06: ADR-0030, registrado y revisado contra los ADR vigentes antes de ejecutar las tareas.
- PD-PDP-07: resuelto por revisión del código exacto de Mi_ISTPET, con procedencia indicada arriba.
- PD-PDP-01: resuelto para el cierre del desarrollo por la confirmación del solicitante de que el rector aprobó el aviso en un documento físico firmado que conserva bajo su custodia. Fuente institucional: ese original de aprobación rectoral del aviso para Actualización de Datos, referido en la sesión del 2026-10-27; no se aportaron número oficial, fecha de firma ni copia y no se inventan. Las fuentes públicas localizadas se mantienen como contexto y no sustituyen el documento aprobado. El sistema no siembra texto real ni ficticio y bloquea mientras el operador no publique el aviso autorizado.

### Confirmación institucional recibida

El 2026-10-27 el solicitante indicó: «ya lo aprobo el rector de la intitucion pero nos dieron un documento fisico firmado, eso ya lo tengo yo tu continua hasta cerrar el issue». Se registra su declaración sobre la aprobación y la custodia del soporte físico. No se incorpora al repositorio el documento, una firma, nombres ni datos personales. Esta confirmación libera el cierre de la entrega de código; no equivale a haber cargado un aviso en producción.

La evidencia técnica y la confirmación recibida están registradas en [issue-99](../../evidencia/issue-99/README.md).
