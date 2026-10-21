# Fundación del producto — Spec

**ID:** spec-0001  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Pendiente de asignar  
**Fecha:** 2026-10-20  
**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

Instituciones educativas necesitan que docentes y otras personas actualicen sus datos personales y suban documentos e imágenes en fechas concretas. Hasta ahora la persona entraba por un enlace mágico enviado al correo. Ahora entrará con usuario y contraseña. Los datos aprobados actualizan las carpetas y procesos de la institución.

Resultado esperado: una persona cargada por su institución actualiza sus datos y archivos dentro de una campaña abierta y los envía a revisión; un supervisor los aprueba o devuelve con observaciones; un administrador exporta lo aprobado. Todo dato personal está protegido y cada institución solo ve lo suyo.

La primera versión es para una institución concreta, pero el producto debe poder adaptarse a otra sin una migración dolorosa.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Diseño de la fundación | `docs/superpowers/specs/2026-10-20-fundacion-repositorio-design.md`, secciones «Producto», «Roles» y «Reglas de negocio acordadas» | Roles, reglas de negocio 1 a 8 y sugerencia sobre archivos |
| ADR vigente | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Esquema único con `institucion_id`: todo dato pertenece a una institución |
| ADR vigente | ADR-0003, Vigente, `docs/decisiones/ADR-0003-cliente-openapi-generado.md` | El contrato entre frontend y backend es OpenAPI |
| ADR vigente | ADR-0006, Vigente, `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Archivos en disco del servidor por institución, servidos por el backend con permisos; máx. 10 MB; PDF, JPG y PNG |
| ADR vigente | ADR-0007, Vigente, `docs/decisiones/ADR-0007-autenticacion-con-cedula.md` | Correo verificado por código; recuperación por correo o por el admin; bloqueo tras 5 intentos; sesión por cookie de 30 min de inactividad |
| ADR vigente | ADR-0008, Vigente, `docs/decisiones/ADR-0008-granularidad-del-rechazo.md` | Rechazo general con observación obligatoria y marcas opcionales por campo o archivo |
| ADR propuesto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | Campos configurables por institución: no decididos |

Los ADR Propuestos no son decisiones; aquí solo delimitan puntos abiertos. ADR-0006, 0007 y 0008 se decidieron el 2026-10-21 (issue #4) y resuelven PD-01 a PD-05. No hay comportamiento existente que citar: el repositorio contiene solo la fundación, sin lógica de negocio.

## Alcance

**Incluye:** acceso con documento y contraseña; cambio obligatorio de contraseña inicial; captura del correo; campañas con fechas; edición de datos y archivos por la persona; envío a revisión; aprobación o devolución; exportación `.zip` o Excel; aceptación del tratamiento de datos; auditoría de accesos y exportaciones; alta de instituciones y de personas por institución.  
**Excluye:** historial de versiones de datos o documentos; formularios configurables por institución (ADR-0009); despliegue; texto legal del consentimiento; duración de la sesión.  
**Límites del proceso:** empieza cuando el superadmin da de alta una institución y el admin carga la lista de personas; termina cuando el admin exporta los datos aprobados de la campaña.

### Roles

Cuatro roles, en este orden de jerarquía.

| Rol | Quién | Puede |
|---|---|---|
| `usuario` | Docente u otra persona cargada | Ver y editar solo sus datos y archivos dentro de una ventana abierta; enviarlos a revisión |
| `supervisor` | Revisor de la institución | Ver datos y documentos de las personas de su institución, aprobar o rechazar. No genera exportaciones |
| `admin` | Administrador de la institución | Todo lo del supervisor, cargar la lista de personas, definir campañas y generar exportaciones de su institución |
| `superadmin` | Equipo de desarrollo | Crear instituciones, asignar admins y operar entre instituciones |

## Requisitos verificables

La columna «Regla» remite a la numeración de «Reglas de negocio acordadas» del diseño. Todos los ejemplos usan datos ficticios.

| ID único | Condición y comportamiento observable | Regla | Fuente |
|---|---|---|---|
| RF-ACC-001 | Dado un `admin` de una institución, cuando carga una lista de personas con número de documento, el sistema registra a cada persona permitida en esa institución con su documento como usuario. | 1 | Diseño, regla 1 |
| RF-ACC-002 | Dada una persona cargada con contraseña igual a su usuario (estado inicial), cuando inicia sesión con esas credenciales, el sistema acepta el acceso solo para cambiar la contraseña y no permite otra acción hasta cambiarla. | 1 | Diseño, regla 1 |
| RF-ACC-003 | Dada una persona que debe cambiar su contraseña, cuando intenta establecer una contraseña igual a su usuario, el sistema la rechaza con un mensaje y mantiene el cambio obligatorio. | 1 | Diseño, regla 1 |
| RF-ACC-004 | Dado un documento que no figura en la lista de ninguna institución, cuando se intenta iniciar sesión con él, el sistema rechaza el acceso con un mensaje que no revela si el documento existe. | 1 | Diseño, regla 1 |
| RF-ACC-005 | Dada una persona sin correo registrado, cuando completa su primer ingreso, el sistema le pide el correo como parte de la actualización de datos y no permite enviar la actualización sin él. | 2 | Diseño, regla 2 |
| RF-CAM-001 | Dado un `admin`, cuando crea una campaña con fecha de inicio y fecha de fin, el sistema la guarda para su institución y rechaza una fecha de fin anterior a la de inicio. | 3 | Diseño, regla 3 |
| RF-CAM-002 | Dado un `usuario` y una campaña de su institución con la fecha actual dentro de su rango, cuando abre sus datos, el sistema le permite editarlos y subir archivos. | 3 | Diseño, regla 3 |
| RF-CAM-003 | Dado un `usuario` sin campaña abierta en su institución (antes del inicio o después del fin), cuando abre sus datos, el sistema los muestra solo en lectura y rechaza cualquier edición o subida de archivos, también si se intenta por la API. | 3 | Diseño, regla 3 |
| RF-CAM-004 | Dada una campaña cuya fecha de fin ha pasado, cuando un `usuario` tenía un borrador sin enviar, el sistema no lo envía automáticamente y lo conserva en estado borrador. | 3, 4 | Diseño, reglas 3 y 4 |
| RF-FLU-001 | Dado un `usuario` con datos en estado borrador dentro de una campaña abierta, cuando los envía a revisión habiendo aceptado el tratamiento de datos, el sistema pasa el estado a enviado y bloquea su edición. | 4 | Diseño, regla 4 |
| RF-FLU-002 | Dado un `supervisor` y una actualización en estado enviado de su institución, cuando la aprueba, el sistema pasa el estado a aprobado. | 4 | Diseño, regla 4 |
| RF-FLU-003 | Dado un `supervisor` y una actualización en estado enviado de su institución, cuando la rechaza, el sistema exige al menos una observación, pasa el estado a devuelto y muestra la observación al `usuario`. | 4 | Diseño, regla 4 |
| RF-FLU-004 | Dado un `usuario` con una actualización devuelta y una campaña abierta, cuando abre sus datos, el sistema muestra las observaciones y permite corregir y volver a enviar. | 4 | Diseño, regla 4 |
| RF-FLU-005 | Dado un `usuario` con datos aprobados que vuelve a enviar una actualización y esta es aprobada, cuando se consultan sus datos, el sistema conserva solo la última versión aprobada y no ofrece historial de versiones de datos ni de documentos. | 5 | Diseño, regla 5 |
| RF-FLU-006 | Dado un `supervisor`, cuando consulta personas de otra institución o actualizaciones en estado borrador, el sistema no se las muestra. | 4, 8 | Diseño, reglas 4 y 8 |
| RF-EXP-001 | Dado un `admin` con datos aprobados en su institución, cuando solicita una exportación en formato Excel, el sistema genera un archivo con los datos aprobados de las personas de su institución. | 6 | Diseño, regla 6 |
| RF-EXP-002 | Dado un `admin`, cuando solicita una exportación `.zip`, el sistema genera una carpeta `<institucion>_<fecha>_datos/` con un `.md` índice y una carpeta por persona, nombrada por documento o id, con toda su información ordenada. | 6 | Diseño, regla 6 |
| RF-EXP-003 | Dado un `supervisor` o un `usuario`, cuando intenta generar una exportación (por interfaz o directamente por la API), el sistema la rechaza con un error de permisos y no genera ningún archivo. | 6 | Diseño, regla 6 y tabla de roles |
| RF-EXP-004 | Dado un `admin`, cuando genera una exportación, el sistema incluye solo personas y archivos de su institución. | 6, 8 | Diseño, reglas 6 y 8 |
| RF-DAT-001 | Dado un `usuario` que no ha aceptado el tratamiento de datos, cuando intenta enviar su actualización, el sistema lo impide hasta que acepte, y registra la aceptación con fecha. | 7 | Diseño, regla 7 |
| RF-DAT-002 | Dado un `usuario`, cuando consulta datos o archivos, el sistema solo devuelve los propios; cualquier intento de acceder a los de otra persona responde con error de permisos. | 7 | Diseño, regla 7 y tabla de roles |
| RF-DAT-003 | Dado un archivo subido, cuando alguien solicita descargarlo, el sistema lo entrega solo tras verificar que el rol y la institución del solicitante lo permiten; el archivo no es accesible por una ruta pública. | 7 | Diseño, regla 7 y sección «Archivos» |
| RF-DAT-004 | Dado un inicio de sesión (exitoso o fallido), una consulta a datos de otra persona por un `supervisor` o `admin`, o una exportación, cuando ocurre, el sistema registra quién, cuándo y qué acción en un registro de auditoría. | 7 | Diseño, regla 7 |
| RF-DAT-005 | Dado el registro de auditoría, cuando se consulta, el sistema no incluye contraseñas ni el contenido de los datos personales, solo la acción, el actor, la institución y la fecha. | 7 | Diseño, regla 7 |
| RF-MUL-001 | Dado un `superadmin`, cuando crea una institución y asigna uno o más admins, el sistema la deja disponible con sus admins y sin personas hasta que se carguen. | 8 | Diseño, regla 8 |
| RF-MUL-002 | Dado un `superadmin`, cuando elige una institución y las personas que deben actualizar sus datos, el sistema habilita el acceso de esas personas a esa institución. | 8 | Diseño, regla 8 |
| RF-MUL-003 | Dado un `usuario`, `supervisor` o `admin` de una institución, cuando consulta o modifica cualquier dato, el sistema solo opera sobre datos de su institución, aunque conozca identificadores de otra. | 8 | Diseño, regla 8; ADR-0004 |
| RF-MUL-004 | Dado un `superadmin`, cuando opera entre instituciones, el sistema le permite ver y administrar cualquiera de ellas y registra cada operación en la auditoría. | 8, 7 | Diseño, reglas 7 y 8 |

No se introducen requisitos de rendimiento ni de «seguridad» general sin métrica; los que falten se definen como puntos abiertos.

## Escenarios del proceso

### Escenario 1 — Primer ingreso y actualización

- **Actor y precondición:** `usuario` cargado con documento `0000000000`, contraseña inicial igual al usuario; campaña abierta en su institución.
- **Disparador:** inicia sesión con `0000000000` / `0000000000`.
- **Secuencia:** el sistema obliga a cambiar la contraseña (RF-ACC-002, 003); luego pide el correo `usuario@ejemplo.test` (RF-ACC-005); la persona edita datos y sube archivos (RF-CAM-002); acepta el tratamiento de datos y envía (RF-DAT-001, RF-FLU-001).
- **Resultado:** estado enviado, edición bloqueada, aceptación registrada con fecha.
- **Variantes y errores:** contraseña nueva igual al usuario (rechazada); sin campaña abierta (solo lectura, RF-CAM-003); sin aceptar el tratamiento (envío impedido).

### Escenario 2 — Revisión

- **Actor y precondición:** `supervisor` de la misma institución; actualización en estado enviado.
- **Disparador:** abre la actualización.
- **Secuencia:** revisa datos y documentos; aprueba (RF-FLU-002) o rechaza con observación (RF-FLU-003).
- **Resultado:** aprobado, o devuelto con observación visible para el `usuario`, que corrige y reenvía (RF-FLU-004).
- **Variantes y errores:** rechazo sin observación (no permitido); actualización de otra institución (no visible, RF-FLU-006, RF-MUL-003).

### Escenario 3 — Exportación

- **Actor y precondición:** `admin` con datos aprobados en su institución.
- **Disparador:** solicita exportación `.zip` o Excel.
- **Secuencia:** el sistema genera el archivo (RF-EXP-001, 002), solo con su institución (RF-EXP-004), y registra la exportación en la auditoría (RF-DAT-004).
- **Resultado:** archivo descargable.
- **Variantes y errores:** un `supervisor` lo intenta (error de permisos, RF-EXP-003).

### Escenario 4 — Alta de institución

- **Actor y precondición:** `superadmin`.
- **Disparador:** crea una institución.
- **Secuencia:** asigna admins (RF-MUL-001); el admin carga la lista de personas (RF-ACC-001); el superadmin elige qué personas actualizar y se habilitan sus accesos (RF-MUL-002).
- **Resultado:** institución operativa con sus personas habilitadas.
- **Variantes y errores:** documentos duplicados en la lista (ver punto abierto PD-09).

## Datos, seguridad e integraciones

- **Datos capturados:** documento (usuario), correo, datos personales de la actualización y archivos (documentos e imágenes). Los campos concretos los define la institución (punto abierto PD-06, ADR-0009).
- **Quién los ve:** el `usuario` los propios; `supervisor` y `admin` los de su institución; `superadmin`, cualquier institución con auditoría.
- **Cuándo se persisten:** como borrador al guardar; como enviado al enviar; solo se conserva la última versión aprobada (RF-FLU-005).
- **Archivos:** la sugerencia del diseño es disco del servidor por institución, referencia en base de datos, servidos por el backend con permisos, límite de 10 a 15 MB con advertencia desde 5 MB, y PDF, JPG y PNG. Es una sugerencia no cerrada: ver PD-01 y ADR-0006.
- **Auditoría:** accesos y exportaciones (RF-DAT-004, 005); su detalle completo queda abierto (PD-08).
- **Integraciones:** hay un correo de notificaciones por configurar; no hay contrato definido, por lo que no se inventan endpoints ni plantillas de mensajes.

## Criterios de aceptación

- [ ] Cada requisito `RF-*` se cumple y se demuestra con una prueba automática o un recorrido de `test-e2e.md` (RF-ACC-001 a RF-MUL-004).
- [ ] Un `supervisor` y un `usuario` reciben error de permisos al pedir una exportación por la API, no solo se oculta el botón (RF-EXP-003).
- [ ] Un usuario de una institución no puede leer ni modificar datos de otra, con identificadores conocidos (RF-MUL-003).
- [ ] Fuera de campaña ninguna edición ni subida de archivos es posible, ni por la API (RF-CAM-003).
- [ ] El envío sin aceptar el tratamiento de datos es imposible (RF-DAT-001).
- [ ] Ningún ejemplo, prueba ni dato de ejemplo contiene datos personales reales.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-01 | Almacenamiento de archivos: dónde se guardan, límites y tipos permitidos. El diseño solo sugiere una opción. | No pueden diseñarse la subida, descarga ni exportación de archivos | Resuelto en ADR-0006 (Vigente, 2026-10-21) |
| PD-02 | Verificación del correo capturado en el primer ingreso. | No puede definirse si el correo se considera válido al capturarlo | Resuelto en ADR-0007 (Vigente, 2026-10-21) |
| PD-03 | Recuperación de contraseña. | Una persona que olvide su contraseña no tiene camino definido | Resuelto en ADR-0007 (Vigente, 2026-10-21) |
| PD-04 | Mecanismo de autenticación y cambio obligatorio (almacenamiento de credenciales, bloqueo por intentos, duración de sesión). | Cierra el diseño de RF-ACC-002 a 004 | Resuelto en ADR-0007 (Vigente, 2026-10-21) |
| PD-05 | Granularidad del rechazo: por dato, por archivo o general. RF-FLU-003 se redactó sin asumirla. | Modelo de datos, pantalla del supervisor y corrección del usuario | Resuelto en ADR-0008 (Vigente, 2026-10-21) |
| PD-06 | Campos y documentos concretos de cada institución y si son configurables. | Modelo de datos del formulario | Equipo, mediante ADR-0009; las plantillas de datos concretas quedan fuera de esta spec |
| PD-07 | Una institución, ¿puede tener una sola campaña a la vez o varias? | Validación de RF-CAM-001 y qué campaña aplica en RF-CAM-002 | Revisor funcional |
| PD-08 | Detalle de la auditoría: qué eventos exactos, retención y quién la consulta. | Alcance de RF-DAT-004 y 005 | Revisor funcional |
| PD-09 | Documentos duplicados en la lista cargada, o persona presente en dos instituciones. | Reglas de carga de RF-ACC-001 y aislamiento por institución | Revisor funcional |
| PD-10 | Texto legal del consentimiento de tratamiento de datos. | Contenido que se muestra en RF-DAT-001 | Institución, fuera de esta spec |
| PD-11 | Qué datos incluye exactamente el Excel y el `.md` índice del `.zip`. | Formato verificable de RF-EXP-001 y 002 | Revisor funcional |
| PD-12 | Qué ocurre con los datos de una persona si el admin la quita de la lista. | Retención y eliminación de datos personales | Revisor funcional |
| PD-13 | ¿Puede el superadmin generar exportaciones? El diseño solo nombra al admin. | Alcance de RF-EXP-001 y 002 | Revisor funcional |

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** Pendiente  
**Aprobó:** Pendiente  
**Fecha y evidencia de aprobación:** Pendiente  
**Ajustes solicitados:** Ninguno todavía

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
