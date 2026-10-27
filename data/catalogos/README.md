# Catálogos públicos para la hoja de vida

**Consulta y normalización:** 2026-10-22; ampliación de bancos e institutos: 2026-10-26 (spec-0004 v0.2, ADR-0021 y ADR-0022). **Alcance:** issue #29, spec-0003 v0.3, RF-HDV-014 y ADR-0010 decisión 5. Los CSV son las entradas versionadas del importador. Contienen listas públicas de lugares, instituciones y clasificaciones; ningún registro de personas.

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

Los CSV de niveles y grados incluyen las dos semillas respectivas, idénticas y al principio, para que el orden del archivo coloque primaria y secundaria antes de los estudios superiores. El importador verifica que esas filas no cambien la semilla. Las demás entradas reciben ids >=1000; `id` y `codigo` son conceptos distintos. La carga original dejaba **2106 elementos**: 29 semillas (incluidos los tipos de cuenta bancaria 71 y 72 de #45) y 2077 importados. La ampliación añade 28 bancos y 216 institutos: **2350 elementos** en total y opciones para los 21 tipos. Universidad contiene 280 IES (64 universidades y 216 institutos). La cuenta bancaria conserva el nombre escrito para entidades no incluidas.

Orden de importación: los tipos sin padre primero; país antes de provincia y universidad; provincia antes de cantón; cantón antes de parroquia; nivel antes de grado; amplio antes de específico antes de detallado. El cargador común sigue el orden del enum, que ya cumple esas dependencias. Importa `InstitutosSuperiores.csv` como Universidad después de `Universidad.csv`; ambos dependen de País. Los órdenes de los dos archivos pueden coincidir y las consultas desempatan por código. Dentro de cada CSV, el número de fila de datos fija `orden`; los empates en consulta se resuelven por código.

## Usar la API

- `GET /api/catalogos/{tipo}?padreId=`: cookie autenticada de cualquier rol; solo activos, por orden. El tipo puede indicarse con su nombre, por ejemplo `Provincia`, `Canton` o `GradoAcademico`.
- `POST /api/catalogos/{tipo}/importar`: cookie de **superadmin**, formulario multipart con campo `archivo`. CSV UTF-8, BOM opcional, separador coma, cabecera exacta `codigo,nombre,codigo_padre,codigo_externo`. Se admiten campos entrecomillados con comas y comillas dobles escapadas. Máximo 1 MiB y 10.000 filas por archivo. No se envían contraseñas ni cookies en ejemplos versionados.
- `codigo` y `codigo_padre`: se recortan y se normalizan a mayúsculas; código/external hasta 50 caracteres y nombre hasta 300. El padre se busca por su código dentro del tipo permitido por `ElementoCatalogo.TipoPadre`.
- Reimportar actualiza nombre, padre, código externo y orden sin cambiar ids. Las filas ausentes permanecen; los inactivos no se reactivan implícitamente. Un error invalida todo el archivo, sin guardar filas parciales. Las semillas inferiores a 1000 se pueden reconocer sin cambios, pero no modificar por este endpoint.
- Las importaciones PostgreSQL bloquean la tabla dentro de la transacción para evitar duplicados y colisiones de ids entre procesos. Las consultas normales siguen disponibles.

## Desarrollo con Docker

`docker-compose.yml` habilita `Catalogos__CargarAlInicio=true` solo en Development y monta esta carpeta de solo lectura en `/catalogos`. Tras las migraciones se cargan los 17 CSV con el mismo servicio de importación. Al reiniciar no se duplica. Si falta un archivo requerido o es inválido, el arranque falla con un mensaje; no se declara saludable una carga incompleta.

En producción se ejecuta `--migrar` y luego `--cargar-catalogos` antes de levantar los servicios. La distribución y la imagen contienen `catalogos/` con los 17 CSV y `fuentes.json`. El comando comprueba todos los hashes SHA-256 antes de escribir y usa el mismo importador; no descarga fuentes en ejecución. Sin `Catalogos:Directorio` se usa esa carpeta junto al ejecutable. Un fallo detiene el despliegue; repetir recupera el lote, con transacciones por CSV. El arranque Production verifica catálogos activos y relaciones de Ecuador, geografía, IES, grados y UNESCO; falla antes de servir tráfico si están incompletos. La generación OpenAPI en compilación no consulta la base (patrón oficial GetDocument.Insider).

Construcción desde la raíz: `docker build -f src/Backend/Dockerfile -t actualizacion-datos-backend:prueba .`. El `.dockerignore` raíz limita el contexto a backend y catálogos y excluye configuración local y salidas. El compose de desarrollo y los workflows usan este mismo contexto. No se cambia el contexto de frontend.

## Trazabilidad y actualización

[fuentes.json](fuentes.json) registra fecha de consulta, URLs, SHA-256 de los recursos descargados y SHA-256/recuento de cada CSV normalizado. Los documentos completos de las fuentes quedan fuera del repositorio: solo se versionan sus tablas públicas normalizadas, sin ejemplos, firmas ni metadatos personales de los documentos originales.

Para actualizar una fuente: descargar desde su URL oficial, extraer solo la tabla indicada arriba, conservar códigos y ceros iniciales, comparar cobertura y cambios, escribir UTF-8 con la misma cabecera y actualizar el manifiesto/fecha. No asignar equivalencias institucionales por similitud de nombres. La extracción de esta versión usó XML estándar de XLSX para DPA, tablas HTML para ONU/CES y tablas del PDF para los diccionarios y CINE; se verificaron unicidad, relaciones y recuentos antes de importar sobre PostgreSQL. No se añadieron dependencias de extracción a la aplicación.


## Ampliación de fuentes: bancos e institutos (2026-10-26)

- `Banco.csv`: **28 entidades**, los tres grupos del [catastro público de la Superintendencia de Bancos](https://www.superbancos.gob.ec/bancos/catastro-publico/): 23 nacionales privadas, 1 extranjera privada y 4 públicas. Se extraen solo las tres tablas de denominaciones. Se normalizan espacios y se ordena por denominación. Los códigos `SB_...` son claves técnicas propias derivadas de la denominación (ASCII, mayúsculas, guiones bajos, máximo 50 caracteres), no códigos oficiales, RUC ni equivalencias con talento humano. Al actualizar se deben conservar esas claves aunque cambie una denominación. `codigo_externo` queda vacío porque esta tabla no publica un código oficial. No incluye cooperativas SEPS; sigue disponible otro banco por nombre.
- `InstitutosSuperiores.csv`: **216 IES**, unión por código oficial de los listados CES de [públicos](https://www.ces.gob.ec/?page_id=1543) (62) y [particulares](https://www.ces.gob.ec/?page_id=5058) (154). Se extraen código de cuatro dígitos y denominación, se normalizan espacios y se ordena por código. Padre Ecuador `218`; código externo igual al oficial. No hay colisiones entre estas 216 claves ni con las 64 universidades. Los listados incluyen institutos y conservatorios; la instantánea no certifica vigencia de programas o títulos. No se importa información de personas de las páginas.

`fuentes.json` conserva los hashes anteriores y añade fecha y SHA-256 de cada recurso consultado, y de los dos CSV nuevos. Los recursos completos se mantienen fuera del repositorio. La carga de las IES extranjeras sigue siendo «Otra institución»; no se crea una lista de universidades frecuentes ni un enum nuevo.
