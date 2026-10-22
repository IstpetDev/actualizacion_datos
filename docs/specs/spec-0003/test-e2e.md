# Hoja de vida del personal — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.3  
**Plan:** `plan.md` versión 1.0  
**Responsable de ejecución:** @JosephBano  
**Ambiente:** local con `docker compose` (API, frontend y PostgreSQL 17), sobre `develop` integrado tras T-01 a T-12

## Preparación

Commit de `develop` a probar: se anota en cada ejecución. Levantar con `cp .env.example .env && docker compose up --build`. La migración se aplica sola al arrancar el backend. Restaurar entre recorridos con `docker compose down -v` y volver a levantar.

Solo datos ficticios evidentes. El SMTP institucional no se prueba aquí: el correo usa el `EnviadorCorreoLog` del ambiente local, y ese doble **no** prueba la entrega real de correos. El archivo real de nómina no se usa nunca.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| Institución A y B | Dos instituciones creadas por el `superadmin` | «Institución A» e «Institución B», sin personas |
| Admin A y admin B | Un admin por institución | Documentos `0000000011` y `0000000012` |
| Supervisor A | Un supervisor en A | Documento `0000000013` |
| Docente A1 | Usuario de A con tipo «Docente», acceso habilitado | Documento `0000000001`, correo `usuario@ejemplo.test` |
| Docente A2 | Usuario de A sin tipo | Documento `0000000002` |
| Docente B1 | Usuario de B | Documento `0000000003` |
| Campaña | Una campaña abierta en A y otra en B | Fechas que incluyen el día de la prueba |
| Catálogos | Cargados por T-01 (provincias, cantones, parroquias, grados, universidades, campos UNESCO) | Con elementos de prueba de cada tipo |
| Tipos y requisitos | Tipo «Docente»; documentos `CEDULA`, `PAPELETA_VOTACION`, `ANTECEDENTES_PENALES`, `DECLARACION_JURAMENTADA`, `MECANIZADO_IESS`, obligatorios para todos | Creados en el E2E-06 o por el admin antes |
| Archivos | PDF, JPG y PNG ficticios de menos de 1 MB; un PDF de más de 10 MB; un `.exe` renombrado a `.pdf` | En una carpeta local fuera del repositorio |
| Cuenta bancaria | Solo con ADR-0013 Vigente: número ficticio `0000000000` | Banco y tipo de cuenta de prueba en catálogo |

## Matriz de cobertura

| Caso | Requisito y escenario del spec | Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | RF-HDV-001, 002, 006, 007, 008, 009, 010, 017, 020, 024; Escenario 1 | T-02, T-03, T-04, T-11 | Éxito | Estado «Enviado»; ficha, ítems y documentos persistidos |
| E2E-02 | RF-HDV-009, 018, 019, 024; Escenario 1 (variantes) | T-04, T-11 | Error | Envío rechazado con la lista exacta de faltantes |
| E2E-03 | RF-HDV-010, 015 | T-02, T-03 | Permiso | Edición rechazada tras enviar; ítem de otra institución no encontrado |
| E2E-04 | RF-HDV-001, 003, 004, 005, 006, 020 | T-02 | Entradas inválidas | Cada entrada inválida rechazada con su mensaje |
| E2E-05 | RF-HDV-011; Escenario 2 | T-07, T-12 | Éxito | Marca visible sobre el ítem; reenvío posible |
| E2E-06 | RF-HDV-007, 008, 012, 013; Escenario 3 | T-03, T-05, T-12 | Éxito y permiso | Cada persona ve solo sus documentos; código repetido rechazado |
| E2E-07 | RF-HDV-021, 022, 023; Escenario 4 | T-09 | Éxito y error | Informe con advertencias; fila sin documento rechazada. **Bloqueado por ADR-0012** |
| E2E-08 | RF-HDV-025, 026, 027 | T-10 | Éxito, permiso | Número enmascarado; estado coincide o difiere. **Bloqueado por ADR-0013** |
| E2E-09 | RF-HDV-014, 001 | T-01 | Éxito, permiso | Solo activos; filtro por padre; importar dos veces no duplica |
| E2E-10 | PD-HDV-04, RF-HDV-008, RF-HDV-016 | T-06, T-08 | Éxito | Aprobada pasa a borrador al iniciar; la exportación excluye a quien está en nueva actualización |
| E2E-11 | RF-HDV-016 | T-08 | Éxito | Excel y `.zip` con cada sección y los respaldos ordenados |

Requisitos cubiertos por otro nivel además del E2E: RF-HDV-003, 004, 005 (pruebas de dominio existentes), RF-HDV-015 (prueba de integración con dos instituciones en cada servicio), RF-HDV-022 (pruebas de `DivisorNombres` con los cinco casos de ADR-0012) y RF-HDV-026 (pruebas de huella con confirmación igual y distinta). Se mantienen porque el E2E no puede variar la huella ni forzar cada caso del divisor.

## E2E-01 — Docente completa y envía su hoja de vida

**Precondición:** Docente A1 con sesión iniciada, campaña abierta, actualización en borrador, `TratamientoDatosAceptado` realizado.  
**Datos:** nombres «Nombre Ficticio», apellidos «Apellido Ficticio»; título «Título Ficticio» con universidad del catálogo y PDF de respaldo; experiencia actual en «Empresa Ficticia» con certificado; dos referencias personales con teléfono `0000000000`; los cinco documentos como PDF; cuenta bancaria solo si ADR-0013 es Vigente.  
**Pasos:**

1. Completar la ficha con los campos obligatorios de PD-HDV-01 y un perfil breve.
2. Agregar el título con respaldo, una capacitación con certificado y la experiencia actual con certificado.
3. Agregar dos referencias personales y una familiar.
4. Subir los cinco documentos.
5. Enviar a revisión.
6. Consultar el estado y la ficha por la API.

**Resultado esperado:** estado «Enviado»; cada ítem con su `archivo_id`; los cinco documentos registrados, uno por tipo; la ficha con sus catálogos; cualquier intento de editar después falla (ver E2E-03).  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** captura anonimizada del estado y salida de las consultas  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-02 — Envío impedido por faltantes

**Precondición:** Docente A2 con sesión, actualización en borrador.  
**Datos:** ficha completa, sin estudios, con una referencia personal y una familiar, una experiencia sin certificado, cuatro de los cinco documentos.  
**Pasos:**

1. Intentar enviar.
2. Leer la respuesta.
3. Corregir una causa a la vez (agregar el estudio, la segunda referencia personal, el certificado, el documento) y reintentar tras cada una.

**Resultado esperado:** el primer intento falla y lista, por sección: formación académica ausente, segunda referencia personal faltante (la familiar no cuenta), certificado de la experiencia y documento obligatorio ausente; cada corrección quita su línea; cuando no queda ninguna, el envío tiene éxito.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** respuestas del servidor en cada intento  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-03 — Edición bloqueada y aislamiento por institución

**Precondición:** actualización de Docente A1 en «Enviado»; Docente B1 con sesión; ítems creados en E2E-01.  
**Datos:** identificadores de ítems de A1.  
**Pasos:**

1. Como A1, intentar modificar ficha, un título, una referencia y un documento.
2. Como supervisor A, aprobar la actualización y repetir el paso 1.
3. Como B1, consultar y modificar un ítem de A1 usando su identificador.

**Resultado esperado:** los pasos 1 y 2 fallan con el mensaje de edición no permitida, también por la API directa; el paso 3 devuelve «no encontrado».  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** respuestas HTTP de cada llamada  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-04 — Entradas inválidas

**Precondición:** Docente A1 en borrador (restaurar el ambiente si hace falta).  
**Datos:** un `*Id` de la ficha que apunta a un elemento de otro tipo o inactivo; un título sin universidad ni institución; una experiencia sin fecha de fin y sin «trabaja actualmente»; una actual con fecha de fin; un título en curso sin beca con porcentaje; foto PDF; respaldo `.exe` renombrado y PDF de más de 10 MB.  
**Pasos:** enviar cada entrada por separado a su endpoint.  
**Resultado esperado:** cada una se rechaza con su mensaje; el título en curso sin beca se guarda sin los datos de beca; nada inválido queda persistido.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** respuesta de cada llamada y consulta posterior  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-05 — Devolución por ítem

**Precondición:** actualización de Docente A1 en «Enviado» con un título y su respaldo.  
**Datos:** marca «ilegible» sobre el título y observación general.  
**Pasos:**

1. Supervisor A abre la hoja de vida y marca el título.
2. Devuelve con la observación.
3. A1 abre sus observaciones.
4. A1 reemplaza el respaldo y reenvía.

**Resultado esperado:** A1 ve la marca sobre ese título y la observación; el reenvío tiene éxito; un supervisor de B no puede marcar ni ver el ítem.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** capturas anonimizadas y respuestas  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-06 — Configuración de requisitos

**Precondición:** admin A con sesión; sin tipos ni requisitos.  
**Datos:** tipo «Docente»; los cinco tipos de documento, obligatorios para todos.  
**Pasos:**

1. Crear el tipo de funcionario y los tipos de documento.
2. Intentar crear un tipo de documento con un código ya existente en A.
3. Crear el mismo código como admin B.
4. Asignar «Docente» a Docente A1; dejar sin tipo a A2.
5. Como A1 y A2 abrir sus documentos.
6. Como `usuario`, intentar crear un tipo de documento.

**Resultado esperado:** el paso 2 falla; el 3 funciona; A1 y A2 ven los cinco documentos como obligatorios; el paso 6 es rechazado por rol.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** respuestas y listados  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-07 — Carga de nómina con datos incompletos (bloqueado por ADR-0012)

**Precondición:** admin A con sesión; ADR-0012 Vigente.  
**Datos:** archivo ficticio con filas: una completa; una con documento `0000000001` y sin fecha de nacimiento; una con «DE LA TORRE RUIZ LUIS»; una sin documento; una con documento repetido; columnas bancarias presentes (solo se cargan si ADR-0013 es Vigente).  
**Pasos:**

1. Cargar el archivo.
2. Leer el informe.
3. Entrar como la persona de la fila sin fecha y abrir su ficha.

**Resultado esperado:** filas válidas cargadas; la sin fecha tiene ese campo nulo con advertencia; «DE LA TORRE RUIZ LUIS» propuesto como `DE LA TORRE`, `RUIZ`, `LUIS`; la fila sin documento rechazada; la repetida omitida; el informe no contiene nombres ni documentos completos; la persona completa la fecha antes de enviar.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** informe anonimizado  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-08 — Cuenta bancaria (bloqueado por ADR-0013)

**Precondición:** ADR-0013 Vigente; Docente A1 con una cuenta propuesta desde la nómina.  
**Datos:** cuenta ficticia `0000000000`.  
**Pasos:**

1. A1 abre su cuenta, la ve completa y la confirma sin cambios.
2. Otro docente corrige la suya con un número distinto.
3. Supervisor A y admin A consultan el estado.
4. Consultar la tabla en la base.
5. Revisar la auditoría.

**Resultado esperado:** coincide para el primero y difiere para el segundo; supervisor y admin ven solo los últimos cuatro dígitos; el número no aparece en claro en la base; cada lectura completa figura en la auditoría; sin cuenta no se puede enviar.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** consulta a la tabla (sin números reales) y registro de auditoría  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-09 — Catálogos

**Precondición:** `superadmin` y un usuario con sesión.  
**Datos:** CSV de prueba con un hijo cuyo padre es de otro tipo.  
**Pasos:**

1. Consultar provincias, luego cantones con `padreId`.
2. Desactivar un elemento y consultar de nuevo.
3. Importar el CSV dos veces.
4. Importar el CSV con el padre de otro tipo.
5. Intentar importar como admin.

**Resultado esperado:** solo activos y por orden; el filtro por padre funciona; la segunda importación no duplica; el padre de otro tipo se rechaza; el admin no puede importar.  
**Resultado obtenido:** aprobado mediante solicitudes HTTP automatizadas con cookies (WebApplicationFactory/SQLite), pruebas de integración PostgreSQL y carga/reinicio real en Docker. Se verificaron los cinco pasos; 2.104 registros e ids estables tras repetir la carga.\
**Evidencia:** [issue-29: pruebas, comandos, recuentos y límites](../../evidencia/issue-29.md), `CatalogosTests.cs` y `CatalogosIntegracionTests.cs`.\
**Fecha y ejecutor:** 2026-10-22, agente de implementación por encargo del solicitante.\
**Incidencia:** ninguna en este recorrido. No se ejecutaron pantallas ni los demás recorridos.

## E2E-10 — Segunda campaña

**Precondición:** Docente A1 «Aprobado»; una campaña nueva abierta.  
**Pasos:**

1. A1 intenta editar sin iniciar.
2. A1 inicia una nueva actualización.
3. A1 modifica un documento (reemplazo del mismo tipo) y no envía.
4. Admin A exporta.
5. A1 envía, el supervisor aprueba y el admin exporta de nuevo.

**Resultado esperado:** el paso 1 falla; el 2 pasa a «Borrador» solo con campaña abierta; en el 3 queda un solo documento por tipo; en el 4 A1 sale en «pendientes» y no con datos como aprobados; en el 5 sale aprobado con los datos nuevos.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** estados y archivos exportados  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## E2E-11 — Exportación por secciones

**Precondición:** al menos dos personas aprobadas en A y una en B.  
**Pasos:** el admin A solicita el Excel y el `.zip`.  
**Resultado esperado:** cada sección de cada persona aprobada de A y sus respaldos ordenados por sección; nada de B; la cuenta bancaria, si existe, enmascarada.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** estructura del `.zip` y hojas del Excel (anonimizadas)  
**Fecha y ejecutor:** pendiente  
**Incidencia:** pendiente

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 | Pendiente | — | Ninguna |
| E2E-02 | Pendiente | — | Ninguna |
| E2E-03 | Pendiente | — | Ninguna |
| E2E-04 | Pendiente | — | Ninguna |
| E2E-05 | Pendiente | — | Ninguna |
| E2E-06 | Pendiente | — | Ninguna |
| E2E-07 | Bloqueado por ADR-0012 | — | Ninguna |
| E2E-08 | Bloqueado por ADR-0013 | — | Ninguna |
| E2E-09 | Aprobado (HTTP automatizado, PostgreSQL y Docker) | [Evidencia #29](../../evidencia/issue-29.md) | Ninguna |
| E2E-10 | Pendiente | — | Ninguna |
| E2E-11 | Pendiente | — | Ninguna |

Un recorrido solo se marca aprobado cuando se ejecutó sobre la versión declarada y su resultado coincide con el esperado. Un caso bloqueado no cuenta como aprobado.
