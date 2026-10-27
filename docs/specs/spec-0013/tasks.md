# Documento de hoja de vida desde plantillas globales — Tareas

**Spec aprobado:** `spec.md` versión 0.1 (2026-10-27)  
**Plan:** `plan.md` versión 0.1  
**Estado:** Preparado para implementación. ADR-0032 y ADR-0033 Vigentes (2026-10-27); sin bloqueos de ADR.

Cuatro PR a `develop` (F1 a F4, ver plan). Cada tarea que cambie la API regenera `openapi/v1.json` y el cliente. Todas incluyen pruebas. Sin datos reales ni imágenes del formato de referencia.

## Matriz de dependencias

| Tarea | Fase | Requisitos | Depende de | Dueño |
|---|---|---|---|---|
| T-00 | — | Todos | Aprobación de la spec | Alexander Martínez (hecha) |
| T-01 | F1 | RF-PLA-005, 007 | T-00 | Alexander Martínez |
| T-02 | F1 | RF-PLA-008 a 012, 017 | T-01 | Alexander Martínez |
| T-03 | F1 | PD-PLA-16; RF-PLA-009, 017 | T-02 | Alexander Martínez |
| T-04 | F2 | RF-PLA-001, 002, 003, 004, 014 | T-01 | Alexander Martínez |
| T-05 | F2 | RF-PLA-003, 004, 014, 016, 018, 019 | T-04 | Alexander Martínez |
| T-06 | F2 | RF-PLA-001, 002, 005, 015, 016 | T-04 | Alexander Martínez |
| T-07 | F3 | RF-PLA-006, 007, 010, 014 | T-03, T-05 | Alexander Martínez |
| T-08 | F3 | RF-PLA-006, 012, 014, 016 | T-07 | Alexander Martínez |
| T-09 | F3 | RF-PLA-013, 016 | T-07 | Alexander Martínez |
| T-10 | F4 | RF-PLA-001 a 004, 015, 018, 019 | T-05, T-06 | Por asignar |
| T-11 | F4 | RF-PLA-006, 012 | T-08 | Por asignar |
| T-12 | F4 | Todos | T-01 a T-11 | Alexander Martínez |

## T-00 — Registrar la aprobación y las decisiones

- [x] Aprobación v0.1 registrada en `spec.md` (2026-10-27).
- [x] ADR-0032 y ADR-0033 Vigentes; PD-PLA-01, 09 y 16 resueltos.
- [x] `plan.md`, `tasks.md` y `test-e2e.md` creados.

**Resultado registrado:** hecha el 2026-10-27.  
**Bloqueos:** Ninguno.

## T-01 — Contrato del documento, catálogo cerrado y validador

**Objetivo:** `DatosDocumentoHojaDeVida`, `MarcaDocumento`, `ConfiguracionPlantilla`, catálogo cerrado e `IServicioGeneracionPdfHojaDeVida` en Application.  
**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Application/Documentos/*`, `src/Backend/tests/Istpet.ActualizacionDatos.Application.Tests/ValidadorConfiguracionPlantillaTests.cs`.  
**ADR aplicable:** ADR-0032.

- [ ] Pruebas que fallen: la configuración inicial es válida; sección o campo fuera del catálogo se rechaza con su código; secciones repetidas se rechazan; diseño base desconocido se rechaza; color que no sea `#RRGGBB` se rechaza; el catálogo no contiene cuenta bancaria, tipo de sangre, etnia ni discapacidad.
- [ ] Implementar.
- [ ] `dotnet test src/Backend --filter "Categoria!=Integracion"`.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno.

## T-02 — Generador QuestPDF y diseño base `clasico`

**Objetivo:** PDF con portada, datos personales, perfil, compromiso, formación, experiencia, cursos, referencias y portada de anexos, con la marca recibida.  
**Archivos exclusivos:** `src/Backend/Directory.Packages.props`, `.../Infrastructure/Istpet.ActualizacionDatos.Infrastructure.csproj`, `.../Infrastructure/Documentos/*`, `.../Infrastructure/RegistroDeInfraestructura.cs`, `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/GeneradorPdfHojaDeVidaTests.cs`.  
**ADR aplicable:** ADR-0032, ADR-0033.

- [ ] Pruebas que fallen (leyendo el PDF con PdfPig): contiene los datos y el perfil; sin foto no falla; sección vacía no aparece; compromiso con nombre y documento; marca de agua en cada página solo en vista previa; `<script>` y llaves se ven literales; imagen inválida no rompe; secciones en el orden de la configuración; dos marcas producen documentos distintos.
- [ ] Implementar y registrar la licencia Community.
- [ ] `dotnet test src/Backend --filter "Categoria!=Integracion"`.

**Resultado registrado:** pendiente  
**Bloqueos:** T-01.

## T-03 — Listas largas, rendimiento y revisión manual

**Objetivo:** cumplir PD-PLA-16 y revisar a mano un PDF de ejemplo con datos ficticios.  
**Archivos exclusivos:** `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/GeneradorPdfHojaDeVidaTests.cs`.

- [ ] Pruebas: 40 formaciones, 40 experiencias, 60 cursos y 20 referencias en menos de 2 s y menos de 5 MB; todos los ítems presentes.
- [ ] Generar un PDF de ejemplo fuera del repositorio y revisarlo a mano (sin capturas con datos reales).

**Resultado registrado:** pendiente  
**Bloqueos:** T-02.

## T-04 — Dominio y persistencia de plantillas y configuración

**Archivos exclusivos:** `.../Domain/Documentos/*`, `.../Infrastructure/Persistence/Configuraciones/Documentos/*`, `.../Persistence/AplicacionDbContext.cs`, `.../Persistence/Migrations/*`, `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/DocumentosTests.cs`.  
**ADR aplicable:** ADR-0004, ADR-0032.

- [ ] Pruebas: la versión publicada es inmutable; publicar incrementa el número; una sola predeterminada; la configuración de institución valida colores.
- [ ] Implementar y generar la migración (tablas vacías salvo la plantilla inicial `clasico` publicada como predeterminada).

**Resultado registrado:** pendiente  
**Bloqueos:** T-01.

## T-05 — Configuración del documento por institución (admin)

**Archivos exclusivos:** `.../Application/Servicios/IServicioConfiguracionDocumento.cs`, `.../Infrastructure/Servicios/ServicioConfiguracionDocumento.cs`, `.../WebApi/Endpoints/ConfiguracionDocumentoEndpoints.cs`, pruebas `ConfiguracionDocumentoTests.cs`.

- [ ] Pruebas: el `admin` lee y cambia solo su institución; logo y portada siguen ADR-0006; sin configuración se informa y se usa la predeterminada con marca neutra; una versión nueva no cambia la elegida hasta aceptarla; auditoría sin datos personales.
- [ ] Implementar; regenerar `openapi/v1.json` y cliente.

**Resultado registrado:** pendiente  
**Bloqueos:** T-04.

## T-06 — Biblioteca global (superadmin)

**Archivos exclusivos:** `.../Application/Servicios/IServicioPlantillasHojaDeVida.cs`, `.../Infrastructure/Servicios/ServicioPlantillasHojaDeVida.cs`, `.../WebApi/Endpoints/PlantillasHojaDeVidaEndpoints.cs`, pruebas `PlantillasHojaDeVidaTests.cs`.

- [ ] Pruebas: solo `superadmin` crea, edita, publica y marca predeterminada (los demás 403); campo fuera del catálogo 400; borrador visible solo para el `superadmin`; auditoría.
- [ ] Implementar; regenerar `openapi/v1.json` y cliente.

**Resultado registrado:** pendiente  
**Bloqueos:** T-04.

## T-07 — Armado de datos desde la hoja de vida

**Archivos exclusivos:** `.../Infrastructure/Servicios/ArmadorDatosDocumento.cs`, pruebas `ArmadorDatosDocumentoTests.cs`.

- [ ] Pruebas: mapa de la spec campo por campo; registro del título de mayor nivel (PD-PLA-08); perfil de ADR-0025; nada fuera del catálogo; solo la institución del token; secciones cerradas omitidas si spec-0010 está integrada.
- [ ] Implementar.

**Resultado registrado:** pendiente  
**Bloqueos:** T-03, T-05.

## T-08 — Descarga y vista previa

**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioDocumentoHojaDeVida.cs`, `.../WebApi/Endpoints/DocumentoHojaDeVidaEndpoints.cs`, pruebas `DocumentoHojaDeVidaTests.cs`.

- [ ] Pruebas: `admin` y `supervisor` descargan el PDF de su institución (otra institución 404); la persona ve su vista previa con marca de agua mientras no esté aprobada; la descarga por terceros queda auditada.
- [ ] Implementar; regenerar `openapi/v1.json` y cliente.

**Resultado registrado:** pendiente  
**Bloqueos:** T-07.

## T-09 — Exportación `.zip`

**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioExportacion.cs`, pruebas `ExportacionesTests.cs`.

- [ ] Pruebas: el `.zip` incluye el PDF de cada persona aprobada y de ninguna otra; un fallo de una persona se informa sin perder las demás; el HTML actual sigue (PD-PLA-17); 100 personas en menos de 60 s.
- [ ] Implementar; verificar la imagen Docker.

**Resultado registrado:** pendiente  
**Bloqueos:** T-07.

## T-10 — Pantallas de plantillas y marca

- [ ] Vitest: el `superadmin` lista, crea, publica y marca predeterminada; el `admin` elige plantilla, acepta versión nueva, sube logo y portada, fija colores, lema y compromiso; error accesible.
- [ ] `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.

**Resultado registrado:** pendiente  
**Bloqueos:** T-05, T-06.

## T-11 — Descarga y vista previa en pantalla

- [ ] Vitest: botón de descarga en revisión y panel del `admin`; vista previa para la persona.
- [ ] `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.

**Resultado registrado:** pendiente  
**Bloqueos:** T-08.

## T-12 — Verificación integral

- [ ] `dotnet build src/Backend`, `dotnet test src/Backend` (con Docker para la integración).
- [ ] `pnpm --dir src/Frontend test:ci`, `lint`, `format:check`; `openapi/v1.json` y cliente al día.
- [ ] Ejecutar `test-e2e.md` con datos ficticios y revisar un PDF a mano.

**Resultado registrado:** pendiente  
**Bloqueos:** T-01 a T-11.
