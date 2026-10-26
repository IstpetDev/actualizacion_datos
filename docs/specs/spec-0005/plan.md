# Validación y perfil automático — Plan

Spec v0.1 aprobada el 2026-10-26 («si, continua»). ADR-0023/0024 registrados antes de implementar. Un coordinador, sin subagentes, sin dependencias nuevas.

| Requisitos | Tarea | Rutas desde la raíz | Verificación |
|---|---|---|---|
| RF-VAL-001/003/006 | T-01 Reglas y errores | `src/Backend/src/Istpet.ActualizacionDatos.Application/Validacion/`, `WebApi/Endpoints/AccesoEndpoints.cs`, `Infrastructure/Servicios/ServicioHojaDeVida.cs`, `ServicioDocumentosPersonales.cs`, `ServicioCuentaBancaria.cs`, `ServicioPersonas.cs` | Matriz xUnit y HTTP: válidos, errores, sin persistencia parcial ni eco |
| RF-VAL-004/005/009 | T-02 Política | `Domain/Institucion.cs`, `Infrastructure/Persistence/Configuraciones/InstitucionConfiguracion.cs`, nueva migración, `WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs`, modelos y servicios de configuración | PostgreSQL/SQLite: default vacío, límites, tenant A/B, permisos y cabeceras |
| RF-VAL-002/006 | T-03 Envío | `Infrastructure/Servicios/ValidadorCompletitudEnvio.cs`, registro DI | Antiguos inválidos y envío completo válido; no nuevas obligatoriedades |
| RF-VAL-007/008 | T-04 Perfil y CV | modelos HDV, servicio HDV, `ServicioExportacion.cs`, `GeneradorExcelOpenXml.cs`, nuevo generador HTML/perfil | Rechazo de propiedad, legado ignorado, revisión, contenido ZIP/Excel y HTML escapado |
| RF-VAL-001 a 008 | T-05 Angular | `src/Frontend/src/app/features/usuario/hoja-de-vida/`, configuración admin, revisión supervisor y cuenta bancaria | Metadatos, errores por campo, botones, dominios, perfil ausente, pruebas Vitest |
| RF-VAL-009/010 | T-06 Integración | `openapi/v1.json`, cliente, `docs/evidencia/issue-88.md`, script de navegador | Suites completas, contrato, Docker, lint/formato, navegador real, CI y cierre |

Las rutas backend abreviadas parten de `src/Backend/src/Istpet.ActualizacionDatos.` y su proyecto. T-01/T-02 preceden a T-03/T-05; T-04 usa reglas de T-01; T-06 integra todo. Los DTO se fijan y regeneran antes de editar consumidores Angular.

Dependencia #94: al inicio sigue abierto y no se integra un PR ajeno sin revisión. Se usa su forma compatible de MensajeRespuesta con un error de validación acotado, sin duplicar su middleware de negocio; si se integra durante el trabajo se incorpora develop y se resuelven las coincidencias. Los errores de JSON se convierten en 400 seguro por campo y no se registran valores. La sección de dominios se mantiene independiente para facilitar el trabajo de #83.

La configuración de dominios se guarda con la institución, predeterminada vacía; no se truncan columnas ni se borran perfiles históricos. Se retira perfil del request y se rechaza su presencia. No se cambia autorización ni obligatoriedad al enviar. Las pruebas y ejemplos son ficticios y nunca se utiliza configuración real.
