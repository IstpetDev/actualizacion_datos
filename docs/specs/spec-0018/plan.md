# Visibilidad de borradores y avance institucional para supervisores — Plan

**ID:** spec-0018; issue #143  
**Áreas:** `src/Backend`, `src/Frontend`

## 1. Arquitectura y Contratos

### 1.1 Backend: Modelos y Servicios
- **`ModelosRevision.cs`**:
  Extender `ResumenRevisionPendienteDto` para incluir métricas de avance:
  - `TotalSecciones`: total de secciones activas configuradas para la institución.
  - `SeccionesConDatos`: cantidad de secciones con al menos un ítem registrado.
  - `PorcentajeAvance`: valor entero entre 0 y 100 correspondiente al progreso.
  - `SeccionesCompletadas`: lista con los nombres/claves de las secciones con avance.
- **`ServicioRevision.cs`**:
  - `ListarPendientesRevisionAsync`:
    - Consultar todas las personas de la institución con rol `Usuario`.
    - Determinar en lote la presencia de datos en las 7 secciones de la hoja de vida (`FichasPersonales`, `TitulosAcademicos` / `TitulosEnCurso`, `Capacitaciones`, `ExperienciasLaborales`, `ReferenciasPersonales`, `DocumentosPersonales`, `CuentasBancarias`) y la aceptación de tratamiento de datos.
    - Excluir del conteo de secciones aquellas que estén deshabilitadas en `SeccionInstitucion`.
    - Resolver el estado efectivo: `Sin Iniciar` (si está en `Borrador` y carece de datos), `Borrador` (si tiene datos pero no ha enviado), o el valor de `EstadoActualizacion` (`Enviado`, `Devuelto`, `Aprobado`).
  - `ObtenerExpedienteParaRevisionAsync`:
    - Permitir la lectura a supervisores y administradores tanto en `Enviado` como en `Borrador` o sin iniciar.
    - Registrar auditoría con acción `ConsultaBorradorSupervisor` cuando se consulte un borrador durante campaña.
  - `AprobarActualizacionAsync` y `DevolverActualizacionAsync`:
    - Validar explícitamente `persona.EstadoActualizacion == EstadoActualizacion.Enviado`, arrojando `ReglaNegocioException` si se invoca sobre un borrador.

### 1.2 Frontend: Panel de Supervisor
- **`supervisor-dashboard.component.ts`**:
  - Mostrar en la tabla de revisión las nuevas columnas o insignias de estado y avance.
  - Soportar el distintivo visual para los 5 estados (`Sin Iniciar`, `Borrador`, `Enviado`, `Devuelto`, `Aprobado`).
  - Presentar la barra o etiqueta de avance (`X/Y secciones - Z%`).
  - En la vista detallada de expediente, si el estado no es `Enviado`, mostrar un aviso claro de sólo lectura e invisibilizar o deshabilitar los botones de `btn-aprobar` y `btn-devolver`.
  - Incorporar filtro de búsqueda rápida de personas por texto/cédula en la tabla.

## 2. Archivos Modificados e Impacto

- `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosRevision.cs`
- `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioRevision.cs`
- `src/Frontend/src/app/features/supervisor/supervisor-dashboard.component.ts`
- `src/Frontend/src/app/features/supervisor/supervisor-dashboard.component.spec.ts`
- `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/FlujoRevisionTests.cs`
- `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/ExportacionesTests.cs`
- Regeneración de `openapi/v1.json` y `src/Frontend/src/app/api-client/index.ts`.

