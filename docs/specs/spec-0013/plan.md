# Documento de hoja de vida desde plantillas globales — Plan de implementación

**Spec aprobado:** `spec.md` versión 0.1 (2026-10-27, evidencia en «Revisión funcional»)  
**Objetivo:** generar el PDF de la hoja de vida de cada persona con una plantilla global elegida por su institución y la marca de esa institución; vista previa, descarga auditada e inclusión en el `.zip`.  
**Áreas:** `src/Backend` y `src/Frontend`  
**Tecnologías:** .NET 10 con Clean Architecture y EF Core con PostgreSQL, xUnit; QuestPDF 2026.9.1 (ADR-0033) y PdfPig solo en pruebas; Angular 22 con Vitest; cliente OpenAPI con NSwag.

## Fases y entregas

La spec se entrega en **cuatro PR** a `develop`, cada uno con sus pruebas y la CI en verde:

| Fase | Contenido | Tareas | Rama sugerida |
|---|---|---|---|
| F1 | Motor PDF, contrato `DatosDocumentoHojaDeVida`, catálogo cerrado y validador de la configuración, diseño base `clasico` | T-01 a T-03 | `feature/101-motor-pdf-hoja-de-vida` |
| F2 | Plantillas globales con versiones, configuración del documento por institución (marca y plantilla elegida), API | T-04 a T-06 | `feature/101-plantillas-y-marca` |
| F3 | Armado de datos desde la hoja de vida, descarga, vista previa, exportación `.zip` y auditoría | T-07 a T-09 | `feature/101-generacion-y-exportacion` |
| F4 | Pantallas del `superadmin`, del `admin`, del `supervisor` y de la persona; verificación integral | T-10 a T-12 | `feature/101-pantallas-documento` |

## Correspondencia con el spec

| Requisito o escenario | Decisión de diseño | Archivo (desde la raíz) | Tarea | Verificación |
|---|---|---|---|---|
| RF-PLA-005 | Catálogo cerrado de secciones y campos en código; `ValidadorConfiguracionPlantilla` rechaza cualquier código fuera del catálogo. | `src/Backend/src/Istpet.ActualizacionDatos.Application/Documentos/CatalogoCamposDocumento.cs`, `ValidadorConfiguracionPlantilla.cs` | T-01 | V-01 |
| RF-PLA-007 | El contrato recibe el perfil ya generado con `PerfilProfesional.Generar` (ADR-0025); no hay campo de perfil libre. | `.../Application/Documentos/DatosDocumentoHojaDeVida.cs` | T-01, T-07 | V-02 |
| RF-PLA-008, 009, 010, 011, 012, 017 | Diseño base `clasico` en QuestPDF: marcador neutro sin foto; ítems sin partir entre páginas; secciones vacías omitidas; compromiso con nombre y documento y firma en blanco; marca de agua «Vista previa, no oficial» en cada página; todo texto se dibuja literal (sin intérprete de marcado). | `.../Infrastructure/Documentos/GeneradorPdfHojaDeVida.cs`, `.../Infrastructure/Documentos/Disenos/DisenoClasico.cs` | T-02, T-03 | V-02 |
| PD-PLA-16 | Pruebas de rendimiento con listas largas: hasta 2 s y 5 MB por documento. | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/GeneradorPdfHojaDeVidaTests.cs` | T-03 | V-02 |
| RF-PLA-001, 002, 015 | Entidades globales `PlantillaHojaDeVida` (borrador) y `VersionPlantillaHojaDeVida` (inmutable); solo `superadmin`. | `.../Domain/Documentos/*`, `.../WebApi/Endpoints/PlantillasHojaDeVidaEndpoints.cs` | T-04, T-06 | V-03 |
| RF-PLA-003, 004, 014, 018, 019 | Entidad institucional `ConfiguracionDocumentoInstitucion` con marca y versión elegida; sin fila = predeterminada y marca neutra; la versión elegida no cambia sola. | `.../Domain/Documentos/ConfiguracionDocumentoInstitucion.cs`, `.../Infrastructure/Servicios/ServicioConfiguracionDocumento.cs` | T-04, T-05, T-06 | V-03 |
| RF-PLA-004 (archivos) | Logo y portada se suben con el servicio de archivos existente y sus reglas (ADR-0006: tipo, tamaño, firma). | `.../Infrastructure/Servicios/ServicioArchivos.cs` (solo uso) | T-05 | V-03 |
| RF-PLA-006, 014 | `ArmadorDatosDocumento` lee la hoja de vida de la institución del token y produce el contrato; descarga solo `admin` y `supervisor` de la institución. | `.../Infrastructure/Servicios/ServicioDocumentoHojaDeVida.cs`, `.../WebApi/Endpoints/DocumentoHojaDeVidaEndpoints.cs` | T-07, T-08 | V-04 |
| RF-PLA-012 | Vista previa de la propia persona con marca de agua si la hoja no está aprobada; sin auditoría de terceros. | Mismo servicio y endpoints | T-08 | V-04 |
| RF-PLA-013 | `ServicioExportacion` añade el PDF por persona aprobada; un fallo por persona se informa sin perder las demás. El HTML actual se conserva (PD-PLA-17). | `.../Infrastructure/Servicios/ServicioExportacion.cs` | T-09 | V-05 |
| RF-PLA-016 | Auditoría de generación por terceros, exportación y cambios de plantilla, elección y marca, sin datos personales. | `IServicioAuditoria` (solo uso) | T-05, T-06, T-08, T-09 | V-03, V-04 |
| Escenarios 1 a 6 | Pantallas y recorrido de punta a punta. | `src/Frontend/src/app/features/...`, `docs/specs/spec-0013/test-e2e.md` | T-10 a T-12 | V-06, V-07 |

## Diseño y contratos

**Contrato del generador (Application, sin dependencias de QuestPDF).**
- `DatosDocumentoHojaDeVida`: datos personales del catálogo cerrado (nombre completo, documento, tipo de personal, lugar y fecha de nacimiento, estado civil, ciudad y dirección, teléfonos, correo institucional, registro del título de mayor nivel según PD-PLA-08), foto (bytes opcionales), perfil generado, listas de formación, experiencia, capacitaciones y referencias, fecha de generación y si es vista previa.
- `MarcaDocumento`: nombre visible, logo y portada (bytes opcionales), color principal y secundario (hexadecimal `#RRGGBB`), lema y texto del compromiso. `MarcaDocumento.Neutra` para RF-PLA-018.
- `ConfiguracionPlantilla`: código del diseño base y lista ordenada de secciones (`portada`, `datos_personales`, `perfil`, `compromiso`, `formacion`, `experiencia`, `capacitaciones`, `referencias`, `anexos`), cada una con sus campos y `MostrarSiVacia`. Se serializa como JSON en la versión publicada.
- `IServicioGeneracionPdfHojaDeVida.Generar(datos, marca, configuracion) : byte[]`. Imágenes inválidas se tratan como ausentes (marcador neutro).

**Catálogo cerrado (RF-PLA-005).** Solo los campos del mapa de la spec. Nunca cuenta bancaria, tipo de sangre, etnia, discapacidad, correo personal ni datos de acceso.

**Persistencia (F2).** `plantillas_hoja_de_vida` y `versiones_plantilla_hoja_de_vida` globales (sin `institucion_id`); `configuraciones_documento_institucion` con `institucion_id` y filtro de institución (ADR-0004). La versión publicada guarda copia del JSON y del diseño base: no se modifica.

**API (nombres provisionales, a fijar en T-06 y T-08).**
- `superadmin`: `GET/POST /api/plantillas-hoja-de-vida`, `PUT /api/plantillas-hoja-de-vida/{id}`, `POST /api/plantillas-hoja-de-vida/{id}/publicar`, `POST /api/plantillas-hoja-de-vida/{id}/predeterminada`.
- `admin`: `GET/PUT /api/configuracion/documento-hoja-de-vida` (marca y versión elegida; indica si hay una versión nueva sin aceptar o si no hay configuración propia).
- `admin`, `supervisor`: `GET /api/personas/{id}/documento-hoja-de-vida` (PDF).
- `usuario`: `GET /api/mis-datos/documento-hoja-de-vida` (vista previa).

**Errores.** Campo fuera del catálogo: 400 con el código rechazado. Color inválido: 400. Persona de otra institución: 404. Sin rol: 403. Fallo de generación: 500 uniforme (ADR-0026) sin datos personales en el log.

## ADR aplicables

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| Formato de plantillas (híbrido: diseños base en código, plantilla como dato) | `docs/decisiones/ADR-0032-formato-plantillas-hoja-de-vida.md` | Vigente (2026-10-27) | T-01 a T-06 |
| Motor PDF QuestPDF Community | `docs/decisiones/ADR-0033-motor-generacion-pdf.md` | Vigente (2026-10-27) | T-02, T-03, T-09 |
| Aislamiento por institución | `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Vigente | T-04 a T-09 |
| Archivos | `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Vigente | T-05 |
| Perfil generado | `docs/decisiones/ADR-0025-perfil-profesional-generado.md` | Vigente | T-07 |
| Secciones por institución | `docs/decisiones/ADR-0028-secciones-habilitadas-por-institucion.md` | Vigente | T-07 (si spec-0010 ya está integrada) |

Ninguna tarea queda bloqueada por ADR.

## Orden de ejecución e integración

1. **F1** no depende de la persistencia de spec-0010 ni spec-0008 (PD-PLA-18): opera contra el contrato.
2. **F2** es el único dueño de la migración de esta spec y de `AplicacionDbContext.cs`; si spec-0010 o spec-0008 integran migraciones antes, se rebasa.
3. **F3** omite las secciones cerradas solo si `IServicioSecciones` (spec-0010) ya existe en `develop`; si no, se integra en cuanto llegue.
4. **F4** tras regenerar el cliente en F2 y F3.

## Riesgos

| Riesgo | Efecto | Acción |
|---|---|---|
| Fuentes en Linux | Texto con otra fuente o error en el contenedor | QuestPDF incluye fuente por defecto; se verifica la imagen Docker en F3 |
| Imágenes grandes o inválidas | PDF pesado o fallo | Se ignoran las inválidas; tamaño acotado por ADR-0006; prueba de 5 MB |
| Imágenes reales del formato de referencia | Datos de menores en el repositorio | Prohibido; la plantilla inicial usa colores y marcadores neutros |
| Colisión de numeración con otras ramas | Conflictos | Verificar números libres antes de cada PR |

## Comprobación del plan

- [x] Rutas y tecnologías coinciden con el código actual (`GeneradorCvHtml`, `ServicioExportacion`, `PerfilProfesional`).
- [x] ADR-0032 y ADR-0033 Vigentes.
- [x] Cada requisito de la v0.1 tiene tarea.
- [ ] Confirmar nombres de endpoints al inicio de T-06 y T-08.
