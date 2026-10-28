# ADR-0032 — Formato de las plantillas globales de hoja de vida

- **Estado:** Vigente
- **Fecha:** 2026-10-27
- **Decidió:** Alexander Martínez (responsable de implementación), 2026-10-27; spec-0013 aprobada por Joseph Baño

## Contexto

El sistema de actualización de datos debe generar el documento de hoja de vida en PDF con la identidad y marca institucional (spec-0013, issue #101). El documento de referencia institucional consta de 5 páginas:
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

## Decisión

Se adopta una **variante híbrida de la opción 3** (decidida el 2026-10-27 por quien desarrolla):

1. **Diseños base en código.** La maquetación (tipografía, disposición de bloques, portada, paginación) vive en C# como *diseños base* registrados con un código estable (el primero: `clasico`). Agregar un diseño base nuevo es un cambio de código revisado en PR.
2. **La plantilla global es un dato.** El `superadmin` crea y publica plantillas (spec-0013, RF-PLA-001/002) como registros con nombre, descripción, el código del diseño base y una **configuración JSON** que define qué secciones aparecen, en qué orden, qué campos de cada sección y si una sección vacía se muestra. Esa configuración se valida contra el **catálogo cerrado de campos** (RF-PLA-005) al crear y al publicar; un campo o sección fuera del catálogo se rechaza.
3. **Desacoplamiento de la marca.** La plantilla no contiene elementos de una institución. Cada institución aporta su marca (`MarcaDocumento`): nombre visible, logotipo, imagen de portada, color principal, color secundario, lema y texto del compromiso.
4. **Desacoplamiento del modelo de datos.** El generador no consulta repositorios ni base de datos; recibe un contrato inmutable de aplicación, `DatosDocumentoHojaDeVida`. Una sección sin registros o deshabilitada (spec-0010) se omite sin errores.
5. **Biblioteca global.** Hay una plantilla predeterminada; cada institución elige la suya y la versión publicada que usa (RF-PLA-018/019).

Con esto se descarta la plantilla HTML/CSS convertida a PDF que proponía la v0.1 de la spec en PD-PLA-01: exige un navegador sin interfaz en el servidor (ver ADR-0033).

## Consecuencias

- **Positivas:** Maquetación exacta sin desbordamientos gráficos; rendimiento óptimo en backend; se pueden ejecutar pruebas unitarias completas de generación en xUnit con datos ficticios sin requerir base de datos ni Docker.
- **Negativas:** Un diseño base nuevo (maquetación distinta) requiere un cambio de código; las variaciones de secciones, orden y campos no.
- **Riesgos y mitigaciones:** Las imágenes institucionales y fotos de perfil deben ser validadas en dimensiones y formatos antes de incrustarse en el flujo de renderizado.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0006 — Almacenamiento de archivos.
- ADR-0025 — Perfil profesional generado.
- ADR-0033 — Motor de generación de PDF en .NET.
