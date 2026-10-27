# ADR-0031 — Formato de las plantillas globales de hoja de vida

- **Estado:** Propuesto
- **Fecha:** 2026-10-27

## Contexto

El sistema de actualización de datos debe generar el documento de hoja de vida en PDF con la identidad y marca institucional (spec-0012, issue #101). El documento de referencia institucional consta de 5 páginas:
1. Portada institucional con imagen de portada, logotipo, título y lema.
2. Datos personales con fotografía del funcionario, datos de contacto, perfil profesional generado deterministamente (ADR-0025) y bloque de compromiso con firma.
3. Formación académica registrada.
4. Experiencia laboral y capacitaciones/talleres.
5. Referencias personales/familiares y portada de anexos generales.

El sistema actual solo producía un archivo HTML plano sin diseño dentro del archivo ZIP de exportación (`GeneradorCvHtml`). Es necesario definir cómo se estructuran y representan las plantillas para garantizar fidelidad gráfica, portabilidad multi-institución y desacoplamiento del modelo de persistencia.

## Opciones

1. **Documentos `.docx` con campos de combinación (Mail Merge) convertidos a PDF:**
   - *Ventajas:* Familiaridad al editar la plantilla inicial en Word.
   - *Desventajas:* Los documentos Word con cuadros flotantes, imágenes dinámicas y tablas de tamaño variable se desalinean fácilmente al rellenar datos. La conversión a PDF en Linux/Docker requeriría dependencias pesadas como LibreOffice en segundo plano.
2. **Plantillas HTML5 + CSS interpoladas y renderizadas a PDF:**
   - *Ventajas:* Permite editar el marcado como texto plano.
   - *Desventajas:* Requiere un motor de renderizado de navegador (Chromium/WebKit) para interpretar CSS avanzado y generar el PDF, lo que aumenta el consumo de recursos y la superficie de ataque (inyección de HTML, SSRF en carga de imágenes externas).
3. **Plantillas declarativas en código C# fuertemente tipadas desacopladas de la marca:**
   - *Ventajas:* 100% deterministas, ejecución nativa en milisegundos, tipado estricto en tiempo de compilación, sin riesgos de inyección, y consumo mínimo de memoria RAM en contenedores Docker.
   - *Desventajas:* Agregar una nueva plantilla global requiere registrar una clase en el código backend.

## Decisión propuesta

Se adopta la **Opción 3**, estructurada con un diseño completamente desacoplado:

1. **Desacoplamiento de la Marca:** La plantilla no contiene elementos propios de una institución. Define únicamente la estructura de maquetación, tipografías y disposición de bloques. La institución provee dinámicamente sus atributos de marca (`ConfiguracionMarcaInstitucion`):
   - Logotipo institucional (`logo_archivo_id`).
   - Imagen de portada (`portada_archivo_id`).
   - Paleta de colores (`ColorPrimario`, `ColorSecundario`).
   - Lema institucional.
   - Texto del compromiso institucional para firma.
2. **Desacoplamiento del Modelo de Datos:** El motor de generación de PDF no consulta repositorios ni bases de datos; opera exclusivamente contra un contrato inmutable de aplicación: `DatosDocumentoHojaDeVida`. Si una sección no contiene registros o está deshabilitada en la institución, el renderizador la omite de manera limpia y sin errores.
3. **Biblioteca Global:** Las plantillas son administradas a nivel global por el `superadmin`, asignando una plantilla predeterminada del sistema. Cada institución elige qué plantilla de la biblioteca utilizar.

## Consecuencias

- **Positivas:** Maquetación exacta sin desbordamientos gráficos; rendimiento óptimo en backend; se pueden ejecutar pruebas unitarias completas de generación en xUnit con datos ficticios sin requerir base de datos ni Docker.
- **Negativas:** La creación de nuevas estructuras de plantilla base se realiza mediante componentes en el backend.
- **Riesgos y mitigaciones:** Las imágenes institucionales y fotos de perfil deben ser validadas en dimensiones y formatos antes de incrustarse en el flujo de renderizado.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0025 — Perfil profesional generado.
- ADR-0032 — Motor de generación de PDF en .NET.
