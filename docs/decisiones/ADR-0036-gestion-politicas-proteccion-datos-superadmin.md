# ADR-0036 — Gestión y publicación de políticas y avisos de protección de datos en panel superadmin

- **Estado:** Vigente
- **Fecha:** 2026-10-28

## Contexto

Conforme a `ADR-0030` y `ADR-0034`, el sistema exige que todo usuario con rol institucional (`Usuario`, `Supervisor`, `Admin`) acepte el aviso de protección de datos personales institucional vigente al iniciar sesión.

Sin embargo, hasta el issue #120:
1. La única vía existente para publicar un `AvisoProteccionDatos` era a través del argumento CLI `--publicar-aviso <archivo.json>` durante el arranque del backend o tareas de mantenimiento por consola.
2. En la interfaz web del rol superadmin (`/superadmin`), no existía una sección para gestionar o publicar directamente las políticas y avisos de tratamiento de datos personales por cada institución registrada.
3. Al aprovisionar una nueva institución desde la plataforma, sus usuarios quedaban bloqueados con `AVISO_PROTECCION_DATOS_NO_DISPONIBLE` hasta que un operador con acceso al servidor ejecutara comandos de consola.

## Opciones

1. **Mantener exclusivamente la vía CLI:** Conserva la separación de despliegue, pero entorpece la operación de nuevas instituciones, exige acceso a infraestructura de servidor para tareas administrativas y no brinda visibilidad web sobre el estado de vigencia de los avisos.
2. **Permitir que el administrador de cada institución publique su propio aviso sin supervisión:** Descentraliza la publicación, pero el administrador institucional aún no puede iniciar sesión sin un aviso vigente y se pierde el control de gobernanza sobre la evidencia de aprobación rectoral.
3. **Módulo web exclusivo para rol `Superadmin` con endpoints dedicados en la API:**
   - Exponer endpoints seguros protegidos únicamente para el rol `Superadmin`:
     - `GET /api/superadmin/instituciones/{id}/avisos-proteccion-datos` para consultar el historial y aviso vigente.
     - `POST /api/superadmin/instituciones/{id}/avisos-proteccion-datos` para publicar una versión del aviso institucional.
   - Reutilizar las validaciones de negocio de `ADR-0030` (`IServicioProteccionDatos.PublicarAsync`): verificación de aprobación explícita institucional, unicidad de versión, fechas válidas en UTC, grupos disjuntos de roles destinatarios y sustitución ordenada de vigencia del aviso previo.
   - Registrar la trazabilidad y auditoría de la publicación con el identificador del actor `superadmin`.
   - Añadir pestaña y módulo en Angular 22 en el panel global (`/superadmin`) con selección de institución, visualización del aviso vigente y formulario de publicación.

## Decisión

Se adopta la **Opción 3**:

1. **Contrato de API y seguridad:**
   - Se crea el grupo de endpoints `/api/superadmin/instituciones/{id}/avisos-proteccion-datos` restringido estrictamente a cuentas con rol `Superadmin`.
   - Se devuelven modelos detallados con la lista de avisos históricos y su estado de vigencia actual (`AvisoInstitucionalDto`).
   - La publicación exige confirmación explícita de aprobación institucional (`aprobacionInstitucionalConfirmada = true`), unicidad de versión por institución, enlace de fuente oficial HTTPS sin credenciales y roles destinatarios institucionales válidos.
2. **Auditoría:**
   - La publicación por superadmin registra un evento de auditoría (`PUBLICAR_AVISO_PROTECCION_DATOS`) con el actor superadmin autenticado y el identificador de la institución.
3. **Frontend (Angular 22):**
   - Se agrega una pestaña en `superadmin-dashboard.component.ts` para «Políticas de Protección de Datos».
   - Se implementa el componente `politicas-proteccion-datos.component.ts` que permite seleccionar instituciones, consultar su aviso activo o advertir la falta de aviso publicado, y registrar una nueva versión con validaciones reactivas y feedback claro de éxito o error.
4. **Regeneración de contratos:**
   - Se regenera `openapi/v1.json` y el cliente TypeScript NSwag (`api-client`).

## Consecuencias

- El superadmin puede aprovisionar y publicar políticas y avisos de protección de datos inmediatamente después de crear una institución, sin depender de accesos de consola al servidor.
- Los usuarios institucionales (`Usuario`, `Supervisor`, `Admin`) de una nueva institución quedan habilitados para ingresar y aceptar la política vigente tan pronto como el superadmin publique el aviso.
- No se rompe la compatibilidad con el mecanismo CLI `--publicar-aviso`, el cual se mantiene funcional para cargas automatizadas de servidor.

## ADR relacionados

- [ADR-0001](ADR-0001-clean-architecture-backend.md) — Clean Architecture en el backend.
- [ADR-0003](ADR-0003-cliente-openapi-generado.md) — Cliente OpenAPI generado en el frontend.
- [ADR-0004](ADR-0004-multitenancia-esquema-unico.md) — Multitenancy: esquema único con `institucion_id`.
- [ADR-0026](ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) — Manejo global de errores y contrato uniforme.
- [ADR-0030](ADR-0030-avisos-versionados-y-aceptacion-de-acceso.md) — Avisos versionados y aceptación como condición de acceso.
- [ADR-0034](ADR-0034-exencion-superadmin-aviso-proteccion-datos.md) — Exención del aviso institucional de protección de datos para superadmin.
