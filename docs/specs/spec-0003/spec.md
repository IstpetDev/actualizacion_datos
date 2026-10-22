# Hoja de vida del personal — Spec

**ID:** spec-0003  
**Versión:** 0.1  
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
| ADR propuesto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | Campos configurables: abierto. Sus restricciones se cumplen |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/` y migración `AgregarHojaDeVida` | Entidades y tablas ya creadas (ver «Estado de implementación») |

Lo tomado del sistema de talento humano es **estructura**. No se copian registros reales ni se integra en línea con él en esta versión.

## Alcance

**Incluye:** ficha personal; títulos obtenidos; títulos en curso; capacitaciones; experiencia laboral; documentos personales; archivo de respaldo por ítem; catálogos compartidos; tipos de documento, tipos de funcionario y requisitos por institución; validación de completitud al enviar; marcas de observación por ítem; secciones en la exportación.  
**Excluye:** titulación y examen complexivo (`titul_*`) y contratos (`contratos_asignaturas`), porque son planificación académica y no datos de la persona (ADR-0010, decisión 13); generación de la hoja de vida en Word o PDF con plantillas; alertas de vencimiento de documentos; cargas familiares; sincronización automática con el sistema de talento humano.  
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
| RF-HDV-009 | Dado un `usuario` que envía a revisión, cuando falta un documento obligatorio o un campo obligatorio de la ficha, el sistema impide el envío y dice qué falta. | Sin priorizar | Requisitos del origen; ADR-0009 (validación en un solo lugar) |
| RF-HDV-010 | Dada una actualización enviada o aprobada, cuando el `usuario` intenta modificar cualquier sección, el sistema lo rechaza, también por la API. | Sin priorizar | RF-FLU-001, ADR-0010 dec. 11 |
| RF-HDV-011 | Dado un `supervisor`, cuando devuelve una actualización, puede marcar un ítem concreto (por ejemplo, un título) con una clave estable, y el `usuario` ve la marca sobre ese ítem. | Sin priorizar | ADR-0008, ADR-0009 |
| RF-HDV-012 | Dado un `admin`, cuando crea o edita tipos de documento, tipos de funcionario y requisitos, el sistema los guarda solo para su institución; un código no se repite dentro de la misma institución. | Sin priorizar | ADR-0009, ADR-0010 dec. 6 |
| RF-HDV-013 | Dado un `admin`, cuando carga o edita una persona, puede asignarle un tipo de funcionario de su institución. | Sin priorizar | ADR-0010 dec. 6 |
| RF-HDV-014 | Dado cualquier rol, cuando consulta un catálogo, el sistema devuelve solo elementos activos, filtrables por tipo y por elemento padre (p. ej., cantones de una provincia). | Sin priorizar | ADR-0010 dec. 5 |
| RF-HDV-015 | Dado un `usuario`, `supervisor` o `admin`, cuando consulta o modifica ítems de la hoja de vida, el sistema solo opera sobre los de su institución aunque conozca identificadores de otra. | Sin priorizar | ADR-0004, RF-MUL-003 |
| RF-HDV-016 | Dado un `admin`, cuando exporta, el Excel y el `.zip` incluyen cada sección de la hoja de vida aprobada y sus respaldos ordenados por sección. | Sin priorizar | RF-EXP-001, RF-EXP-002 |

## Escenarios del proceso

### Escenario 1 — Completar la hoja de vida

- **Actor y precondición:** `usuario` con documento `0000000000`, tipo de funcionario «Docente», campaña abierta, actualización en borrador.
- **Disparador:** abre su hoja de vida.
- **Secuencia:** completa la ficha personal (RF-HDV-001); agrega un título con su registro y respaldo (RF-HDV-002, 003, 006); agrega una experiencia actual (RF-HDV-004); sube su cédula y su certificado de votación (RF-HDV-007, 008); envía (RF-HDV-009).
- **Resultado:** actualización enviada, edición bloqueada (RF-HDV-010).
- **Variantes y errores:** falta un documento obligatorio (envío impedido); experiencia sin fecha de fin ni «trabaja actualmente» (rechazada).

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

## Datos, seguridad e integraciones

- **Datos capturados:** los de la ficha personal (nombres, sexo, fecha y lugar de nacimiento, estado civil, tipo de sangre, etnia, nacionalidad, residencia, teléfonos, correo institucional, discapacidad), títulos, estudios en curso, capacitaciones, experiencia laboral, documentos personales y sus respaldos. Etnia, discapacidad y tipo de sangre son **datos sensibles**.
- **Quién los ve:** como en spec-0001: el `usuario` los propios; `supervisor` y `admin` los de su institución; `superadmin` con auditoría.
- **Cuándo se persisten:** al guardar cada sección, mientras la actualización está en borrador o devuelta.
- **Catálogos:** compartidos y de solo lectura para los roles de institución; los administra el `superadmin` o una importación. Fuente oficial por catálogo en PD-HDV-03.
- **Integraciones:** ninguna en línea. Una exportación o importación con el sistema de talento humano usaría `elementos_catalogo.codigo_externo`; su contrato es un punto abierto (PD-HDV-05).

## Estado de implementación

Hecho en la rama `feature/hoja-de-vida-entidades` a pedido de quien desarrolla, **antes** de la aprobación de esta spec (desviación del flujo de `AGENTS.md`, registrada aquí):

- Entidades de dominio en `Domain/HojaDeVida/` con sus reglas de coherencia (RF-HDV-003, 004, 005, 008) y `Persona.AsegurarEdicionPermitida` (RF-HDV-010).
- Configuración EF y migración `AgregarHojaDeVida`: tablas `elementos_catalogo`, `tipos_funcionario`, `tipos_documento`, `requisitos_documento`, `fichas_personales`, `titulos_academicos`, `titulos_en_curso`, `capacitaciones`, `experiencias_laborales`, `documentos_personales` y columna `personas.tipo_funcionario_id`. Semillas: sexo, estado civil, tipo de sangre y tipo de capacitación.
- Pruebas de dominio, una prueba de modelo que exige el filtro por institución en toda entidad institucional y pruebas de integración en PostgreSQL 17 (aislamiento de la hoja de vida entre instituciones y unicidad de documento por tipo). La migración se aplica sola al arrancar el backend en `docker compose`.

Pendiente (issues #28 a #35): decisiones funcionales, catálogos grandes, servicios de aplicación y endpoints, validación de tipo de catálogo y de completitud al enviar, exportación por secciones y frontend.

## Criterios de aceptación

- [ ] Cada `RF-HDV-*` tiene prueba automática o recorrido en `test-e2e.md`.
- [ ] Ningún ítem de otra institución es legible ni modificable con identificadores conocidos (RF-HDV-015).
- [ ] Fuera de borrador o devuelto, ninguna sección se modifica ni por la API (RF-HDV-010).
- [ ] Un campo de catálogo no acepta un elemento de otro tipo (RF-HDV-001).
- [ ] Ningún ejemplo, semilla ni prueba contiene datos personales reales.

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

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** Pendiente  
**Aprobó:** Pendiente  
**Fecha y evidencia de aprobación:** Pendiente  
**Ajustes solicitados:** Ninguno todavía

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
