# Hoja de vida del personal — Spec

**ID:** spec-0003  
**Versión:** 0.2  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Pendiente de asignar  
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
| ADR propuesto | ADR-0011, Propuesto, `docs/decisiones/ADR-0011-carga-de-nomina-nulos-y-nombres.md` | Tratamiento de valores nulos de la nómina, división de nombres y columnas que no se importan |
| ADR propuesto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | Campos configurables: abierto. Sus restricciones se cumplen |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/` y migración `AgregarHojaDeVida` | Entidades y tablas ya creadas (ver «Estado de implementación») |

Lo tomado del sistema de talento humano es **estructura**. No se copian registros reales ni se integra en línea con él en esta versión.

## Alcance

**Incluye:** ficha personal con perfil y foto; títulos obtenidos y estudios por nivel; títulos en curso; capacitaciones; experiencia laboral; referencias personales y familiares; documentos personales (incluida la declaración firmada); archivo de respaldo por ítem; catálogos compartidos; tipos de documento, tipos de funcionario y requisitos por institución; validación de completitud al enviar; marcas de observación por ítem; secciones en la exportación; carga de nómina con valores nulos y división de nombres (ADR-0011).  
**Excluye:** titulación y examen complexivo (`titul_*`) y contratos (`contratos_asignaturas`), porque son planificación académica y no datos de la persona (ADR-0010, decisión 13); generación de la hoja de vida en Word o PDF con plantillas; alertas de vencimiento de documentos; cargas familiares (las referencias familiares son contactos, no dependientes); datos bancarios (decisión aparte, ADR-0011); sincronización automática con el sistema de talento humano.  
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
| RF-HDV-009 | Dado un `usuario` que envía a revisión, cuando falta algún dato obligatorio, el sistema impide el envío y dice qué falta. Son obligatorios: los datos personales de la ficha (PD-HDV-01), la formación académica (RF-HDV-019), dos referencias personales (RF-HDV-018) y los documentos personales marcados como obligatorios en los requisitos de su tipo de funcionario (PD-HDV-10). Ninguna otra sección es obligatoria. | Sin priorizar | Formato institucional; requisitos del origen; ADR-0009 (validación en un solo lugar) |
| RF-HDV-010 | Dada una actualización enviada o aprobada, cuando el `usuario` intenta modificar cualquier sección, el sistema lo rechaza, también por la API. | Sin priorizar | RF-FLU-001, ADR-0010 dec. 11 |
| RF-HDV-011 | Dado un `supervisor`, cuando devuelve una actualización, puede marcar un ítem concreto (por ejemplo, un título) con una clave estable, y el `usuario` ve la marca sobre ese ítem. | Sin priorizar | ADR-0008, ADR-0009 |
| RF-HDV-012 | Dado un `admin`, cuando crea o edita tipos de documento, tipos de funcionario y requisitos, el sistema los guarda solo para su institución; un código no se repite dentro de la misma institución. | Sin priorizar | ADR-0009, ADR-0010 dec. 6 |
| RF-HDV-013 | Dado un `admin`, cuando carga o edita una persona, puede asignarle un tipo de funcionario de su institución. | Sin priorizar | ADR-0010 dec. 6 |
| RF-HDV-014 | Dado cualquier rol, cuando consulta un catálogo, el sistema devuelve solo elementos activos, filtrables por tipo y por elemento padre (p. ej., cantones de una provincia). | Sin priorizar | ADR-0010 dec. 5 |
| RF-HDV-015 | Dado un `usuario`, `supervisor` o `admin`, cuando consulta o modifica ítems de la hoja de vida, el sistema solo opera sobre los de su institución aunque conozca identificadores de otra. | Sin priorizar | ADR-0004, RF-MUL-003 |
| RF-HDV-016 | Dado un `admin`, cuando exporta, el Excel y el `.zip` incluyen cada sección de la hoja de vida aprobada y sus respaldos ordenados por sección. | Sin priorizar | RF-EXP-001, RF-EXP-002 |
| RF-HDV-017 | Dado el mismo `usuario`, cuando agrega, modifica o elimina una referencia (personal o familiar), el sistema la guarda como un ítem con identificador propio. Nombres y apellidos y teléfono son obligatorios; título, cargo actual y empresa son opcionales. El supervisor puede marcarla (RF-HDV-011). | Sin priorizar | Formato institucional, ADR-0010 dec. 1 |
| RF-HDV-018 | Dado un `usuario` que envía a revisión, cuando tiene menos de dos referencias de tipo personal, el sistema impide el envío. Las referencias familiares no cuentan para el mínimo y no son obligatorias. | Sin priorizar | Formato institucional |
| RF-HDV-019 | Dado un `usuario` que envía a revisión, cuando no tiene ningún estudio registrado en formación académica (PD-HDV-09), el sistema impide el envío. | Sin priorizar | Formato institucional |
| RF-HDV-020 | Dado un `usuario`, cuando guarda su ficha, puede registrar un perfil (texto libre) y una foto; ambos son opcionales. La foto sigue las reglas de ADR-0006 y solo admite imagen. | Sin priorizar | Formato institucional, ADR-0006 |
| RF-HDV-021 | Dado un `admin` que carga la nómina, cuando una fila tiene un documento válido, el sistema la carga aunque falten otras columnas: lo vacío o no reconocido queda en nulo y se informa como advertencia con el número de fila y la columna. Solo se rechaza la fila sin documento válido o repetida en el archivo. El informe no repite datos personales y las columnas bancarias se ignoran. | Sin priorizar | ADR-0011, PD-09 de spec-0001 |
| RF-HDV-022 | Dada una fila de la nómina con el nombre en formato «apellidos y nombres», cuando se carga, el sistema conserva el texto original en `Persona.Nombre` y propone los cuatro campos (primer y segundo nombre, primer y segundo apellido) según la tabla de ADR-0011; la persona los confirma o corrige antes de enviar. | Sin priorizar | ADR-0011 |
| RF-HDV-023 | Dados datos precargados desde la nómina, cuando la persona envía, el sistema los trata como propuestos y no verificados: aplican las mismas reglas de completitud que si los hubiera escrito ella. | Sin priorizar | ADR-0011 |

## Escenarios del proceso

### Escenario 1 — Completar la hoja de vida

- **Actor y precondición:** `usuario` con documento `0000000000`, tipo de funcionario «Docente», campaña abierta, actualización en borrador.
- **Disparador:** abre su hoja de vida.
- **Secuencia:** completa la ficha personal (RF-HDV-001); agrega un título con su registro y respaldo (RF-HDV-002, 003, 006); agrega una experiencia actual (RF-HDV-004); agrega dos referencias personales (RF-HDV-017, 018); sube su cédula y su certificado de votación (RF-HDV-007, 008); envía (RF-HDV-009).
- **Resultado:** actualización enviada, edición bloqueada (RF-HDV-010).
- **Variantes y errores:** falta un documento obligatorio (envío impedido); menos de dos referencias personales o ningún estudio (envío impedido); experiencia sin fecha de fin ni «trabaja actualmente» (rechazada).

### Escenario 2 — Devolución por ítem

- **Actor y precondición:** `supervisor` de la misma institución; actualización enviada.
- **Disparador:** revisa la hoja de vida.
- **Secuencia:** marca el respaldo de un título como ilegible y devuelve con observación general (RF-HDV-011).
- **Resultado:** el `usuario` ve la marca sobre ese título, reemplaza el respaldo y reenvía.

### Escenario 3 — Configuración de requisitos

- **Actor y precondición:** `admin`.
- **Disparador:** configura su institución.
- **Secuencia:** crea los tipos de funcionario «Docente» e «Instructor»; crea los tipos de documento `CEDULA`, `CERT_VOTACION` y `LICENCIA_CONDUCIR`; marca cédula y votación obligatorias para todos y licencia obligatoria solo para «Instructor» (RF-HDV-012); asigna tipos a las personas (RF-HDV-013).
- **Resultado:** cada persona ve solo los documentos que le corresponden (RF-HDV-007).

### Escenario 4 — Carga de nómina con datos incompletos

- **Actor y precondición:** `admin` con el archivo de nómina de su institución, que tiene filas con columnas vacías.
- **Disparador:** carga el archivo.
- **Secuencia:** el sistema lee cada fila; una con documento `0000000001` y sin fecha de nacimiento se carga con esa fecha en nulo (RF-HDV-021); su nombre «PEREZ GOMEZ ANA MARIA» se propone como Pérez, Gómez, Ana, María (RF-HDV-022); una fila sin documento se rechaza; una con el documento repetido se omite.
- **Resultado:** informe con filas cargadas, rechazadas, omitidas y advertencias, sin datos personales. La persona entra, ve su fecha de nacimiento vacía y la completa antes de enviar (RF-HDV-023).
- **Variantes y errores:** cargo sin tipo de funcionario coincidente (persona sin tipo; el cargo aparece en el informe); columnas bancarias presentes (ignoradas).

## Datos, seguridad e integraciones

- **Datos capturados:** los de la ficha personal (nombres, sexo, fecha y lugar de nacimiento, estado civil, tipo de sangre, etnia, nacionalidad, residencia, teléfonos, correo institucional, discapacidad), títulos, estudios en curso, capacitaciones, experiencia laboral, referencias (nombres, teléfono, título, cargo y empresa de cada una), perfil, foto, documentos personales y sus respaldos. Etnia, discapacidad y tipo de sangre son **datos sensibles**.
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

Pendiente (issues #28 a #35): decisiones funcionales, catálogos grandes, servicios de aplicación y endpoints, validación de tipo de catálogo y de completitud al enviar, exportación por secciones y frontend.

## Criterios de aceptación

- [ ] Cada `RF-HDV-*` tiene prueba automática o recorrido en `test-e2e.md`.
- [ ] Ningún ítem de otra institución es legible ni modificable con identificadores conocidos (RF-HDV-015).
- [ ] Fuera de borrador o devuelto, ninguna sección se modifica ni por la API (RF-HDV-010).
- [ ] Un campo de catálogo no acepta un elemento de otro tipo (RF-HDV-001).
- [ ] Con menos de dos referencias personales o sin formación académica, el envío se impide y dice qué falta (RF-HDV-018, 019).
- [ ] Una nómina con columnas vacías carga las filas con documento válido, deja lo vacío en nulo e informa cada advertencia (RF-HDV-021).
- [ ] Ningún ejemplo, semilla ni prueba contiene datos personales reales; el archivo de nómina no se guarda en el repositorio.

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
| PD-HDV-09 | Qué cuenta como formación académica obligatoria (RF-HDV-019): al menos un estudio de cualquier nivel, los tres niveles del formato (primaria, secundaria, superior) o solo el superior. Quien tiene solo bachillerato no debe quedar bloqueado. Primaria y secundaria necesitan un grado en el catálogo (PD-HDV-03). | RF-HDV-019 | Revisor funcional |
| PD-HDV-10 | El formato dice que solo son obligatorios datos personales, formación y dos referencias, pero RF-HDV-007 permite al admin marcar documentos obligatorios por tipo de funcionario. ¿Esos documentos siguen siendo obligatorios para enviar? | RF-HDV-009 | Revisor funcional |
| PD-HDV-11 | «Fecha y número de registro» aparece en los datos personales del formato. ¿Es el registro del título (SENESCYT, que el modelo guarda en el título) o un registro institucional? | Modelo de la ficha | Revisor funcional |
| PD-HDV-12 | La declaración firmada del formato («me comprometo a terminar el año lectivo…»): ¿es un tipo de documento que la persona sube firmado, o se genera? La generación de documentos está fuera de alcance. | RF-HDV-007, alcance | Revisor funcional |
| PD-HDV-13 | Referencias: ¿máximo por tipo, y se pide parentesco en las familiares? El formato trae dos de cada tipo y no pide parentesco. | RF-HDV-017 | Revisor funcional |
| PD-HDV-14 | Datos bancarios de la nómina: quedan fuera hasta una decisión aparte (finalidad, base legal, cifrado y quién los ve). | ADR-0011 | Quien desarrolla |
| PD-HDV-15 | Fecha de ingreso y ciudad de la nómina: hoy no se guardan (ADR-0011). ¿Se necesitan? | ADR-0011 | Revisor funcional |
| PD-HDV-16 | ¿La institución tiene personal sin cédula (pasaporte)? Cambia la validación del documento en la carga. | RF-HDV-021 | Equipo |

### Respuestas propuestas (pendientes de validación)

Propuesta del equipo para cerrar PD-HDV-01 a 08. **Ninguna es una decisión** hasta que el revisor funcional las apruebe. Mientras tanto, cada una es la decisión por defecto con la que se puede avanzar.

| ID | Propuesta | Razón |
|---|---|---|
| PD-HDV-01 | Obligatorios, iguales para todo tipo de funcionario: primer nombre, primer apellido, sexo, fecha de nacimiento, país de nacimiento, estado civil, nacionalidad, parroquia de residencia, calle principal, un teléfono (celular o convencional) y correo institucional. Opcionales: segundo nombre y segundo apellido (no todos los tienen), tipo de sangre, etnia, discapacidad (con porcentaje y carné solo si la hay), perfil y foto. Lo que varía por tipo de funcionario son los documentos, no la ficha. | Los datos sensibles no deben bloquear el envío. El correo y el sexo no vienen en la nómina, así que los completa la persona. Hay que contrastar la lista con los campos obligatorios de `Profesores.cs` en el sistema de talento humano. |
| PD-HDV-02 | Exportar solo a quienes están en «aprobado»; quienes están en una nueva actualización salen en una hoja «pendientes». | Se edita en el lugar (ADR-0010 dec. 11): lo guardado de alguien en borrador no es lo aprobado. Conservar una copia al aprobar sería otro ADR. |
| PD-HDV-03 | Universidades y niveles y grados: SENESCYT. Campos UNESCO: clasificación CINE-F 2013 adaptada por SENESCYT. División política: INEC. Carga por importación a cargo del `superadmin`, con una persona responsable nombrada por catálogo. Incluir los grados de primaria y secundaria (PD-HDV-09). | Con los catálogos del sistema de talento humano el `codigo_externo` coincide. Son listas, no datos personales. |
| PD-HDV-04 | La persona pasa de «aprobado» a «borrador» **al entrar**, con una acción explícita («Actualizar mis datos») mientras haya campaña abierta. | Pasar toda la nómina a pendiente al abrir la campaña escribe en masa y rompe la exportación de PD-HDV-02. Requiere cambiar `Persona` y anotarlo en spec-0001. |
| PD-HDV-05 | No en esta versión: Excel y `.zip`. Opcional: columna `codigo_externo` en las hojas. | Es una integración con contrato propio. |
| PD-HDV-06 | La instrucción profesional es una capacitación con un tipo propio en el catálogo. Sin sección nueva. | Solo cambia la siembra, no el modelo. |
| PD-HDV-07 | No se piden cargas familiares. Las referencias familiares (RF-HDV-017) son contactos y no cuentan como cargas. | Ya estaba excluido; el formato solo trae referencias. |
| PD-HDV-08 | Mantener asistente, aprobado y facilitador. Confirmar contra `CursosProfesores.cs`. Hoy es un `enum` (`TipoParticipacionCapacitacion`); pasarlo a catálogo sería un cambio posterior. | Evita una migración antes de confirmar los valores. |

## Revisión funcional

**Versión revisada:** 0.2  
**Decisión:** Pendiente  
**Aprobó:** Pendiente  
**Fecha y evidencia de aprobación:** Pendiente  
**Ajustes solicitados:** Ninguno todavía

**Cambios de 0.1 a 0.2:** se agregan referencias personales y familiares, perfil, foto, formación académica por niveles y declaración firmada al alcance; los obligatorios del formato (RF-HDV-009, 018, 019); la carga de nómina con valores nulos y la división de nombres (RF-HDV-021 a 023, ADR-0011); el escenario 4; los puntos PD-HDV-09 a 16; y las respuestas propuestas para PD-HDV-01 a 08.

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
