# Habilitación y deshabilitación del acceso de personas (individual y masivo) — Spec

**ID:** #86  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Joseph Baño  
**Fecha:** 2026-10-26  
**Áreas afectadas:** `src/Backend`, `src/Frontend`

## Problema y resultado esperado

El [ADR-0018](../../decisiones/ADR-0018-la-carga-de-nomina-habilita-el-acceso.md) automatizó que las personas nuevas cargadas en la nómina queden habilitadas para iniciar sesión (`AccesoHabilitado = true`). Sin embargo, el administrador institucional no cuenta con herramientas en el panel ni endpoints en el backend para:
1. Deshabilitar el acceso de personas que ya no laboran en la institución o cuyo contrato culminó.
2. Deshabilitar o pausar masivamente el acceso entre períodos de campañas de actualización.
3. Habilitar individual o masivamente a personas que hayan quedado en estado pendiente.

El resultado esperado es que el administrador institucional pueda alternar el estado de acceso de una o varias personas de su institución (rol `Usuario`), contando con filtros visuales, casillas de selección múltiple, confirmación con conteo previo y retroalimentación inmediata, garantizando que un usuario deshabilitado no pueda iniciar sesión y que cualquier sesión activa sea revocada de inmediato en su siguiente petición.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Regla funcional multitenancy | `docs/specs/spec-0001/spec.md` (RF-MUL-002) | Originalmente solo superadmin habilitaba; matizado por ADR-0018 y esta spec. |
| Autenticación con cédula | `docs/decisiones/ADR-0007-autenticacion-con-cedula.md` | Mensaje genérico de error de login (RF-ACC-004), bloqueo por 5 intentos. |
| Carga de nómina | `docs/decisiones/ADR-0018-la-carga-de-nomina-habilita-el-acceso.md` | Carga de nómina habilita acceso; indica que la deshabilitación se abordará en un issue posterior. |
| Decisión de acceso | `docs/decisiones/ADR-0023-habilitar-y-deshabilitar-acceso-de-personas.md` | Endpoint `POST /api/personas/acceso`, invalidación de sesión en `OnValidatePrincipal`, auditoría. |
| Entidad Persona | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Persona.cs` | Métodos de dominio `HabilitarAcceso()` y `DeshabilitarAcceso()`. |

## Alcance

**Incluye:**
- Nuevo endpoint administrativo `POST /api/personas/acceso` que recibe `{ habilitar: bool, personaIds?: Guid[], todas?: bool }`.
- Restricción estricta al rol `RolUsuario.Usuario` dentro de la institución activa del administrador (`InstitucionId`).
- Protección: Un administrador no puede deshabilitarse a sí mismo ni a otros administradores o supervisores.
- Registro de auditoría (`Auditoria`) para cada operación (acción, actor, institución, personas cambiadas y omitidas).
- Invalidación inmediata de la cookie de sesión en `OnValidatePrincipal` si `AccesoHabilitado` es falso.
- Componente de frontend en `admin-dashboard.component.ts`: selección individual y masiva, filtro por estado de acceso, diálogo de confirmación y resumen de resultado.

**Excluye:**
- No altera el flujo de login ni el mensaje de error de credenciales genérico (RF-ACC-004).
- No altera el endpoint de superadmin `POST /api/instituciones/{id}/habilitar-personas`.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-ACC-006 | Dado un admin autenticado, cuando envía `POST /api/personas/acceso` con `{ habilitar: false, personaIds: [...] }`, las personas con rol `Usuario` de su institución pasan a `AccesoHabilitado = false` y se registra auditoría. | Alta | Issue #86, ADR-0023 |
| RF-ACC-007 | Dado un intento de deshabilitar a un usuario con rol `Admin` o `Supervisor`, o al mismo administrador autenticado, el sistema no modifica su estado ni lo desactiva. | Alta | Issue #86 |
| RF-ACC-008 | Dado un usuario deshabilitado con sesión activa abierta, cuando realiza una petición HTTP subsiguiente autenticada con cookie, el backend invalida la sesión y responde `401 Unauthorized`. | Alta | Issue #86, ADR-0023 |
| RF-ACC-009 | Dado el panel de administración, la tabla de personas permite filtrar por acceso (Todas, Habilitadas, Pendientes), seleccionar filas de rol `Usuario` individualmente o con selector «seleccionar todas», y ejecutar acciones masivas con confirmación previa. | Alta | Issue #86 |

## Escenarios del proceso

### Escenario 1 — Deshabilitación individual de una persona
- **Actor y precondición:** Administrador institucional autenticado en el panel de su institución.
- **Disparador:** Hace clic en el botón «Deshabilitar» de una fila con rol `Usuario` y estado `Habilitado`.
- **Resultado:** Se confirma la acción, se invoca `POST /api/personas/acceso`, el estado cambia a `Pendiente`, se muestra notificación de éxito y se audita el evento. Si el usuario tenía sesión abierta, su siguiente petición es rechazada con 401.

### Escenario 2 — Habilitación masiva de un conjunto seleccionado
- **Actor y precondición:** Administrador institucional visualizando personas con acceso pendiente.
- **Disparador:** Selecciona 5 casillas y pulsa «Habilitar seleccionadas».
- **Resultado:** El sistema solicita confirmación («¿Desea habilitar a 5 personas?»). Tras aceptar, se envía la petición, se actualiza el estado de las 5 personas y se muestra el conteo de personas cambiadas.

### Escenario 3 — Intento de deshabilitación a otro administrador
- **Actor y precondición:** Administrador autenticado en la institución.
- **Disparador:** Petición con `todas: true` o con el `Id` de un administrador de la institución.
- **Resultado:** El backend filtra exclusivamente a personas con rol `RolUsuario.Usuario` y cuyo documento no sea el del actor. Las cuentas administrativas y de supervisión conservan su acceso sin alteraciones.
