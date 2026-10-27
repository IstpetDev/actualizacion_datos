# ADR-0033 — Motor de generación de PDF en .NET

- **Estado:** Propuesto
- **Fecha:** 2026-10-27

## Contexto

El backend .NET 10 (`src/Backend`) no posee dependencias para generar archivos PDF. En el ADR-0025 («Perfil profesional generado») se decidió explícitamente no incorporar librerías de PDF para la exportación simple en HTML. La spec-0013 (issue #101) requiere generar el documento de hoja de vida en PDF con alta calidad gráfica, portadas y encabezados.

Es necesario seleccionar una dependencia técnica que cumpla con los siguientes criterios:
1. Compatibilidad nativa con .NET 10 en entornos Linux y contenedores Docker (`mcr.microsoft.com/dotnet/aspnet:10.0-preview` o runtime oficial).
2. Licenciamiento compatible con el proyecto institucional sin incurrir en infracciones legales (evitar AGPLv3 o licencias comerciales restrictivas no autorizadas).
3. Seguridad: libre de vectores de ataque como SSRF o Remote Code Execution derivados de la ejecución de navegadores headless en servidores.
4. Rendimiento y bajo consumo de memoria RAM para soportar exportaciones concurrentes.

## Opciones

1. **QuestPDF (versión fija, licencia Community):**
   - *Ventajas:* Diseñado específicamente para .NET con motor SkiaSharp embebido; API fluida y declarativa; genera paginación dinámica («Página X de Y»), tablas complejas, encabezados y pies de página; renderiza documentos de 5 páginas en menos de 50 milisegundos; consumo de memoria mínimo (pocos megabytes).
   - *Consideraciones de licencia:* QuestPDF utiliza licencia dual; la licencia Community es gratuita para organizaciones y proyectos con ingresos anuales inferiores a $1M USD. Requiere declarar la licencia explícitamente en el código de inicialización: `QuestPDF.Settings.License = LicenseType.Community;`.
2. **Puppeteer-Sharp / Playwright (Headless Chromium):**
   - *Ventajas:* Renderizado exacto de páginas web HTML/CSS.
   - *Desventajas:* Requiere empaquetar o descargar Chromium dentro del contenedor Docker (añadiendo más de 300 MB a la imagen base); alto consumo de memoria RAM (150-300 MB por proceso); riesgo de ataques SSRF y tiempo de arranque de proceso elevado.
3. **PDFsharp / MigraDoc:**
   - *Ventajas:* Licencia MIT completamente permisiva.
   - *Desventajas:* API antigua, soporte limitado y engorroso para maquetación moderna con portadas a sangre completa, colores hex y elementos flotantes.
4. **iText 7 (anteriormente iTextSharp):**
   - *Ventajas:* Muy completo y maduro.
   - *Desventajas:* Licencia AGPLv3 estricta, lo que requeriría licenciar el sistema completo bajo AGPLv3 o adquirir una licencia comercial propietaria costosa.

## Decisión propuesta

Se selecciona la **Opción 1: QuestPDF**.

Se incorpora el paquete NuGet `QuestPDF` en `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/` bajo versión fija. Se encapsula toda la interacción detrás de la interfaz de aplicación `IServicioGeneracionPdfHojaDeVida`, evitando que las capas de Dominio o Aplicación dependan de la librería.

El servicio genera el documento en memoria retornando un flujo `Stream` o arreglo de bytes `byte[]` sin guardar copias no autorizadas en disco.

## Consecuencias

- **Positivas:** Despliegue Docker ligero sin dependencias de navegadores; generación ultra rápida y determinista; pruebas unitarias sencillas y rápidas en xUnit; diseño visual idéntico entre desarrollo (Windows) y producción (Linux).
- **Negativas:** La configuración de la licencia Community debe quedar explícitamente declarada en `Program.cs` o en la configuración de Infrastructure.
- **Riesgos y mitigaciones:** SkiaSharp en Linux requiere la presencia de la librería `libfontconfig1`. Se debe asegurar su inclusión en la imagen `Dockerfile` de backend en caso de requerirse para fuentes personalizadas.

## ADR relacionados

- ADR-0001 — Clean Architecture en el backend.
- ADR-0011 — Despliegue automático a producción.
- ADR-0025 — Perfil profesional generado.
- ADR-0032 — Formato de las plantillas globales de hoja de vida.
