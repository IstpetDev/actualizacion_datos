# Evidencia de Implementación — Issue #34 (T-12)

## Revisión por secciones y configuración de requisitos (supervisor y admin)

- **Issue:** #34
- **Tarea:** T-12 de `docs/specs/spec-0003/tasks.md`
- **Rama:** `feature/34-revision-y-configuracion`
- **Destino:** `develop`
- **Responsable:** @AlexanderMartinez0410
- **Base funcional:** spec-0003 v0.4 aprobada (RF-HDV-011, RF-HDV-012, RF-HDV-013, Escenarios 2 y 3); ADR-0003, ADR-0008.

---

### 1. Resumen de Cambios

1. **Expediente del Supervisor por Secciones (RF-HDV-011, Escenario 2):**
   - En lugar de limitarse a deserializar `datosPersonalesJson`, el supervisor ahora consulta la hoja de vida completa estructurada a través de `GET /api/revision/{documento}/hoja-de-vida` (`RevisionClient.obtenerHojaDeVidaParaRevision(documento)`).
   - Componente [`ExpedienteSeccionesComponent`](file:///src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts) creado en `src/Frontend/src/app/features/supervisor/revision/`:
     - Visualización por pestañas estructuradas: Ficha Personal, Formación Académica (Títulos y Títulos en Curso), Capacitaciones, Experiencia Laboral, Referencias Personales y Laborales, Documentos y Respaldos.
     - Descarga de archivos de respaldo asociados a cada ítem (`archivoId`) mediante `ArchivosClient.descargarArchivo`.
     - Marcas por ítem (RF-HDV-011, ADR-0008): botón «Marcar Ítem» sobre cada tarjeta/registro que precarga el modal de devolución con `tipoDestino = 'Item'` y la clave estable `tipo:{id}` (`titulo:{id}`, `titulo-en-curso:{id}`, `capacitacion:{id}`, `experiencia:{id}`, `referencia:{id}`, `documento:{id}`).
     - En el modal de devolución, se incorporó la opción de tipo `Item` y se envían las marcas puntuales junto con la observación general obligatoria.

2. **Configuración de Requisitos para el Administrador (RF-HDV-012, RF-HDV-013, Escenario 3):**
   - Componente [`ConfiguracionRequisitosComponent`](file:///src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts) en `src/Frontend/src/app/features/admin/configuracion/`:
     - **Tipos de Funcionario (RF-HDV-012):** Listado institucional, creación y edición con código único normalizado, nombre y marca docente, y activación/desactivación.
     - **Tipos de Documento (RF-HDV-012):** Catálogo de documentos institucionales con código único, nombre, descripción, vigencia/vencimiento, orden y estado.
     - **Requisitos de Documento (RF-HDV-012, Escenario 3):** Permite configurar documentos obligatorios para un tipo de funcionario específico o para **«Todos»** (sin tipo de funcionario), cumpliendo con el Escenario 3 aprobado (cédula, papeleta de votación, antecedentes penales, etc.).
     - **Asignación a Personas (RF-HDV-013):** Asignación o actualización interactiva de tipo de funcionario para cada persona registrada en la institución.
   - Seguridad y permisos:
     - Componente exclusivo para administradores (`admin` / `superadmin`), con bloqueo explícito en plantilla y lógica si no cumple el rol.
     - Integrado en [`AdminDashboardComponent`](file:///src/Frontend/src/app/features/admin/admin-dashboard.component.ts) como 4ª pestaña («Configuración de Requisitos»).
     - Integrado en [`app.routes.ts`](file:///src/Frontend/src/app/app.routes.ts) bajo la ruta protegida `/admin/configuracion` con `roleGuard('admin')`.

---

### 2. Evidencia de Pruebas

#### Frontend (`pnpm --dir src/Frontend test:ci`)
- 29 suites de prueba ejecutadas, **187 pruebas aprobadas**, 0 fallidas:
  - `expediente-secciones.component.spec.ts`: 5 pruebas (renderizado de secciones, descarga de respaldos, emisión de marcas por ítem `titulo`, `capacitacion`, `experiencia`, `referencia`, `documento`).
  - `supervisor-dashboard.component.spec.ts`: 7 pruebas (integración de hoja de vida, apertura de modal con marca de ítem, devolución con observación general y marcas tipo `Item`).
  - `configuracion-requisitos.component.spec.ts`: 6 pruebas (control de rol admin, creación de tipos de funcionario, creación de tipos de documento, requisitos para «Todos», asignación a persona).
  - `admin-dashboard.component.spec.ts`: 8 pruebas (navegación hacia pestaña de configuración y pruebas previas intactas).

#### Linter y Formato
- `pnpm --dir src/Frontend lint`: `All files pass linting.`
- `pnpm --dir src/Frontend build --configuration development`: `Application bundle generation complete.`

---

### 3. Criterios de Aceptación Cumplidos

- [x] Expediente por secciones, con descarga de respaldos y marcas por ítem (RF-HDV-011).
- [x] Pantallas de admin para tipos de documento, tipos de funcionario y requisitos (RF-HDV-012, RF-HDV-013).
- [x] Configuración visible solo para `admin`.
- [x] Pruebas de componentes en verde, `lint` limpio y `build` exitoso.
- [x] Sin datos personales reales.
