# Plan de Implementación — Spec-0014

## Arquitectura y Componentes

### 1. Backend (`src/Backend`)
- **Contratos (`Application/Modelos` y `Application/Servicios`):**
  - Modelo `AvisoInstitucionalDto` en `Istpet.ActualizacionDatos.Application.Modelos`.
  - Modelo `PublicarAvisoInstitucionalRequest` en `Istpet.ActualizacionDatos.Application.Modelos`.
  - Extender `IServicioProteccionDatos` con:
    - `Task<List<AvisoInstitucionalDto>> ListarHistorialAsync(InstitucionId institucionId, CancellationToken ct = default);`
    - `Task<AvisoInstitucionalDto> PublicarAsync(PublicarAvisoRequest solicitud, string? actor = null, CancellationToken ct = default);`
- **Dominio (`Domain`):**
  - Método auxiliar `AvisoProteccionDatos.DesempaquetarRoles(int mascara)` para reconstruir `RolUsuario[]` desde la máscara de bits.
- **Infraestructura (`Infrastructure`):**
  - Implementar en `ServicioProteccionDatos`:
    - `ListarHistorialAsync`: valida existencia de institución, obtiene avisos ordenados por vigencia y calcula `esVigente`.
    - `PublicarAsync`: añade parámetro opcional `actor`, registra `Auditoria` (`PUBLICAR_AVISO_PROTECCION_DATOS`) y retorna el `AvisoInstitucionalDto` creado.
- **Endpoints (`WebApi/Endpoints`):**
  - Crear `SuperadminProteccionDatosEndpoints.cs`:
    - `GET /api/superadmin/instituciones/{id:guid}/avisos-proteccion-datos`
    - `POST /api/superadmin/instituciones/{id:guid}/avisos-proteccion-datos`
    - RequireAuthorization(Superadmin).
  - Manejo de excepciones con `AccesoEndpoints.EjecutarAsync`.
- **OpenAPI y Cliente:**
  - Regenerar `openapi/v1.json` y cliente TypeScript NSwag (`SuperadminProteccionDatosClient`).

### 2. Frontend (`src/Frontend`)
- **Componentes:**
  - Crear `politicas-proteccion-datos.component.ts` en `src/Frontend/src/app/features/superadmin/`.
  - Integrar en `superadmin-dashboard.component.ts` como pestaña «Políticas de Protección de Datos» y botón directo en tabla de instituciones.
  - Implementar visualización de aviso vigente, advertencia de falta de aviso, historial y formulario reactivo con confirmación institucional.

### 3. Pruebas
- Pruebas en Backend:
  - Pruebas unitarias/integración de `IServicioProteccionDatos` para `ListarHistorialAsync` y auditoría en `PublicarAsync`.
  - Pruebas de endpoints para permisos (solo Superadmin) y respuestas ante versiones duplicadas o datos inválidos.
- Pruebas en Frontend:
  - Pruebas unitarias de `politicas-proteccion-datos.component.spec.ts`.
  - Pruebas en `superadmin-dashboard.component.spec.ts`.
