# Catálogos públicos para la hoja de vida

**Consulta y normalización:** 2026-10-22. **Alcance:** issue #29, spec-0003 v0.3, RF-HDV-014 y ADR-0010 decisión 5. Los CSV son las entradas versionadas del importador. Contienen listas públicas de lugares, instituciones y clasificaciones; ningún registro de personas.

## Procedencia, edición y cobertura

| CSV | Filas | Fuente y edición | Transformación |
|---|---:|---|---|
| Pais.csv | 248 | [División de Estadística de Naciones Unidas, M49](https://unstats.un.org/unsd/methodology/m49/overview/), tabla en español consultada el 2026-10-22 | Países y áreas; código numérico M49 de tres dígitos, con ceros iniciales. Orden por nombre. Ecuador = 218. Se usa la lista M49 publicada por su organismo de origen para evitar la lista antigua de países que aún distribuye el INEC. |
| Provincia.csv | 24 | [INEC, códigos DPA 2026](https://aplicaciones2.ecuadorencifras.gob.ec/SIN/descargas/cdpa2026.xlsx), hojas CODIGOS y PARROQUIAS | Provincias 01 a 24; padre Ecuador 218. Se excluye el código estadístico 90 «zona en estudio», que no es una provincia. |
| Canton.csv | 222 | Mismo recurso INEC DPA 2026 | Códigos de cuatro dígitos de las 24 provincias, sin zonas en estudio. Padre = código provincial. |
| Parroquia.csv | 1315 | Mismo recurso INEC DPA 2026 | Unión sin duplicados de códigos de seis dígitos F/G de CODIGOS y H/I de PARROQUIAS: cabeceras cantonales, parroquias rurales y urbanas. Padre = código cantonal. Una cabecera y sus parroquias urbanas son entradas distintas tal como aparecen en la fuente. |
| Universidad.csv | 64 | CES: [públicas nacionales](https://www.ces.gob.ec/?page_id=328), [particulares cofinanciadas](https://www.ces.gob.ec/?page_id=5398), [particulares autofinanciadas](https://www.ces.gob.ec/?page_id=1540); instantánea del 2026-10-22 | Unión por código de los tres listados nacionales. Se conservan el código oficial de IES y su nombre, padre Ecuador 218. Incluye universidades y escuelas politécnicas; no es un catálogo mundial ni de institutos técnicos. Para otras instituciones, el modelo ya admite nombre de institución fuera del catálogo. |
| CampoAmplioUnesco.csv | 10 | [CES, anexo de armonización RPC-SO-27-No.289-2014](https://www.ces.gob.ec/lotaip/Anexos%20Generales/a3/Reglamento_Armonizaci%C3%B3n_nomenclatura_T%C3%ADtulosProfesionales_GradosAcad%C3%A9micos.pdf), anexo a), páginas 1 a 3 del anexo (11 a 13 del PDF) | Adaptación ecuatoriana de CINE que incluye Psicopedagogía y otros desgloses nacionales. Es la edición documental de referencia de esta carga, no una afirmación de vigencia normativa del reglamento. No se mezcla con la tabla internacional 00 a 10 de UNESCO. |
| CampoEspecificoUnesco.csv | 26 | Mismo anexo CES | Código compuesto `amplio.especifico`; padre amplio. |
| CampoDetalladoUnesco.csv | 97 | Mismo anexo CES | Código compuesto `amplio.especifico.detallado`; padre compuesto específico. Se conserva el segmento nacional 81, 82, etc., sin confundirlo con el código internacional de cuatro dígitos. Los saltos de línea dentro de una celda se convierten en espacios. |
| NivelAcademico.csv | 9 | [SENESCYT, guía de registro de docentes, tercera edición 2020](https://siau.senescyt.gob.ec/download/guias-de-registro/?wpdmdl=10021&ind=10016&filename=gripp_docentes.pdf), ítem 24 | Las siete categorías oficiales de formación del docente, más primaria y secundaria acordadas por spec-0003. |
| GradoAcademico.csv | 9 | Misma guía SENESCYT, ítems 24 y 45, más las dos semillas acordadas | Las siete categorías de titulación se vinculan cada una a su categoría de nivel correspondiente. Se usa el código oficial 1 a 7, no ids del sistema institucional. El nombre específico del título sigue en `NombreTitulo`. Primaria completa y bachillerato dependen de primaria/secundaria. |
| Etnia.csv | 9 | [SENESCYT, guía de registro de matriculados, tercera edición 2020](https://siau.senescyt.gob.ec/download/guias-de-registro/?wpdmdl=10021&ind=10014&filename=gripp_matriculas.pdf), ítem 10 | Códigos y etiquetas de la tabla, incluido «No registra». |
| NacionalidadIndigena.csv | 34 | Guía SENESCYT de docentes 2020, anexo 1 | Lista completa de pueblos y nacionalidades del formulario, incluidos pueblos de la nacionalidad Kichwa y «No aplica». No se presenta como una lista de 34 nacionalidades. |
| Discapacidad.csv | 7 | Guía SENESCYT de matriculados, ítem 16 | Códigos y etiquetas, incluido «No aplica». |
| TipoBeca.csv | 3 | Misma guía, ítem 43 | Total, parcial y no aplica. |
| FinanciamientoBeca.csv | 4 | Misma guía, ítem 53 | Fondos propios, transferencia del Estado, donaciones y no aplica. |

Los códigos M49, DPA e IES se conservan en `codigo_externo`; en los campos CINE se conserva la ruta de segmentos de la fuente porque un segmento aislado se repite bajo distintos padres. En los diccionarios SENESCYT se conserva el código que publica la guía. La existencia de un código de IES no supone que cada programa suyo esté vigente; tampoco se eliminan instituciones de títulos antiguos por no aparecer en una oferta académica vigente.

**Decisión de fuentes:** PD-HDV-03 propone listas y códigos del sistema de talento humano. No se dispone de una exportación pública de ese sistema. El solicitante autorizó el 2026-10-22 continuar y tomar/documentar las decisiones necesarias. Se emplean fuentes oficiales públicas equivalentes del mismo ámbito; **no se afirma que estos códigos coincidan con ids internos de talento humano**. No se consultó su base ni se leyeron datos personales o credenciales. Cuando el responsable entregue un mapeo exclusivamente de catálogos, se podrá revisar `codigo_externo` con una importación explícita, preservando los ids de esta aplicación.

## Semillas y orden

La migración mantiene las 22 opciones iniciales de sexo, estado civil, tipo de sangre y capacitación. Agrega cinco entradas acordadas en spec-0003: instrucción profesional (id 48), niveles primaria/secundaria (51/52), y grados primaria completa/bachillerato (61/62). Estas cinco no reciben códigos externos inventados.

Los CSV de niveles y grados incluyen las dos semillas respectivas, idénticas y al principio, para que el orden del archivo coloque primaria y secundaria antes de los estudios superiores. El importador verifica que esas filas no cambien la semilla. Las demás entradas reciben ids >=1000; `id` y `codigo` son conceptos distintos. La carga completa deja **2104 elementos**: 27 semillas y 2077 importados. Todos los 19 tipos tienen elementos.

Orden de importación: los tipos sin padre primero; país antes de provincia y universidad; provincia antes de cantón; cantón antes de parroquia; nivel antes de grado; amplio antes de específico antes de detallado. El cargador de desarrollo sigue el orden del enum, que ya cumple esas dependencias. Dentro de cada CSV, el número de fila de datos fija `orden`; los empates en consulta se resuelven por código.

## Usar la API

- `GET /api/catalogos/{tipo}?padreId=`: cookie autenticada de cualquier rol; solo activos, por orden. El tipo puede indicarse con su nombre, por ejemplo `Provincia`, `Canton` o `GradoAcademico`.
- `POST /api/catalogos/{tipo}/importar`: cookie de **superadmin**, formulario multipart con campo `archivo`. CSV UTF-8, BOM opcional, separador coma, cabecera exacta `codigo,nombre,codigo_padre,codigo_externo`. Se admiten campos entrecomillados con comas y comillas dobles escapadas. Máximo 1 MiB y 10.000 filas por archivo. No se envían contraseñas ni cookies en ejemplos versionados.
- `codigo` y `codigo_padre`: se recortan y se normalizan a mayúsculas; código/external hasta 50 caracteres y nombre hasta 300. El padre se busca por su código dentro del tipo permitido por `ElementoCatalogo.TipoPadre`.
- Reimportar actualiza nombre, padre, código externo y orden sin cambiar ids. Las filas ausentes permanecen; los inactivos no se reactivan implícitamente. Un error invalida todo el archivo, sin guardar filas parciales. Las semillas inferiores a 1000 se pueden reconocer sin cambios, pero no modificar por este endpoint.
- Las importaciones PostgreSQL bloquean la tabla dentro de la transacción para evitar duplicados y colisiones de ids entre procesos. Las consultas normales siguen disponibles.

## Desarrollo con Docker

`docker-compose.yml` habilita `Catalogos__CargarAlInicio=true` solo en Development y monta esta carpeta de solo lectura en `/catalogos`. Tras las migraciones se cargan los 15 CSV con el mismo servicio de importación. Al reiniciar no se duplica. Si falta un archivo requerido o es inválido, el arranque falla con un mensaje; no se declara saludable una carga incompleta.

Fuera de Development no se ejecuta la carga automática, aunque aparezca esa opción de configuración. La imagen no descarga catálogos ni los incorpora implícitamente a producción. Un superadmin puede importar de forma explícita mediante la API en el entorno que corresponda.

## Trazabilidad y actualización

[fuentes.json](fuentes.json) registra fecha de consulta, URLs, SHA-256 de los recursos descargados y SHA-256/recuento de cada CSV normalizado. Los documentos completos de las fuentes quedan fuera del repositorio: solo se versionan sus tablas públicas normalizadas, sin ejemplos, firmas ni metadatos personales de los documentos originales.

Para actualizar una fuente: descargar desde su URL oficial, extraer solo la tabla indicada arriba, conservar códigos y ceros iniciales, comparar cobertura y cambios, escribir UTF-8 con la misma cabecera y actualizar el manifiesto/fecha. No asignar equivalencias institucionales por similitud de nombres. La extracción de esta versión usó XML estándar de XLSX para DPA, tablas HTML para ONU/CES y tablas del PDF para los diccionarios y CINE; se verificaron unicidad, relaciones y recuentos antes de importar sobre PostgreSQL. No se añadieron dependencias de extracción a la aplicación.
