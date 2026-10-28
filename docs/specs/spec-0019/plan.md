# Plan de implementación — spec-0019

**Issue:** #139  
**Objetivo:** Retiro auditado de adjuntos por supervisor con eliminación física y registro en bitácora.

1. **Backend:**
   - Crear endpoint `POST /api/archivos/{id:guid}/retirar` (o en `IServicioArchivos.RetirarArchivoSupervisorAsync`).
   - Validar autorización: Rol Supervisor o Admin, misma institución.
   - Validar que motivo no esté vacío.
   - Desvincular de secciones de hoja de vida (foto personal, títulos, capacitaciones, etc.).
   - Registrar entrada en `Auditorias`.
   - Eliminar físicamente del almacenamiento de disco (`IAlmacenArchivos.EliminarAsync`).
   - Registrar mensajes en consola/logs en `AlmacenArchivosDisco.cs` para visibilidad de rutas en Docker/local.
2. **OpenAPI & Frontend Client:**
   - Regenerar cliente OpenAPI si se agrega endpoint o DTO.
3. **Frontend:**
   - En `supervisor-dashboard.component.ts` (modal o lista de adjuntos del expediente), agregar acción "Retirar adjunto" con modal que exija motivo.
   - Deshabilitar confirmación si el motivo está vacío.
   - Refrescar la lista de adjuntos al completar el retiro.
4. **Verificación y Pruebas:**
   - Pruebas unitarias de backend en `ArchivosTests.cs`.
   - Pruebas unitarias de frontend en `supervisor-dashboard.component.spec.ts`.
