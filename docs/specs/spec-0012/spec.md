# Documento de hoja de vida desde plantillas globales — Spec

**ID:** spec-0012  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Joseph Baño (también solicitante)  
**Responsable de implementación:** Alexander Martínez (`AlexanderMartinez0410`)  
**Fecha:** 2026-10-27  
**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

Cada institución entrega al personal un formato de hoja de vida con su propia presentación. El formato de referencia de esta spec (un documento de cinco páginas entregado por la institución) tiene portada con foto de la institución, datos personales con foto de la persona, perfil, compromiso con firma, formación académica, experiencia laboral, cursos y talleres, referencias personales y familiares, y una portada de anexos.

Hoy el sistema solo produce una hoja de vida HTML sin diseño dentro del `.zip` de exportación (`GeneradorCvHtml`). La institución no puede obtener el documento con su formato; hay que armarlo a mano a partir de los datos. Además, el formato de referencia trae **texto fijo** (el perfil y el compromiso), y el perfil ya se genera automáticamente (ADR-0025).

Resultado esperado:
- El sistema genera, para cada persona, un documento con el formato de una **plantilla**.
- Las plantillas son **globales**: una biblioteca compartida por todas las instituciones, de la que cada institución elige la que necesite.
- La **marca** (portada, logo, colores, lema) es de cada institución, no de la plantilla, de modo que la misma plantilla sirve a varias instituciones con su identidad.
- Ningún dato personal ni texto de una persona queda escrito en la plantilla.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Petición | Conversación de trabajo del issue #92, 2026-10-27 | Generar un documento con el formato de la plantilla; plantillas globales y usables entre instituciones. |
| Formato de referencia | Archivo local entregado por la institución («H.V P.D. …», 5 páginas; **no se copia al repositorio**, ver PD-PLA-12) | Estructura, campos y presentación que debe poder reproducir una plantilla. |
| Spec | `docs/specs/spec-0003/spec.md`, RF-HDV-001 a 027 | Modelo de datos de la hoja de vida: ficha, formación, capacitaciones, experiencia, referencias, documentos. |
| Spec | `docs/specs/spec-0003/spec.md`, RF-HDV-016 | La exportación incluye cada sección de la hoja de vida aprobada y sus respaldos. |
| Spec | `docs/specs/spec-0003/spec.md`, RF-HDV-028 (propuesto, v0.5 **sin aprobar**) | Jefe inmediato y su teléfono en la experiencia: no existen hoy. |
| Spec | `docs/specs/spec-0007/spec.md`, RF-VAL-008 | Perfil generado determinista; CV HTML en el `.zip`. |
| Spec | `docs/specs/spec-0010/spec.md` (v0.2) | Secciones abiertas por institución; lo ya cargado de una sección cerrada se sigue exportando (PD-SEC-04). |
| Spec | `docs/specs/spec-0008/spec.md` (v0.2) | Capacitaciones obligatorias: las vinculadas se muestran como capacitaciones. |
| ADR | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Aislamiento por institución. |
| ADR | ADR-0006, Vigente, `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Reglas de archivos (foto, logo, imagen de portada). |
| ADR | ADR-0025, Vigente, `docs/decisiones/ADR-0025-perfil-profesional-generado.md` | El perfil se genera sin persistirse y sin PDF ni IA. Esta spec agrega el PDF y requiere ADR (PD-PLA-01). |
| ADR | ADR-0013, Vigente, `docs/decisiones/ADR-0013-datos-bancarios.md` | La cuenta bancaria no se expone en claro. |
| ADR abierto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | No se cierra con este cambio. |
| Código | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/GeneradorCvHtml.cs`, `ServicioExportacion.cs` | Generador HTML actual y su integración en el `.zip`. |
| Código | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Institucion.cs` | La institución solo tiene nombre, estado y dominios de correo; **no hay marca** (logo, portada, colores). |

**Confirmado en el código:** las filas «Código». **Inferido, por confirmar en el plan:** que cada campo del mapa de la sección «Datos» exista tal como se describe; no hay ninguna librería de PDF en las dependencias de `src/Backend`.

**ADR:** no existe ninguno sobre plantillas ni sobre generación de PDF (búsqueda en `docs/decisiones/`). Hacen falta al menos dos (PD-PLA-01 y PD-PLA-09).

## Alcance

**Incluye:**
- Una biblioteca global de plantillas administrada por el `superadmin`, con versiones publicadas.
- La marca de cada institución (logo, imagen de portada, colores, lema), administrada por su `admin`.
- Elegir la plantilla de la institución.
- Generar el documento de una persona, en PDF, con datos reales de la persona y la marca de su institución.
- Vista previa para la persona, para el `supervisor` en revisión y para el `admin`.
- Incluir el documento en la exportación `.zip` de las personas aprobadas.
- Una plantilla inicial que reproduzca el formato de referencia.

**Excluye:**
- Un editor visual de plantillas dentro del sistema (las plantillas se cargan ya hechas).
- Entregar el documento editable en Word (PD-PLA-03), salvo decisión contraria.
- Pegar los certificados dentro del mismo documento (PD-PLA-07).
- Cambiar qué datos se piden a la persona, sus reglas de validación o las secciones de la hoja de vida.
- Firma electrónica del documento o del compromiso.
- Cuenta bancaria, tipo de sangre y demás datos fuera del catálogo de campos permitidos (RF-PLA-005).
- Traducciones o más de un idioma.

**Límites del proceso:** empieza cuando existe una plantilla publicada y termina cuando el documento se descarga o se incluye en la exportación. No hay sistema externo.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-PLA-001 | Dado un `superadmin`, cuando crea una plantilla global con nombre, descripción y diseño, el sistema la guarda en estado borrador, visible solo para él. | Sin priorizar | Petición |
| RF-PLA-002 | Dado un `superadmin`, cuando publica una plantilla, el sistema crea una versión **inmutable** y la deja disponible a todas las instituciones; un cambio posterior crea una versión nueva y no altera la anterior. | Sin priorizar | Petición |
| RF-PLA-003 | Dado un `admin`, cuando abre la configuración de plantillas, ve las plantillas publicadas y puede elegir cuál usa su institución; la elección vale solo para su institución. | Sin priorizar | Petición |
| RF-PLA-004 | Dado un `admin`, cuando configura la marca de su institución (nombre visible, logo, imagen de portada, color principal, color secundario y lema), el sistema la guarda solo para su institución y valida los archivos según ADR-0006. | Sin priorizar | Formato de referencia |
| RF-PLA-005 | Dada una plantilla, cuando se crea o publica, el sistema solo admite campos de un **catálogo cerrado** (ver «Datos»); rechaza cualquier campo fuera del catálogo y nunca ofrece la cuenta bancaria, el tipo de sangre, la etnia, la discapacidad ni los datos de acceso. | Sin priorizar | ADR-0013, minimización de datos |
| RF-PLA-006 | Dada una persona con hoja de vida aprobada, cuando un `admin` o `supervisor` de su institución genera su documento, el sistema produce un PDF con la plantilla elegida y la marca de la institución, y lo descarga. | Sin priorizar | Petición |
| RF-PLA-007 | Dada una persona, cuando se genera su documento, el sistema escribe el perfil con la regla de ADR-0025 y no incluye ningún texto de perfil guardado ni escrito por la persona. | Sin priorizar | ADR-0025 |
| RF-PLA-008 | Dada una persona sin foto, cuando se genera su documento, el sistema coloca un marcador neutro en el lugar de la foto y no falla. | Sin priorizar | Formato de referencia |
| RF-PLA-009 | Dada una sección con varios ítems (formación, experiencia, cursos, referencias), cuando se genera el documento, el sistema incluye **todos** los ítems de la persona, en un orden definido por la plantilla, y reparte las páginas necesarias sin partir un ítem entre dos páginas. | Sin priorizar | Formato de referencia |
| RF-PLA-010 | Dada una sección sin datos, cuando se genera el documento, el sistema omite esa sección (comportamiento por defecto de la plantilla) y no deja títulos vacíos ni etiquetas sin valor. | Sin priorizar | Propuesta (PD-PLA-11) |
| RF-PLA-011 | Dada una plantilla con un bloque de compromiso, cuando se genera el documento, el sistema escribe el texto configurado por la institución con el nombre y el documento de la persona, y deja el espacio de firma en blanco. | Sin priorizar | Formato de referencia; PD-PLA-04 |
| RF-PLA-012 | Dada una persona con su hoja de vida en borrador o enviada, cuando pide la vista previa de su propio documento, el sistema lo genera marcado como «Vista previa, no oficial» en cada página; con la hoja aprobada, sin esa marca. | Sin priorizar | Propuesta (PD-PLA-10) |
| RF-PLA-013 | Dado un `admin` que exporta, cuando la persona está aprobada, el `.zip` incluye su documento PDF junto con sus respaldos, además de lo que ya incluye (RF-HDV-016). | Sin priorizar | RF-HDV-016 |
| RF-PLA-014 | Dado cualquier rol, cuando genera o consulta documentos, plantillas elegidas o marca, el sistema opera solo sobre su institución aunque conozca identificadores de otra. | Sin priorizar | ADR-0004; RF-HDV-015 |
| RF-PLA-015 | Dado un `usuario`, `supervisor` o `admin` sin permiso, cuando intenta crear, publicar o editar una plantilla global, el sistema lo rechaza; solo el `superadmin` las administra. Solo el `admin` de la institución cambia su plantilla elegida y su marca. | Sin priorizar | Roles de spec-0001; PD-PLA-05 |
| RF-PLA-016 | Dada una persona, cuando un `admin` o `supervisor` genera su documento (distinto de la vista previa propia), o cuando se exporta, o cuando se cambia una plantilla, la elección o la marca, el sistema lo registra en la auditoría con quién, cuándo y qué, sin contenido de datos personales. | Sin priorizar | RF-DAT-004, 005 |
| RF-PLA-017 | Dado un dato de la persona o de la marca con caracteres especiales o con apariencia de código (por ejemplo `<script>` o llaves), cuando se genera el documento, el sistema lo muestra como texto literal y no lo interpreta; la plantilla no admite scripts ni recursos externos. | Sin priorizar | Seguridad |
| RF-PLA-018 | Dada una institución sin plantilla elegida, cuando se genera un documento, el sistema usa la plantilla marcada como predeterminada y una marca neutra, e indica al `admin` que no ha configurado la suya. | Sin priorizar | Propuesta (PD-PLA-13) |
| RF-PLA-019 | Dada una institución que ya eligió una versión de una plantilla, cuando el `superadmin` publica una versión nueva, el sistema **no** cambia el documento de esa institución hasta que su `admin` acepta la versión nueva. | Sin priorizar | Propuesta (PD-PLA-14) |

## Escenarios del proceso

### Escenario 1 — El superadmin publica la plantilla inicial

- **Actor y precondición:** `superadmin`; ninguna plantilla publicada.
- **Disparador:** carga la plantilla que reproduce el formato de referencia y la publica.
- **Secuencia:** el sistema valida que solo use campos del catálogo (RF-PLA-005), la guarda como borrador (RF-PLA-001), la publica como versión 1 (RF-PLA-002) y la marca como predeterminada.
- **Resultado:** plantilla disponible para todas las instituciones.
- **Variantes y errores:** una plantilla con un campo fuera del catálogo se rechaza con mensaje; un `admin` que intente publicar se rechaza (RF-PLA-015).

### Escenario 2 — El admin elige la plantilla y configura su marca

- **Actor y precondición:** `admin` de la institución A.
- **Disparador:** abre la configuración de plantillas.
- **Secuencia:** elige la plantilla publicada (RF-PLA-003); sube logo e imagen de portada y fija colores y lema (RF-PLA-004).
- **Resultado:** el documento de A usa esa plantilla y esa marca; la institución B no cambia.
- **Variantes y errores:** un archivo que no cumple ADR-0006 se rechaza; sin elegir plantilla se usa la predeterminada (RF-PLA-018).

### Escenario 3 — Generar el documento de una persona

- **Actor y precondición:** `supervisor` o `admin` de A; persona aprobada con foto, formación, dos experiencias, tres cursos y cuatro referencias (datos ficticios).
- **Disparador:** pide el documento.
- **Secuencia:** el sistema arma el PDF con la plantilla y la marca de A (RF-PLA-006); el perfil es el generado (RF-PLA-007); las listas se reparten en páginas sin partir ítems (RF-PLA-009); la auditoría lo registra (RF-PLA-016).
- **Resultado:** PDF descargado.
- **Variantes y errores:** persona sin foto (RF-PLA-008); sección sin datos omitida (RF-PLA-010); un nombre con `<script>` se ve como texto (RF-PLA-017); persona de otra institución se rechaza (RF-PLA-014).

### Escenario 4 — Vista previa de la persona

- **Actor y precondición:** `usuario` con hoja en borrador.
- **Disparador:** pide ver su documento.
- **Secuencia:** el sistema lo genera con la marca de agua «Vista previa, no oficial» (RF-PLA-012).
- **Resultado:** ve cómo quedaría; no queda en la auditoría de terceros ni se exporta.
- **Variantes y errores:** con la hoja aprobada la marca no aparece.

### Escenario 5 — Exportación masiva

- **Actor y precondición:** `admin`; varias personas aprobadas.
- **Disparador:** exporta el `.zip`.
- **Secuencia:** el sistema incluye el PDF de cada persona aprobada junto a sus respaldos (RF-PLA-013) y registra la exportación (RF-PLA-016).
- **Resultado:** `.zip` con documento y respaldos por persona.
- **Variantes y errores:** una persona no aprobada no entra; si falla la generación de un documento, el sistema lo informa por persona sin perder las demás.

### Escenario 6 — Una versión nueva de la plantilla

- **Actor y precondición:** `superadmin`; la institución A usa la versión 1.
- **Disparador:** publica la versión 2.
- **Secuencia:** A sigue generando con la versión 1 hasta que su `admin` acepta la versión 2 (RF-PLA-019).
- **Resultado:** ninguna institución cambia sin saberlo.

## Datos, seguridad e integraciones

**Mapa de la plantilla de referencia al modelo de datos.** Sirve para el plan. «Existe» significa que el campo está en el modelo actual; el plan lo verifica uno por uno.

| Sección del formato | Campo del documento | Origen | Estado |
|---|---|---|---|
| Portada | Nombre completo | Ficha: primer y segundo nombre y apellido | Existe |
| Portada | Tipo de personal (por ejemplo «Docentes») | Tipo de funcionario de la persona | Existe |
| Portada | Foto, lema, colores | Marca de la institución | Nuevo (RF-PLA-004) |
| Datos personales | Foto de la persona | Ficha: foto | Existe |
| Datos personales | Documento de identidad | Persona: documento | Existe |
| Datos personales | Lugar y fecha de nacimiento | Ficha: parroquia de nacimiento y fecha | Existe |
| Datos personales | Estado civil | Ficha: estado civil | Existe |
| Datos personales | Ciudad y dirección | Ficha: parroquia de residencia, calles y número | Existe |
| Datos personales | Teléfono y email | Ficha: celular, convencional y correo institucional | Existe |
| Datos personales | Fecha y número de registro | Título obtenido: registro SENESCYT | Existe; **falta definir de qué título** (PD-PLA-08) |
| Perfil | Texto del perfil | Regla de ADR-0025 | Existe |
| Compromiso | Texto, nombre, documento, firma en blanco | Texto configurable por institución | Nuevo (RF-PLA-011) |
| Formación | Primaria, secundaria y superior | Títulos por nivel del grado académico | Existe; primaria y secundaria dependen de los catálogos (PD-HDV-03) |
| Experiencia | Empresa, cargo, funciones, fechas | Experiencia laboral | Existe |
| Experiencia | Jefe inmediato y teléfono | RF-HDV-028 (propuesto, sin aprobar) | **No existe**: se deja fuera hasta que se apruebe (PD-PLA-15) |
| Cursos y talleres | Curso, dictado por, duración, lugar, fecha | Capacitación: evento, organizadora, horas, lugar, fechas | Existe |
| Referencias | Nombres, título, cargo, empresa, teléfono (personales y familiares) | Referencias | Existe |
| Pie | Nombre, documento y fecha | Persona y fecha de generación | Existe |
| Anexos | Portada de anexos | Plantilla | Nuevo |

**Catálogo cerrado de campos (RF-PLA-005).** Solo los de la tabla anterior. Cualquier campo adicional requiere ampliar el catálogo con decisión funcional. Nunca: cuenta bancaria, tipo de sangre, etnia, discapacidad, correo personal distinto del institucional, datos de acceso ni auditoría.

**Seguridad y privacidad.**
- El documento contiene datos personales: solo lo ve quien ya puede ver esa hoja de vida (RF-HDV-015) y su descarga queda auditada (RF-PLA-016).
- La plantilla es contenido administrado por el `superadmin`, pero se trata como no confiable: no admite scripts, enlaces ni recursos externos (RF-PLA-017).
- Los archivos de marca siguen ADR-0006.
- **Material de ejemplo:** el formato de referencia incluye fotografías reales de la institución donde aparecen menores. Esas imágenes **no** van al repositorio, a las pruebas ni a capturas. Las pruebas usan imágenes neutras y datos ficticios (documento `0000000000`, correo `usuario@ejemplo.test`).

**Integraciones:** ninguna externa. No se define endpoint; los contratos van en el plan, con `openapi/v1.json` y el cliente regenerados en el mismo cambio.

## Criterios de aceptación

- [ ] El `superadmin` crea, publica y versiona plantillas, y nadie más puede (RF-PLA-001, 002, 015; escenario 1).
- [ ] Una plantilla con un campo fuera del catálogo se rechaza (RF-PLA-005).
- [ ] El `admin` elige plantilla y configura su marca solo para su institución (RF-PLA-003, 004, 014; escenario 2).
- [ ] El PDF de una persona sale con la plantilla y la marca de su institución, con el perfil generado y sin texto fijo (RF-PLA-006, 007; escenario 3).
- [ ] Persona sin foto, sección vacía y listas largas no rompen el documento ni parten un ítem entre páginas (RF-PLA-008, 009, 010).
- [ ] Datos con apariencia de código se ven literales y nada externo se carga (RF-PLA-017).
- [ ] La vista previa lleva la marca «no oficial» mientras la hoja no esté aprobada (RF-PLA-012; escenario 4).
- [ ] El `.zip` incluye el PDF de cada persona aprobada y de ninguna otra (RF-PLA-013; escenario 5).
- [ ] Una versión nueva no cambia el documento de una institución hasta que su `admin` la acepta (RF-PLA-019; escenario 6).
- [ ] La auditoría registra generación, exportación y cambios sin datos personales (RF-PLA-016).
- [ ] Dos instituciones con la misma plantilla producen documentos con marcas distintas y sin cruce de datos (RF-PLA-014).
- [ ] Pruebas nuevas en xUnit y Vitest; `openapi/v1.json` y cliente regenerados; CI en verde; sin datos personales ni imágenes reales; prueba de punta a punta con un PDF generado y revisado a mano.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-PLA-01 | **Formato de las plantillas.** Opciones: un `.docx` con marcadores, una plantilla web (HTML y estilos) convertida a PDF, o código fijo por plantilla. El diseño del formato de referencia usa imágenes y cuadros flotantes, que se rompen al rellenar un `.docx`. **Propuesta del desarrollador:** plantilla web convertida a PDF; el código fijo no sirve para plantillas globales. | Diseño completo. | ADR nuevo; lo cierra quien desarrolla |
| PD-PLA-02 | **Marca por institución.** La portada y los colores del formato son de una sola institución. **Propuesta:** la plantilla define el esquema; cada institución sube su logo, portada, colores y lema (RF-PLA-004). | RF-PLA-004 | Revisor funcional |
| PD-PLA-03 | **¿Se necesita el documento editable en Word** o basta el PDF? **Propuesta:** solo PDF. | Si hay que dar Word, el formato de plantilla cambia. | Revisor funcional |
| PD-PLA-04 | **Compromiso de terminar el año lectivo.** En el formato es texto fijo con firma. Spec-0003 (PD-HDV-19) lo trata como un documento firmado que la persona sube. **Propuesta:** un bloque de texto que la institución edita, con nombre y documento, y firma en blanco para firmar en papel; el documento firmado y escaneado sigue siendo un tipo de documento aparte. | RF-PLA-011 | Revisor funcional |
| PD-PLA-05 | **Quién administra las plantillas globales.** **Propuesta:** solo el `superadmin`; el `admin` elige y configura la marca. | RF-PLA-015 | Revisor funcional |
| PD-PLA-06 | **Una plantilla por institución o por tipo de funcionario** (por ejemplo, una para docentes y otra para administrativos). **Propuesta:** una por institución en la v0.1; por tipo de funcionario queda para después. | RF-PLA-003 | Revisor funcional |
| PD-PLA-07 | **Anexos.** El formato separa los certificados con una portada «Anexos generales». **Propuesta:** el documento lleva la portada de anexos y los certificados siguen en el `.zip`, ordenados por sección; unirlos en un solo PDF queda para otra fase. | RF-PLA-013 | Revisor funcional |
| PD-PLA-08 | **Fecha y número de registro** del formato: la persona puede tener varios títulos. **Propuesta:** el del título de mayor nivel, con la fecha de su registro. | Mapa de datos | Revisor funcional |
| PD-PLA-09 | **Generación de PDF.** El backend no tiene ninguna librería de PDF y ADR-0025 decidió no incorporar PDF. Elegir una dependencia es una decisión de arquitectura y de seguridad (versión fija, licencia, sin servicios externos). | Plan y tareas | ADR nuevo, a redactar antes de las tareas |
| PD-PLA-10 | **Vista previa de la persona.** **Propuesta:** siempre disponible, con marca de agua mientras no esté aprobada, y sin dejar copia guardada. | RF-PLA-012 | Revisor funcional |
| PD-PLA-11 | **Sección sin datos.** **Propuesta:** se omite por completo; la plantilla puede indicar lo contrario. | RF-PLA-010 | Revisor funcional |
| PD-PLA-12 | **Dónde viven los recursos de la plantilla inicial.** Las imágenes del formato de referencia incluyen menores y marca de una institución. **Propuesta:** no se guardan en el repositorio; la plantilla inicial usa imágenes neutras y la institución sube las suyas. | Pruebas y repositorio | Revisor funcional |
| PD-PLA-13 | **Institución sin plantilla elegida.** **Propuesta:** se usa la predeterminada con marca neutra. Alternativa: bloquear hasta que el `admin` elija. | RF-PLA-018 | Revisor funcional |
| PD-PLA-14 | **Versiones.** **Propuesta:** la institución mantiene su versión hasta aceptar la nueva (RF-PLA-019). Alternativa: siempre la última. | RF-PLA-019 | Revisor funcional |
| PD-PLA-15 | **Jefe inmediato y teléfono** de la experiencia no existen y dependen de RF-HDV-028, aún sin aprobar. **Propuesta:** quedan fuera del documento hasta que se aprueben y se implementen. | Mapa de datos | Revisor funcional |
| PD-PLA-16 | **Rendimiento y tamaño.** Falta una métrica: tiempo máximo para generar un documento y para una exportación de toda la institución (hoy unas 100 personas), y tamaño máximo del PDF. Sin esa métrica no puede probarse. | Plan, pruebas y la forma de exportar (sincrónica o en segundo plano) | Revisor funcional |
| PD-PLA-17 | **HTML actual del `.zip`.** **Propuesta:** se conserva hasta que el PDF esté verificado y luego se retira por separado. | RF-PLA-013 | Revisor funcional |
| PD-PLA-18 | **Orden respecto a otras specs.** **Propuesta:** después de spec-0010 y spec-0008. El generador respeta lo cargado aunque una sección esté cerrada (PD-SEC-04). | Planificación | Quien desarrolla |

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** Pendiente  
**Aprobó:** Pendiente  
**Fecha y evidencia de aprobación:** Pendiente  
**Ajustes solicitados:** Pendiente

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
