# Hoja de vida del personal — Spec

**ID:** spec-0003  
**Versión:** 0.5 (propuesta)  
**Estado:** En revisión (v0.5). Rige la v0.4, aprobada el 2026-10-22  
**Revisor funcional:** @JosephBano  
**Fecha:** 2026-10-22  
**Áreas afectadas:** `src/Backend` (esta versión); `src/Frontend` en una versión posterior

## Problema y resultado esperado

spec-0001 resolvió el acceso, las campañas y el flujo de revisión, pero la información que la persona actualiza es un texto libre (`personas.datos_personales_json`). La institución necesita la **hoja de vida** de su personal con la misma estructura que ya usa su sistema de talento humano: datos personales, instrucción formal (títulos obtenidos y en curso), capacitación, experiencia laboral y documentos personales con sus respaldos.

Resultado esperado: durante una campaña abierta, la persona completa cada sección de su hoja de vida con valores de catálogo y archivos de respaldo; el supervisor revisa y marca observaciones sobre ítems concretos; el admin define qué documentos se piden a cada tipo de funcionario y exporta la hoja de vida aprobada por secciones.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Spec previa | `docs/specs/spec-0001/spec.md` (Borrador) | Roles, campañas, estados borrador → enviado → aprobado o devuelto, RF-FLU-005 (solo la última versión aprobada) |
| Spec previa | `docs/specs/spec-0002/spec.md` (Aprobado, issue #11) | Pantallas del usuario: formulario de datos y documentos actual, que las secciones de la hoja de vida reemplazan (#33) |
| Sistema de talento humano de la institución (estructura, no datos) | Repositorio local `gestion_recursos_humanos_istpet`: `src/Backend/RRHH.Domain/Entities/{Profesores,TitulosProfesores,TitulosEnCurso,CursosProfesores,CertificadosExperienciaLaboral,DocTipoDocumento,DocRequisitoFuncionario,DocFuncionarioDocumento}.cs`, `docs/sql/mysql_migration_documentos_funcionario.sql`, `docs/sql/mysql_migration_plantillas_hdv_config.sql` | Campos de cada sección; catálogos; 4 plantillas de hoja de vida (secciones: datos personales, instrucción formal, instrucción profesional, experiencia, capacitación, anexos); documentos habilitantes por tipo de funcionario |
| ADR vigente | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Todo registro de la hoja de vida lleva `institucion_id` |
| ADR vigente | ADR-0006, Vigente, `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Respaldos en PDF, JPG o PNG, máx. 10 MB, descarga solo por el backend |
| ADR vigente | ADR-0008, Vigente, `docs/decisiones/ADR-0008-granularidad-del-rechazo.md` | Marcas opcionales por campo o archivo |
| ADR vigente | ADR-0010, Vigente, `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Secciones fijas, catálogo compartido, tipos de documento y de funcionario por institución, edición en el lugar |
| Formato institucional | Formato de hoja de vida de docentes (plantilla compartida por el equipo, sin datos) | Secciones: datos personales, formación académica (primaria, secundaria, superior), experiencia laboral, cursos y talleres, referencias personales y familiares, perfil, foto, declaración firmada y anexos. Obligatorios: datos personales, formación académica y dos referencias personales |
| Archivo de carga | Columnas de la nómina que entrega la institución (sin datos) | `Nombre` (apellidos y nombres), `DNI`, `Cargo de Trabajo`, `Nacimiento`, `Edad`, `Estado Civil`, `Estudios`, `Nacionalidad`, `Dirección`, `Ciudad`, `Sangre`, `Fec. Ingreso`, `Teléfono 2` y tres columnas bancarias; con valores vacíos |
| Formato institucional, archivo real (v0.5) | Hoja de vida de docentes en Word, revisada el 2026-10-22 (estructura, sin datos) | La «declaración firmada» es un **compromiso de terminar el año lectivo** con firma y cédula, no la declaración juramentada notariada. La experiencia laboral pide **jefe inmediato y teléfono**, y ordena desde el último empleo. Cursos: curso, dictado por, duración, lugar y fecha |
| Nómina real (v0.5) | Archivo de personal de la institución, revisado el 2026-10-22 (solo encabezados, conteos y valores de catálogo; ningún dato personal copiado) | 109 filas y 13 columnas más un «N°»; título en la fila 1 y encabezados en la fila 2; **sin columnas bancarias**; 80 docentes y 29 de otros cargos; texto literal `NULL`; sangre con espacio (`O +`); «Union Libre»; nacionalidades con errores de tipeo; un teléfono de 9 dígitos; `Fec. Ingreso` completa en todas |
| ADR vigente | ADR-0012, Vigente (cerrado 2026-10-22), `docs/decisiones/ADR-0012-carga-de-nomina-nulos-y-nombres.md` | Tratamiento de valores nulos de la nómina, división de nombres y columnas que no se importan |
| ADR vigente | ADR-0013, Vigente (cerrado 2026-10-22), `docs/decisiones/ADR-0013-datos-bancarios.md` | Tratamiento de la cuenta bancaria: finalidad, cifrado, quién la ve y comparación con la nómina |
| ADR propuesto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | Campos configurables: abierto. Sus restricciones se cumplen |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/` y migración `AgregarHojaDeVida` | Entidades y tablas ya creadas (ver «Estado de implementación») |

Lo tomado del sistema de talento humano es **estructura**. No se copian registros reales ni se integra en línea con él en esta versión.

## Alcance

**Incluye:** ficha personal con perfil y foto; títulos obtenidos y estudios por nivel; títulos en curso; capacitaciones; experiencia laboral; referencias personales y familiares; documentos personales (incluida la declaración firmada); archivo de respaldo por ítem; catálogos compartidos; tipos de documento, tipos de funcionario y requisitos por institución; validación de completitud al enviar; marcas de observación por ítem; cuenta bancaria para comprobar los pagos (ADR-0013); secciones en la exportación; carga de nómina con valores nulos y división de nombres (ADR-0012).  
**Excluye:** titulación y examen complexivo (`titul_*`) y contratos (`contratos_asignaturas`), porque son planificación académica y no datos de la persona (ADR-0010, decisión 13); generación de la hoja de vida en Word o PDF con plantillas; alertas de vencimiento de documentos; cargas familiares (las referencias familiares son contactos, no dependientes); sincronización automática con el sistema de talento humano.  
**Primera versión:** un solo tipo de funcionario, «Docente». El modelo admite más tipos; se agregan cuando haga falta.  
**Límites del proceso:** empieza cuando el admin configura tipos de documento y requisitos y carga a las personas con su tipo de funcionario; termina cuando la hoja de vida aprobada está disponible para la exportación de spec-0001.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-HDV-001 | Dado un `usuario` con campaña abierta y actualización en borrador o devuelta, cuando guarda su ficha personal, el sistema guarda cada campo y solo acepta, en los campos de catálogo, elementos activos del tipo correspondiente. | Sin priorizar | ADR-0010 dec. 2 y 5 |
| RF-HDV-002 | Dado el mismo `usuario`, cuando agrega, modifica o elimina un título obtenido, un título en curso, una capacitación o una experiencia laboral, el sistema lo guarda como un ítem con identificador propio. | Sin priorizar | ADR-0010 dec. 1 |
| RF-HDV-003 | Dado un título sin universidad del catálogo ni nombre de otra institución, cuando se guarda, el sistema lo rechaza con un mensaje. | Sin priorizar | `TitulosProfesores` del origen |
| RF-HDV-004 | Dada una experiencia laboral, cuando se marca «trabaja actualmente», el sistema no admite fecha de fin; si no se marca, la exige y no admite que sea anterior al inicio. | Sin priorizar | `CertificadosExperienciaLaboral` del origen |
| RF-HDV-005 | Dado un título en curso sin beca, cuando se guarda, el sistema no conserva tipo, financiamiento, porcentaje ni monto de beca. | Sin priorizar | `TitulosEnCurso` del origen |
| RF-HDV-006 | Dado un ítem de cualquier sección, cuando el `usuario` adjunta un respaldo, el sistema lo asocia a ese ítem y aplica las reglas de ADR-0006. | Sin priorizar | ADR-0006, ADR-0010 dec. 10 |
| RF-HDV-007 | Dada una persona con tipo de funcionario, cuando abre sus documentos personales, el sistema lista los tipos de documento que le aplican (los de su tipo y los de «todos»), indicando cuáles son obligatorios. | Sin priorizar | `DocRequisitoFuncionario` del origen |
| RF-HDV-008 | Dada una persona, cuando registra un documento personal de un tipo que ya tiene, el sistema reemplaza el anterior; no guarda dos del mismo tipo. | Sin priorizar | ADR-0010 dec. 9, RF-FLU-005 |
| RF-HDV-009 | Dado un `usuario` que envía a revisión, cuando falta algún dato obligatorio, el sistema impide el envío y dice qué falta. Son obligatorios: los datos personales de la ficha (PD-HDV-01), la formación académica (RF-HDV-019), dos referencias personales (RF-HDV-018), la cuenta bancaria (RF-HDV-025, PD-HDV-17), el respaldo de cada ítem registrado (RF-HDV-024) y los documentos personales marcados como obligatorios en los requisitos (RF-HDV-007). Ninguna otra sección es obligatoria. | Sin priorizar | Formato institucional; requisitos del origen; ADR-0009 (validación en un solo lugar) |
| RF-HDV-010 | Dada una actualización enviada o aprobada, cuando el `usuario` intenta modificar cualquier sección, el sistema lo rechaza, también por la API. | Sin priorizar | RF-FLU-001, ADR-0010 dec. 11 |
| RF-HDV-011 | Dado un `supervisor`, cuando devuelve una actualización, puede marcar un ítem concreto (por ejemplo, un título) con una clave estable, y el `usuario` ve la marca sobre ese ítem. | Sin priorizar | ADR-0008, ADR-0009 |
| RF-HDV-012 | Dado un `admin`, cuando crea o edita tipos de documento, tipos de funcionario y requisitos, el sistema los guarda solo para su institución; un código no se repite dentro de la misma institución. | Sin priorizar | ADR-0009, ADR-0010 dec. 6 |
| RF-HDV-013 | Dado un `admin`, cuando carga o edita una persona, puede asignarle un tipo de funcionario de su institución. | Sin priorizar | ADR-0010 dec. 6 |
| RF-HDV-014 | Dado cualquier rol, cuando consulta un catálogo, el sistema devuelve solo elementos activos, filtrables por tipo y por elemento padre (p. ej., cantones de una provincia). | Sin priorizar | ADR-0010 dec. 5 |
| RF-HDV-015 | Dado un `usuario`, `supervisor` o `admin`, cuando consulta o modifica ítems de la hoja de vida, el sistema solo opera sobre los de su institución aunque conozca identificadores de otra. | Sin priorizar | ADR-0004, RF-MUL-003 |
| RF-HDV-016 | Dado un `admin`, cuando exporta, el Excel y el `.zip` incluyen cada sección de la hoja de vida aprobada y sus respaldos ordenados por sección. | Sin priorizar | RF-EXP-001, RF-EXP-002 |
| RF-HDV-017 | Dado el mismo `usuario`, cuando agrega, modifica o elimina una referencia (personal o familiar), el sistema la guarda como un ítem con identificador propio. Nombres y apellidos y teléfono son obligatorios; título, cargo actual y empresa son opcionales. Se admiten hasta cinco referencias de cada tipo y no se pide parentesco (PD-HDV-13). El supervisor puede marcarla (RF-HDV-011). | Sin priorizar | Formato institucional, ADR-0010 dec. 1 |
| RF-HDV-018 | Dado un `usuario` que envía a revisión, cuando tiene menos de dos referencias de tipo personal, el sistema impide el envío. Las referencias familiares no cuentan para el mínimo y no son obligatorias. | Sin priorizar | Formato institucional |
| RF-HDV-019 | Dado un `usuario` que envía a revisión, cuando no tiene al menos un estudio registrado, de cualquier nivel, en formación académica (PD-HDV-09), el sistema impide el envío. | Sin priorizar | Formato institucional |
| RF-HDV-020 | Dado un `usuario`, cuando guarda su ficha, puede registrar un perfil (texto libre) y una foto; ambos son opcionales. La foto sigue las reglas de ADR-0006 y solo admite imagen. | Sin priorizar | Formato institucional, ADR-0006 |
| RF-HDV-021 | Dado un `admin` que carga la nómina, cuando una fila tiene un documento válido, el sistema la carga aunque falten otras columnas: lo vacío o no reconocido queda en nulo y se informa como advertencia con el número de fila y la columna. Solo se rechaza la fila sin documento válido o repetida en el archivo. El informe no repite datos personales. Las columnas bancarias se cargan como cuenta propuesta (RF-HDV-026). | Sin priorizar | ADR-0012, PD-09 de spec-0001 |
| RF-HDV-022 | Dada una fila de la nómina con el nombre en formato «apellidos y nombres», cuando se carga, el sistema conserva el texto original en `Persona.Nombre` y propone los cuatro campos (primer y segundo nombre, primer y segundo apellido) según la tabla de ADR-0012; la persona los confirma o corrige antes de enviar. | Sin priorizar | ADR-0012 |
| RF-HDV-023 | Dados datos precargados desde la nómina, cuando la persona envía, el sistema los trata como propuestos y no verificados: aplican las mismas reglas de completitud que si los hubiera escrito ella. | Sin priorizar | ADR-0012 |
| RF-HDV-024 | Dado un título obtenido, una capacitación o una experiencia laboral registrados, cuando el `usuario` envía a revisión y el ítem no tiene archivo de respaldo (título, certificado del curso o certificado de experiencia), el sistema impide el envío e indica el ítem. | Sin priorizar | Requisitos del docente, ADR-0010 dec. 10 |
| RF-HDV-025 | Dado un `usuario`, cuando registra su cuenta bancaria (tipo de cuenta, banco y número), el sistema la guarda protegida según ADR-0013 y la muestra enmascarada (últimos cuatro dígitos) en toda pantalla salvo la propia. | Sin priorizar | ADR-0013 |
| RF-HDV-026 | Dada una cuenta precargada desde la nómina, cuando el `usuario` la confirma o la corrige, el sistema guarda su versión y registra si coincide o difiere de la de la nómina, sin conservar dos copias del número en claro. | Sin priorizar | ADR-0013 |
| RF-HDV-027 | Dado un `supervisor` o `admin`, cuando revisa cuentas bancarias, el sistema indica por persona si la cuenta coincide con la nómina, difiere o no está confirmada, sin mostrar el número completo; cada lectura del número completo queda en la auditoría. | Sin priorizar | ADR-0013, spec-0001 (auditoría) |

## Escenarios del proceso

### Escenario 1 — Completar la hoja de vida

- **Actor y precondición:** `usuario` con documento `0000000000`, tipo de funcionario «Docente», campaña abierta, actualización en borrador.
- **Disparador:** abre su hoja de vida.
- **Secuencia:** completa la ficha personal (RF-HDV-001); agrega un título con su registro y respaldo (RF-HDV-002, 003, 006); agrega una experiencia actual (RF-HDV-004); agrega dos referencias personales (RF-HDV-017, 018); adjunta el certificado de cada ítem (RF-HDV-006, 024); confirma su cuenta bancaria (RF-HDV-025, 026); sube cédula, papeleta de votación, antecedentes penales, declaración juramentada notariada y mecanizado del IESS (RF-HDV-007, 008); envía (RF-HDV-009).
- **Resultado:** actualización enviada, edición bloqueada (RF-HDV-010).
- **Variantes y errores:** falta un documento obligatorio o el certificado de un ítem (envío impedido); menos de dos referencias personales o ningún estudio (envío impedido); experiencia sin fecha de fin ni «trabaja actualmente» (rechazada).

### Escenario 2 — Devolución por ítem

- **Actor y precondición:** `supervisor` de la misma institución; actualización enviada.
- **Disparador:** revisa la hoja de vida.
- **Secuencia:** marca el respaldo de un título como ilegible y devuelve con observación general (RF-HDV-011).
- **Resultado:** el `usuario` ve la marca sobre ese título, reemplaza el respaldo y reenvía.

### Escenario 3 — Configuración de requisitos

- **Actor y precondición:** `admin`.
- **Disparador:** configura su institución.
- **Secuencia:** crea el tipo de funcionario «Docente»; crea los tipos de documento `CEDULA`, `PAPELETA_VOTACION`, `ANTECEDENTES_PENALES`, `DECLARACION_JURAMENTADA` (notariada) y `MECANIZADO_IESS`; los marca obligatorios para todos (sin tipo de funcionario), de modo que no dependan de que la carga asigne el tipo (RF-HDV-012); asigna «Docente» a las personas (RF-HDV-013).
- **Resultado:** cada persona ve solo los documentos que le corresponden (RF-HDV-007).

### Escenario 4 — Carga de nómina con datos incompletos

- **Actor y precondición:** `admin` con el archivo de nómina de su institución, que tiene filas con columnas vacías.
- **Disparador:** carga el archivo.
- **Secuencia:** el sistema lee cada fila; una con documento `0000000001` y sin fecha de nacimiento se carga con esa fecha en nulo (RF-HDV-021); su nombre «PEREZ GOMEZ ANA MARIA» se propone como Pérez, Gómez, Ana, María (RF-HDV-022); una fila sin documento se rechaza; una con el documento repetido se omite.
- **Resultado:** informe con filas cargadas, rechazadas, omitidas y advertencias, sin datos personales. La persona entra, ve su fecha de nacimiento vacía y la completa antes de enviar (RF-HDV-023).
- **Variantes y errores:** cargo sin tipo de funcionario coincidente (persona sin tipo; el cargo aparece en el informe); la cuenta bancaria de la nómina queda como propuesta y la persona la confirma o corrige (RF-HDV-026).

## Datos, seguridad e integraciones

- **Datos capturados:** los de la ficha personal (nombres, sexo, fecha y lugar de nacimiento, estado civil, tipo de sangre, etnia, nacionalidad, residencia, teléfonos, correo institucional, discapacidad), títulos, estudios en curso, capacitaciones, experiencia laboral, cuenta bancaria (tipo, banco y número), referencias (nombres, teléfono, título, cargo y empresa de cada una), perfil, foto, documentos personales y sus respaldos. Etnia, discapacidad y tipo de sangre son **datos sensibles**, igual que los antecedentes penales y la cuenta bancaria; estos dos últimos solo los ven las personas y roles que el trabajo exige (ADR-0013).
- **Datos de terceros:** las referencias contienen datos de otras personas. Se piden solo los necesarios para contactarlas y la persona declara que cuenta con su autorización; el supervisor y el admin las ven como el resto de la hoja de vida.
- **Quién los ve:** como en spec-0001: el `usuario` los propios; `supervisor` y `admin` los de su institución; `superadmin` con auditoría.
- **Cuándo se persisten:** al guardar cada sección, mientras la actualización está en borrador o devuelta.
- **Catálogos:** compartidos y de solo lectura para los roles de institución; los administra el `superadmin` o una importación. Fuente oficial por catálogo en PD-HDV-03.
- **Integraciones:** ninguna en línea. Una exportación o importación con el sistema de talento humano usaría `elementos_catalogo.codigo_externo`; su contrato es un punto abierto (PD-HDV-05).

## Estado de implementación

Hecho en la rama `feature/hoja-de-vida-entidades` a pedido de quien desarrolla, **antes** de la aprobación de esta spec (desviación del flujo de `AGENTS.md`, registrada aquí):

- Entidades de dominio en `Domain/HojaDeVida/` con sus reglas de coherencia (RF-HDV-003, 004, 005, 008) y `Persona.AsegurarEdicionPermitida` (RF-HDV-010).
- Configuración EF y migración `AgregarHojaDeVida`: tablas `elementos_catalogo`, `tipos_funcionario`, `tipos_documento`, `requisitos_documento`, `fichas_personales`, `titulos_academicos`, `titulos_en_curso`, `capacitaciones`, `experiencias_laborales`, `documentos_personales` y columna `personas.tipo_funcionario_id`. Semillas: sexo, estado civil, tipo de sangre y tipo de capacitación.
- Pruebas de dominio, una prueba de modelo que exige el filtro por institución en toda entidad institucional y pruebas de integración en PostgreSQL 17 (aislamiento de la hoja de vida entre instituciones y unicidad de documento por tipo). La migración se aplica sola al arrancar el backend en `docker compose`.

Hecho en la rama `feature/28-esquema-referencias-y-perfil` (v0.2), también antes de la aprobación y a pedido de quien desarrolla, para que el equipo trabaje sobre el mismo esquema:

- Entidad `ReferenciaPersonal` (RF-HDV-017) con tipo personal o familiar, tabla `referencias_personales` con `institucion_id` y `persona_id`, y su filtro por institución.
- Columna `fichas_personales.perfil` (RF-HDV-020). La foto ya existía como `fichas_personales.foto_archivo_id`.
- Migración `AgregarReferenciasYPerfil` y pruebas de dominio y de modelo. Las reglas de mínimo de referencias, de formación académica y de carga de nómina (RF-HDV-018, 019, 021 a 023) **no** están implementadas: son capa de aplicación y esperan la aprobación.

Pendiente (issues #29 a #35 y las tareas de `tasks.md`): catálogos grandes, servicios de aplicación y endpoints, validación de tipo de catálogo y de completitud al enviar, exportación por secciones y frontend.

## Criterios de aceptación

- [x] Cada `RF-HDV-*` tiene prueba automática o recorrido en `test-e2e.md`.
- [x] Ningún ítem de otra institución es legible ni modificable con identificadores conocidos (RF-HDV-015).
- [x] Fuera de borrador o devuelto, ninguna sección se modifica ni por la API (RF-HDV-010).
- [x] Un campo de catálogo no acepta un elemento de otro tipo (RF-HDV-001).
- [x] Con menos de dos referencias personales o sin formación académica, el envío se impide y dice qué falta (RF-HDV-018, 019).
- [x] Una nómina con columnas vacías carga las filas con documento válido, deja lo vacío en nulo e informa cada advertencia (RF-HDV-021).
- [x] El número de cuenta no se guarda, no se muestra ni se exporta en claro fuera de lo que ADR-0013 permita (RF-HDV-025 a 027).
- [x] Un ítem sin certificado impide el envío (RF-HDV-024).
- [x] Ningún ejemplo, semilla ni prueba contiene datos personales reales; el archivo de nómina no se guarda en el repositorio.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-HDV-01 | Qué campos de la ficha son obligatorios para enviar, y si cambian por tipo de funcionario. | RF-HDV-009 | Revisor funcional |
| PD-HDV-02 | Una persona ya aprobada que inicia otra actualización edita en el lugar; mientras no se apruebe de nuevo, lo exportado no es lo aprobado (ADR-0010, consecuencias). ¿Se acepta, o se exporta solo a quienes están en «aprobado»? | RF-HDV-016, RF-FLU-005 | Revisor funcional |
| PD-HDV-03 | Fuente oficial y responsable de carga de cada catálogo grande (universidades SENESCYT, CINE-UNESCO, división política INEC, niveles y grados académicos). | RF-HDV-014 | Equipo |
| PD-HDV-04 | Hoy `Persona.ActualizarBorrador` impide editar en estado «aprobado» y no existe transición de «aprobado» a «borrador» al abrir otra campaña. Sin ella, RF-FLU-005 («vuelve a enviar una actualización») no puede ocurrir. | Toda segunda campaña | Revisor funcional (spec-0001) |
| PD-HDV-05 | ¿Debe la exportación generar un archivo compatible con el sistema de talento humano (códigos externos), o basta el Excel y el `.zip` de spec-0001? | RF-HDV-016 | Revisor funcional |
| PD-HDV-06 | Sección «instrucción profesional» de la plantilla del instructor de conducción: ¿son capacitaciones con otro tipo, o una sección aparte? | Modelo de capacitaciones | Revisor funcional |
| PD-HDV-07 | ¿Se piden cargas familiares (existe un PRD en el sistema de origen)? | Nueva sección | Revisor funcional |
| PD-HDV-08 | Tipo de participación en capacitaciones: se usaron «asistente», «aprobado» y «facilitador». El origen solo muestra «Recibido» como valor por defecto. | Catálogo o enum | Revisor funcional |
| PD-HDV-09 | Qué cuenta como formación académica obligatoria (RF-HDV-019). Primaria y secundaria necesitan un grado en el catálogo (PD-HDV-03). | RF-HDV-019 | Resuelto (v0.4, @JosephBano, 2026-10-22): basta un estudio de cualquier nivel. |
| PD-HDV-10 | El formato dice que solo son obligatorios datos personales, formación y dos referencias, pero RF-HDV-007 permite marcar documentos obligatorios. | RF-HDV-009 | Propuesta del desarrollador: **sí obligan**. Para el docente son cinco: cédula, papeleta de votación, antecedentes penales, declaración juramentada notariada y mecanizado del IESS. Validado con la versión 0.3. |
| PD-HDV-11 | «Fecha y número de registro» aparece en los datos personales del formato. | Modelo de la ficha | Resuelto (v0.4, @JosephBano, 2026-10-22): es el registro del título (SENESCYT); se guarda en el título y no se agrega campo a la ficha. |
| PD-HDV-12 | La declaración firmada del formato. | RF-HDV-007, alcance | Propuesta del desarrollador: es la **declaración juramentada notariada** que la persona sube escaneada como tipo de documento; no se genera. Validado con la versión 0.3. |
| PD-HDV-13 | Referencias: máximo por tipo y parentesco en las familiares. | RF-HDV-017 | Resuelto (v0.4, @JosephBano, 2026-10-22): máximo cinco por tipo; no se pide parentesco. |
| PD-HDV-14 | Datos bancarios: sí se piden, para comprobar que los pagos van a las cuentas correctas. Tratamiento en ADR-0013. | RF-HDV-025 a 027 | Resuelto (v0.4, @JosephBano, 2026-10-22): ADR-0013 Vigente con la opción 2 (cifrado en la aplicación, máscara, auditoría y huella). |
| PD-HDV-17 | ¿La cuenta bancaria es obligatoria para enviar? | RF-HDV-009, 025 | Resuelto (v0.4, @JosephBano, 2026-10-22): sí. |
| PD-HDV-18 | ¿Todo título, curso o experiencia registrado debe llevar su certificado (RF-HDV-024)? | RF-HDV-024 | Resuelto (v0.4, @JosephBano, 2026-10-22): sí; quien no tenga el certificado no registra el ítem. |
| PD-HDV-15 | Fecha de ingreso y ciudad de la nómina. | ADR-0012 | Resuelto (v0.4, @JosephBano, 2026-10-22): no se guardan en esta versión; la persona elige su parroquia. |
| PD-HDV-16 | Personal sin cédula (pasaporte). | RF-HDV-021 | Resuelto (v0.4, @JosephBano, 2026-10-22): por ahora solo cédula de 10 dígitos, tras completar el cero inicial. |

### Respuestas validadas con la versión 0.3

Respuestas a PD-HDV-01 a 08 propuestas por el equipo y **validadas por el revisor funcional con la aprobación de la versión 0.3** (ver «Revisión funcional»). Rigen el plan y las tareas.

| ID | Propuesta | Razón |
|---|---|---|
| PD-HDV-01 | Obligatorios, iguales para todo tipo de funcionario: primer nombre, primer apellido, sexo, fecha de nacimiento, país de nacimiento, estado civil, nacionalidad, parroquia de residencia, calle principal, un teléfono (celular o convencional) y correo institucional. Opcionales: segundo nombre y segundo apellido (no todos los tienen), tipo de sangre, etnia, discapacidad (con porcentaje y carné solo si la hay), perfil y foto. Lo que varía por tipo de funcionario son los documentos, no la ficha. | Los datos sensibles no deben bloquear el envío. El correo y el sexo no vienen en la nómina, así que los completa la persona. Hay que contrastar la lista con los campos obligatorios de `Profesores.cs` en el sistema de talento humano. |
| PD-HDV-02 | Exportar solo a quienes están en «aprobado»; quienes están en una nueva actualización salen en una hoja «pendientes». | Se edita en el lugar (ADR-0010 dec. 11): lo guardado de alguien en borrador no es lo aprobado. Conservar una copia al aprobar sería otro ADR. |
| PD-HDV-03 | Universidades y niveles y grados: SENESCYT. Campos UNESCO: clasificación CINE-F 2013 adaptada por SENESCYT. División política: INEC. Bancos: lista de la Superintendencia de Bancos (ADR-0013). Carga por importación a cargo del `superadmin` (issue #29). Incluir los grados de primaria y secundaria (PD-HDV-09). **Responsables de las fuentes (propuesta):** @JorgeDoicela, división política (INEC); @AlexanderMartinez0410, universidades y niveles y grados (SENESCYT); @AnthonyPilatasig, campos UNESCO y los catálogos del sistema de talento humano (etnia, nacionalidad indígena, discapacidad, becas); @bryancito1090, la importación, el README de fuentes y los bancos. | Con los catálogos del sistema de talento humano el `codigo_externo` coincide. Son listas, no datos personales. |
| PD-HDV-04 | La persona pasa de «aprobado» a «borrador» **al entrar**, con una acción explícita («Actualizar mis datos») mientras haya campaña abierta. | Pasar toda la nómina a pendiente al abrir la campaña escribe en masa y rompe la exportación de PD-HDV-02. Requiere cambiar `Persona` y anotarlo en spec-0001. |
| PD-HDV-05 | No en esta versión: Excel y `.zip`. Opcional: columna `codigo_externo` en las hojas. | Es una integración con contrato propio. |
| PD-HDV-06 | La instrucción profesional es una capacitación con un tipo propio en el catálogo. Sin sección nueva. | Solo cambia la siembra, no el modelo. |
| PD-HDV-07 | No se piden cargas familiares. Las referencias familiares (RF-HDV-017) son contactos y no cuentan como cargas. | Ya estaba excluido; el formato solo trae referencias. |
| PD-HDV-08 | Mantener asistente, aprobado y facilitador. Confirmar contra `CursosProfesores.cs`. Hoy es un `enum` (`TipoParticipacionCapacitacion`); pasarlo a catálogo sería un cambio posterior. | Evita una migración antes de confirmar los valores. |

## Propuestas de la versión 0.5 (pendientes de aprobación)

Surgen de revisar el **formato real** de hoja de vida y la **nómina real** que entrega la institución (fuentes «v0.5» de la tabla de fuentes). Ninguna rige hasta que el revisor funcional apruebe la 0.5; mientras tanto se aplica la 0.4. No se copió ningún dato personal: solo estructura, conteos y valores de catálogo.

### Contradicciones y datos faltantes

| ID | Hallazgo | Impacto | Propuesta del desarrollador | Quién decide |
|---|---|---|---|---|
| PD-HDV-19 | La «declaración firmada» del formato es un **compromiso de terminar el año lectivo** («me comprometo a terminar el año lectivo adjuntando los informes…») con firma y cédula. PD-HDV-12 la había tomado por la declaración juramentada notariada. | RF-HDV-007, escenario 3, los cinco documentos del docente | Nuevo tipo de documento `COMPROMISO_ANIO_LECTIVO`, obligatorio para el docente, que la persona sube firmado y escaneado (no se genera). Confirmar con la institución si además pide la declaración juramentada notariada; si no, se quita de los obligatorios. No cambia el modelo: es configuración (RF-HDV-012). | Revisor funcional, con la institución |
| PD-HDV-20 | La nómina tiene **29 de 109 personas que no son docentes** (secretaría, inspección, psicología, conserjería, autoridades). La v0.3 fijó un solo tipo de funcionario, «Docente», y el formato se titula «DOCENTES». | Alcance, RF-HDV-007 y 013, carga de nómina | Todo el personal de la nómina actualiza su hoja de vida (el formato es el mismo). Se crean los tipos de funcionario que la institución confirme y los documentos se configuran por tipo. Mientras no se decida, los requisitos «para todos» se aplican también a quien no es docente; ver PD-HDV-21. | Revisor funcional, con la institución |
| PD-HDV-21 | El compromiso de terminar el año lectivo (PD-HDV-19) solo tiene sentido para docentes. | Requisitos por tipo | Configurar `COMPROMISO_ANIO_LECTIVO` como requisito del tipo «Docente», no «para todos». Para eso la carga debe asignar el tipo (ADR-0012, columna `Cargo de Trabajo`). | Revisor funcional |
| PD-HDV-22 | La experiencia laboral del formato pide **jefe inmediato** y **teléfono**; el modelo no los tiene. | Modelo de `ExperienciaLaboral` | Dos campos opcionales: `jefe_inmediato` y `telefono_contacto` (RF-HDV-028). Requiere migración. | Revisor funcional |
| PD-HDV-23 | La nómina real **no trae columnas bancarias**. RF-HDV-026 y la comparación de ADR-0013 suponían que sí. | RF-HDV-026, 027 | Se agrega el estado `sin-nomina` (implementado en #45 a validar): la persona registra su cuenta y no hay con qué comparar. La comparación queda para cuando la institución entregue esas columnas. | Quien cerró ADR-0013 |
| PD-HDV-24 | `Fec. Ingreso` viene **completa en las 109 filas**, y PD-HDV-15 decidió no guardarla. `Ciudad` es la misma para todas. | PD-HDV-15 | Mantener la decisión sobre la ciudad. Reconsiderar la fecha de ingreso: es un dato completo, útil y que la persona no conoce mejor que la institución. Si se guarda, es un campo de `Persona` cargado por el admin, no editable por el usuario. | Revisor funcional |
| PD-HDV-25 | La nómina real difiere de lo que supone ADR-0012: título en la fila 1, texto `NULL`, sangre como `O +`, «Union Libre», ~10 variantes mal escritas de «Ecuatoriana», una fecha en la columna de nacionalidad y un celular de 9 dígitos. | RF-HDV-021, ADR-0012 | Ajustes de la carga en **ADR-0014 (Propuesto)**: ubicar la fila de encabezados; `NULL` = vacío; normalizar espacios en la sangre; alias de catálogo (`alias_elementos_catalogo`); un celular de 9 dígitos queda en nulo con advertencia; columnas bancarias ausentes sin advertencia por fila. | Quien desarrolla (cierra ADR-0014) |

### Requisitos propuestos

| ID | Condición y comportamiento observable | Fuente |
|---|---|---|
| RF-HDV-028 (propuesto) | Dada una experiencia laboral, cuando el `usuario` la registra, puede indicar jefe inmediato y su teléfono (ambos opcionales). La lista de experiencias se muestra desde la más reciente (las vigentes primero y luego por fecha de fin descendente). | Formato real, PD-HDV-22 |
| RF-HDV-029 (propuesto) | Dado un docente, cuando abre sus documentos personales, el sistema le pide el compromiso de terminar el año lectivo firmado (tipo `COMPROMISO_ANIO_LECTIVO`, obligatorio para «Docente»). | Formato real, PD-HDV-19 y 21 |
| RF-HDV-030 (propuesto) | Dada una nómina con título en la primera fila, valores `NULL`, variantes de escritura de catálogos o sin columnas bancarias, cuando el admin la carga, el sistema aplica las reglas de ADR-0014 y solo advierte lo que no pudo interpretar. | Nómina real, PD-HDV-25 |

### Lo que no cambia

Los datos personales, la formación por niveles, los cursos (curso → `NombreEvento`, dictado por → `InstitucionOrganizadora`, duración → `NumeroHoras`, lugar y fecha), las dos referencias personales y dos familiares, el perfil y la foto **coinciden** con el modelo actual. «Fecha y número de registro» ya se resolvió como registro SENESCYT del título (PD-HDV-11).

## Revisión funcional

**Versión en revisión:** 0.5 — pendiente de aprobación (ver «Propuestas de la versión 0.5»). Hasta entonces rige la 0.4.

**Versión revisada:** 0.4 (la 0.3 se aprobó el mismo día)  
**Decisión:** Aprobada, sin ajustes  
**Aprobó:** @JosephBano, revisor funcional  
**Fecha y evidencia de aprobación:** 2026-10-22. Confirmación escrita «validado v0.3» del revisor en la sesión de trabajo (versión 0.3 en `develop` por el PR #38). La 0.4 se aprobó con la respuesta escrita del revisor en la misma sesión: aceptó las respuestas a PD-HDV-09, 11, 13, 15 y 16 y cerró ADR-0012 y ADR-0013.  
**Ajustes solicitados:** Ninguno. La aprobación cubre la versión 0.4 tal como está escrita, incluidas las respuestas a PD-HDV-01 a 08 y las de PD-HDV-09 a 18. ADR-0012 y ADR-0013 están **Vigentes** (cerrados el 2026-10-22), por lo que T-09 y T-10 quedan libres.

**Pendientes que no bloquean:** contrastar PD-HDV-01, 06 y 08 con `Profesores.cs` y `CursosProfesores.cs` del sistema de talento humano (@AnthonyPilatasig, antes de T-04); confirmar con la institución qué es «Teléfono 2»; base legal escrita y gestión de la clave de cifrado (ADR-0013), antes de producción.

**Cambios de 0.4 a 0.5 (propuestos, sin aprobar):** fuentes «formato real» y «nómina real»; puntos PD-HDV-19 a 25; requisitos propuestos RF-HDV-028 a 030; ADR-0014 (Propuesto) para la carga de nómina real.

**Cambios de 0.3 a 0.4:** se responden PD-HDV-09, 11, 13, 15 y 16; ADR-0012 y ADR-0013 pasan a Vigente; RF-HDV-017 admite hasta cinco referencias por tipo, sin parentesco; RF-HDV-019 exige al menos un estudio de cualquier nivel.

**Cambios de 0.2 a 0.3:** un solo tipo de funcionario («Docente»); cinco documentos obligatorios del docente (PD-HDV-10, 12); respaldo obligatorio por ítem (RF-HDV-024); cuenta bancaria (RF-HDV-025 a 027, ADR-0013); responsables de las fuentes de catálogos (PD-HDV-03); puntos PD-HDV-17 y 18.

**Cambios de 0.1 a 0.2:** se agregan referencias personales y familiares, perfil, foto, formación académica por niveles y declaración firmada al alcance; los obligatorios del formato (RF-HDV-009, 018, 019); la carga de nómina con valores nulos y la división de nombres (RF-HDV-021 a 023, ADR-0012); el escenario 4; los puntos PD-HDV-09 a 16; y las respuestas propuestas para PD-HDV-01 a 08.

Aprobación registrada: `plan.md`, `tasks.md` y `test-e2e.md` se crearon el 2026-10-22 a partir de la versión 0.3 y se ajustaron a la 0.4. Cualquier cambio de alcance vuelve a revisión funcional antes de ejecutar tareas dependientes.
