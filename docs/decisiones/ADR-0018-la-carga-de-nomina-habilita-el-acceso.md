# ADR-0018 — La carga de nómina habilita el acceso de las personas

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

RF-MUL-002 (spec-0001) dice que solo el `superadmin` habilita el acceso de las personas a una institución. En la práctica, la carga de nómina por el `admin` dejaba a todas las personas con `AccesoHabilitado = false`, y el panel del admin no tenía ninguna acción para habilitarlas. Como el `superadmin` es el equipo de desarrollo (README, «Roles») y no hay pantalla para él, las personas cargadas no podían iniciar sesión y el login respondía el mensaje genérico de RF-ACC-004, sin pista alguna para el admin (issue #75). Además, la pantalla se llamaba «Cargar / Habilitar Personas» y prometía habilitarlas.

## Opciones

1. **La carga habilita directo.** El admin que carga la lista decide quién actualiza datos; la habilitación va incluida.
2. **Botón de habilitar en el panel del admin**, con la carga dejando el acceso pendiente. Más control, un paso más para cada carga.
3. **Mantener la regla del superadmin** y añadir solo indicadores. Las pruebas funcionales quedan bloqueadas sin una pantalla de superadmin.

## Decisión

Se adopta la opción 1.

1. Las personas nuevas creadas por la carga de nómina (archivo o lista) quedan con `AccesoHabilitado = true`.
2. Si una persona ya existe en la institución con rol `usuario` y el acceso pendiente (cargada antes de este ADR), al volver a cargarla se habilita. El informe de la carga lo cuenta en `totalExistentesHabilitados`. Sus datos no se sobrescriben (PD-09).
3. El endpoint `POST /api/instituciones/{id}/habilitar-personas` del superadmin se mantiene sin cambios: sigue sirviendo para habilitar explícitamente y es inocuo sobre quien ya está habilitado.
4. La tabla de personas del admin muestra una columna «Acceso» (Habilitado / Pendiente).
5. No cambia ninguna otra regla de acceso: la contraseña inicial sigue siendo el documento con cambio obligatorio (ADR-0007), y el login no exige tipo de funcionario.

## Consecuencias

- RF-MUL-002 queda reinterpretado: el superadmin ya no es el único que habilita; la habilitación ocurre al cargar. La spec original no se reescribe; este ADR la matiza.
- Quien cargue una nómina habilita de inmediato a todas esas personas con la contraseña inicial igual a su documento (riesgo ya aceptado y mitigado en ADR-0007: bloqueo tras 5 intentos y auditoría).
- No hay forma, desde el panel, de deshabilitar a una persona (no existía antes tampoco). Si se necesita, será otro issue.
- El contrato de la API cambia (campo opcional `totalExistentesHabilitados`); `openapi/v1.json` y el cliente se regeneraron en el mismo cambio.

## ADR relacionados

- [ADR-0007](ADR-0007-autenticacion-con-cedula.md) — Autenticación con cédula, cambio obligatorio y correo.
- [ADR-0012](ADR-0012-carga-de-nomina-nulos-y-nombres.md) — Carga de nómina: columnas, valores nulos y división de nombres.
