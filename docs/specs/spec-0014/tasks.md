# Tareas de Trabajo — Spec-0014

## Tareas

- [x] **T-01: Dominio y Contratos de Aplicación**
  - Agregar `AvisoProteccionDatos.DesempaquetarRoles`.
  - Crear DTOs `AvisoInstitucionalDto` y `PublicarAvisoInstitucionalRequest`.
  - Actualizar interfaz `IServicioProteccionDatos`.

- [x] **T-02: Implementación en Infrastructure y WebApi**
  - Implementar métodos en `ServicioProteccionDatos` con auditoría.
  - Implementar endpoints en `SuperadminProteccionDatosEndpoints.cs`.
  - Registrar endpoints en `Program.cs`.

- [x] **T-03: Regeneración OpenAPI y Cliente Frontend**
  - Ejecutar compilación de WebApi para emitir `openapi/v1.json` y compilar NSwag (`index.ts`).

- [x] **T-04: Componente Frontend de Políticas de Protección de Datos**
  - Crear `politicas-proteccion-datos.component.ts`.
  - Integrar selector de institución, aviso vigente, historial y formulario de publicación.
  - Conectar en `superadmin-dashboard.component.ts`.

- [x] **T-05: Pruebas Backend y Frontend**
  - Pruebas de integración y unitarias de endpoints y servicios en Backend.
  - Pruebas unitarias de componentes Angular.

- [x] **T-06: Verificación de Formato y Calidad**
  - `dotnet test src/Backend --filter "Categoria!=Integracion"`
  - `dotnet format src/Backend`
  - `pnpm --dir src/Frontend test:ci`
  - `pnpm --dir src/Frontend lint`
  - `pnpm --dir src/Frontend format`
