# Gestión de administradores y supervisores — Spec

**ID:** spec-0016; issue #129  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante en su petición de implementar #129 con el mismo flujo de #125  
**Fecha:** 2026-10-28  
**Áreas:** `src/Backend`, `src/Frontend`

## Problema y resultado esperado

El superadmin necesita asignar administradores y supervisores a instituciones ya
registradas; el admin necesita registrar o promover supervisores de su institución.
Asignar un rol a una persona existente debe actualizarlo realmente y habilitar su
acceso, sin crear duplicados ni alterar su expediente o credenciales.

## Fuentes y decisiones vigentes

- [Issue #129](https://github.com/IstpetDev/actualizacion_datos/issues/129): seis criterios pedidos expresamente por el solicitante.
- `spec-0001` aprobada, RF-MUL-001, 003, 004: gestión global y aislamiento institucional.
- [ADR-0004, Vigente](../../decisiones/ADR-0004-multitenancia-esquema-unico.md): un esquema con filtros por institución; solo superadmin opera entre instituciones.
- [ADR-0007, Vigente](../../decisiones/ADR-0007-autenticacion-con-cedula.md): alta de cuentas y primer acceso con cambio obligatorio de clave.
- [ADR-0023, Vigente](../../decisiones/ADR-0023-habilitar-y-deshabilitar-acceso-de-personas.md): el admin no modifica acceso de otros admins ni supervisores por el control masivo de nómina.
- [ADR-0038](../../decisiones/ADR-0038-asignacion-roles-institucionales.md): asignación autorizada de roles y auditoría atómica.
- `Program.cs`, `OnValidatePrincipal`: cada petición con cookie actualiza su rol desde la base; no requiere cambiar el mecanismo de sesión.

## Alcance y requisitos verificables

| ID | Comportamiento observable | Fuente |
|---|---|---|
| RF-ROL-001 | Superadmin lista admins y supervisores por institución existente y crea o asigna cualquiera de esos dos roles por documento. | #129, criterio 1 |
| RF-ROL-002 | Admin lista, registra o promueve supervisores exclusivamente en su institución; no asigna Admin/Superadmin ni cambia cuentas administrativas. | #129, criterio 2 |
| RF-ROL-003 | Una asignación conserva id, ficha, nombre, correo, clave y estado existentes; modifica rol y habilita acceso. Una cuenta nueva sigue el primer acceso habitual. No duplica un documento dentro del tenant. | #129, causas y criterios 1, 2 |
| RF-ROL-004 | Cada lectura y asignación se audita con actor, institución, id de destino y roles anterior/nuevo; asignación y auditoría se guardan juntas. | #129, criterio 2; RF-MUL-004 |
| RF-ROL-005 | El panel global permite seleccionar institución y gestionar ambos roles; el panel de admin tiene una sección de supervisores. Carga, vacío, éxito y error son accesibles. | #129, criterios 3, 4 |
| RF-ROL-006 | OpenAPI y cliente tipado se regeneran; pruebas de dominio, HTTP con cookies y PostgreSQL verifican permisos, aislamiento y roles efectivos. | #129, criterios 5, 6 |

El modelo continúa con un solo rol por persona e institución. El superadmin puede
cambiar Admin y Supervisor entre sí; ninguna operación modifica a Superadmin.
El admin promueve Usuario o habilita un Supervisor existente. Nombre y correo
opcionales se usan solo al crear. El documento exige diez dígitos; nombre hasta
403 caracteres y correo válido hasta 200, sin controles. No se exige campaña abierta.

**Excluye:** eliminar cuentas, cambiar instituciones de cuentas, asignar Superadmin,
roles múltiples, restablecer claves o editar expedientes desde estos formularios.

## Escenarios y criterios de aceptación

- [x] Superadmin elige una institución, lista su personal, crea un admin y promueve un usuario a supervisor; recargar conserva los roles (RF-ROL-001, 003, 005).
- [x] Admin crea y promueve supervisores; un documento coincidente en otro tenant conserva su rol (RF-ROL-002, 003).
- [x] Usuario, supervisor y cliente anónimo no gestionan personal; cabeceras o cuerpo no permiten cambiar institución ni elevarse a admin (RF-ROL-002, 006).
- [x] Una cookie abierta recibe el nuevo rol en la siguiente petición; expediente y credenciales se conservan (RF-ROL-003, 006).
- [x] Lecturas y cambios auditados; fallos reales revierten rol y auditoría (RF-ROL-004).
- [x] Interfaces, contratos regenerados, compilaciones y pruebas completas correctos (RF-ROL-005, 006).

## Datos y seguridad

Solo ejemplos ficticios en documentos y pruebas. Las operaciones globales filtran
explícitamente por el id de ruta; las de admin derivan la institución de la sesión.
Los contratos no aceptan id de institución, id de persona ni credenciales en el
cuerpo. No se incluyen nombres, correos ni documentos de destino en el detalle de
auditoría. El endpoint antiguo de admins conserva compatibilidad y aplica las
mismas reglas de asignación y la autorización exclusiva de superadmin.

## Revisión funcional

La autorización de alcance es el mensaje del solicitante del 2026-10-28: «ahora
con el mismo flujo completa este issue», junto con sus seis criterios. No se
atribuye una revisión nueva a los revisores de specs anteriores. Los límites
anteriores aplican la jerarquía de roles y el aislamiento ya vigentes.
