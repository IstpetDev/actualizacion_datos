# Verificación — Issue #129

Solo datos ficticios: documento `0000000000`, «Persona Ficticia», correo
`persona@ejemplo.test`. PostgreSQL 17 con Testcontainers y migraciones reales;
HTTP con cookies reales; Angular con Vitest y capturas de Chromium.

1. Superadmin selecciona A: crear Admin y Supervisor, promover un Usuario, cambiar rol y recargar; el id existente se conserva (RF-ROL-001, 003, 005).
2. Admin de A crea/promueve Supervisor y lo ve listado. La cuenta homónima en B y su expediente no cambian. Intentos de asignar Admin/Superadmin o modificar Admin se rechazan (RF-ROL-002, 003).
3. Anónimo recibe 401; Usuario/Supervisor reciben 403 en todos los endpoints; admin no puede usar los endpoints globales, incluidos los antiguos. Cabeceras o propiedades de cuerpo no cambian tenant ni permisos (RF-ROL-002, 006).
4. Una sesión abierta como Usuario pasa a Supervisor en la siguiente petición tras promoción; contraseñas, correo y expediente persisten (RF-ROL-003, 006).
5. Leer/guardar registra actor y tenant. Provocar fallo de auditoría real: no persiste el rol ni una nueva cuenta parcial. Concurrencia no duplica documentos (RF-ROL-004, 006).
6. UI: estados vacío/cargando/error, asignación de ambos roles globales, supervisor institucional, selección de institución, errores sin borrar formulario y respuestas tardías sin mezclar instituciones (RF-ROL-005).

Evidencia real y límites: `../../evidencia/issue-129/README.md`. La comprobación en
producción por roles de #130 sigue siendo una tarea independiente.
