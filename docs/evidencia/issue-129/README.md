# Evidencia — Issue #129

Fecha: 2026-10-28. Rama: `feature/129-gestion-personal-institucional`.
Spec: `docs/specs/spec-0016/`; decisión de asignación: ADR-0038.

## Criterios implementados

- Superadmin: GET/POST `/api/instituciones/{id}/personal`, con listado de Admin y Supervisor y asignación por documento; actualiza cuentas existentes. El endpoint previo `/{id}/admins` utiliza la misma lógica y ahora actualiza el rol.
- Admin: GET/POST `/api/personas/supervisores`, con tenant derivado de la sesión; permite Usuario → Supervisor o habilitar un Supervisor existente. Rechaza asignar Admin/Superadmin, modificar Admin y operar por rutas globales.
- Ambas capas, endpoint y servicio, comprueban permisos. Se protege el grupo histórico de instituciones para impedir vías alternativas de alta/asignación de admins.
- La asignación conserva identidad, nombre, correo, credenciales y ficha. Habilita acceso. Las cuentas nuevas mantienen cambio obligatorio de clave. La cookie ya refresca el rol desde la base en cada petición.
- Auditoría de listado/asignación con actor, institución, id de destino y roles anterior/nuevo, sin datos personales de destino en el detalle. Persona y auditoría se persisten juntas.
- Interfaz compartida integrada en `/superadmin` con selector institucional y en `/admin` con sección Supervisores y selector móvil. Incluye estados de carga, vacío, error y confirmación accesibles. Cancela respuestas anteriores al cambiar de institución.
- `openapi/v1.json` y `src/Frontend/src/app/api-client/index.ts` regenerados. Sin migraciones ni dependencias nuevas.

## Salida real de validación

- `dotnet build src/Backend --no-restore`: `Build succeeded. 0 Warning(s), 0 Error(s)`.
- `dotnet test src/Backend`: **704 aprobadas, 0 fallidas, 0 omitidas**: dominio 135, aplicación 134, WebApi 435. No se excluyó la categoría Integracion.
- Nuevas pruebas: diez casos de dominio; catorce casos HTTP con cookies, políticas y protección de datos reales; tres casos PostgreSQL 17 con migraciones reales. Comprueban permisos, cabeceras/cuerpo manipulados, tenant vecino con el mismo documento, actualización de rol en cookie abierta, compatibilidad del endpoint previo, credenciales/ficha preservadas, auditoría atómica y concurrencia sin duplicados.
- El fallo real de una restricción en `auditorias` revierte tanto promociones como altas nuevas: no quedan cuentas ni roles parcialmente guardados.
- `pnpm --dir src/Frontend build`: producción compilada. Advertencia existente: estilos de `admin-dashboard.component.ts`, 9,11 kB frente al presupuesto de advertencia de 6 kB.
- `pnpm --dir src/Frontend test:ci`: **42 archivos y 444 pruebas aprobadas**. Tres avisos de navegación no implementada de JSDOM; ningún fallo.
- `pnpm --dir src/Frontend lint`: `All files pass linting.`
- `pnpm --dir src/Frontend format:check`: `All matched files use Prettier code style!`
- `dotnet format src/Backend --verify-no-changes --no-restore`: salida vacía, código 0.
- `git diff --check`: sin errores.

## Capturas y navegador

Chromium sobre el frontend compilado, con API simulada y datos ficticios. Se
verificaron tres asignaciones (Admin en A, Supervisor en B y Supervisor desde
admin en A), recarga del listado, cambio de institución sin mezclar resultados,
error con formulario conservado y vista móvil de 390 px sin desbordamiento de
página. No hubo errores JavaScript en ese recorrido.

- [Superadmin: personal de la institución](superadmin-personal.png)
- [Admin: supervisores](admin-supervisores.png)
- [Error de asignación](error-asignacion.png)
- [Admin en móvil](admin-movil.png)

Las capturas no demuestran persistencia real: esta se verifica con PostgreSQL y
HTTP en las pruebas anteriores. No se desplegó ni se usaron datos de producción;
la validación de #130 mantiene su alcance independiente.
