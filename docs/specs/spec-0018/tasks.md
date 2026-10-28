# Visibilidad de borradores y avance institucional para supervisores — Tareas

**ID:** spec-0018; issue #143  
**Áreas:** `src/Backend`, `src/Frontend`

## Tareas

- [x] **T-01: Extender contratos de revisión y cálculo de avance en Application y Domain**
  - Archivos: `ModelosRevision.cs`, `IServicioRevision.cs`.
  - Agregar campos de avance a `ResumenRevisionPendienteDto`.
  - Verificar compatibilidad hacia atrás.

- [x] **T-02: Implementar consulta general de personas, avance y lectura de borradores en Backend**
  - Archivo: `ServicioRevision.cs`.
  - Extender `ListarPendientesRevisionAsync` para consultar usuarios de la institución, calcular secciones con datos y emitir estados (`Sin Iniciar`, `Borrador`, `Enviado`, etc.).
  - Habilitar en `ObtenerExpedienteParaRevisionAsync` la consulta de borradores por el supervisor con auditoría `ConsultaBorradorSupervisor`.
  - Asegurar la prohibición estricta de aprobación y devolución para estados distintos de `Enviado`.

- [x] **T-03: Regenerar contrato OpenAPI y cliente TypeScript**
  - Ejecutar compilación de `Istpet.ActualizacionDatos.WebApi` para actualizar `openapi/v1.json` y `api-client/index.ts`.

- [x] **T-04: Adaptar panel de supervisor en Frontend**
  - Archivos: `supervisor-dashboard.component.ts`, `supervisor-dashboard.component.spec.ts`.
  - Mostrar insignias de los 5 estados y avance de secciones.
  - Bloquear / ocultar botones de aprobación y devolución cuando el expediente no sea `Enviado`.
  - Agregar filtro de búsqueda.

- [x] **T-05: Actualizar y agregar pruebas de Backend y Frontend**
  - Actualizar `FlujoRevisionTests.cs` y `ExportacionesTests.cs` para el nuevo comportamiento de visibilidad de borradores.
  - Agregar pruebas de cobertura para los estados `Sin Iniciar` y `Borrador`, avance y bloqueo de aprobación.
  - Ejecutar suite completa de backend y frontend sin fallos.

