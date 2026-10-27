# Liberación de secciones de la hoja de vida por fases — Spec

**ID:** spec-0010; prioritaria; relacionada con el issue #92  
**Versión:** 0.2  
**Estado:** Aprobado (v0.2, 2026-10-27; ver «Revisión funcional»)  
**Revisor funcional:** Por designar (el solicitante es Joseph Baño, quien definió las decisiones de «Decisiones del solicitante»)  
**Fecha:** 2026-10-27  
**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

Hoy, con una campaña abierta, la persona ve y llena **todas** las secciones de la hoja de vida a la vez. Hay presión por entregar capacitaciones obligatorias (spec-0008) y datos nuevos, pero soltar todo de golpe es un riesgo: los issues recién resueltos no han recibido feedback de uso real.

Resultado esperado: el `admin` de cada institución decide **qué secciones están abiertas**. Primero puede dejar abierta solo la ficha personal, observar el feedback y abrir las siguientes una a una. Las secciones cerradas no se muestran a las personas ni aceptan datos, y no bloquean el envío. El `admin` puede cerrar una sección ya abierta sin perder lo que las personas cargaron.

## Decisiones del solicitante (2026-10-27)

1. El interruptor es **por institución**, no por campaña.
2. Abre y cierra secciones el `admin` de la institución. El `superadmin` también puede, pero sus vistas actuales lo limitan y **no se trabajan en este cambio**.
3. Se puede **cerrar** una sección previamente abierta.
4. Abrir una sección nueva **no cambia** el estado de quien ya envió o fue aprobado: la sección nueva le aparece pendiente (misma lógica que RF-CAP-012 de spec-0008).

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Spec | `docs/specs/spec-0003/spec.md`, RF-HDV-009 | Lista de obligatorios para enviar. Esta spec la hace depender de las secciones abiertas. |
| Spec | `docs/specs/spec-0001/spec.md`, RF-CAM-002, 003, 004; RF-FLU-005, 006 | Edición solo con campaña abierta; borrador no se envía solo; una sola versión aprobada; el supervisor no ve borradores. |
| Spec | `docs/specs/spec-0001/spec.md`, RF-MUL-004 | El `superadmin` opera entre instituciones. El `superadmin` puede abrir y cerrar por la API, sin pantalla nueva (PD-SEC-03). |
| Spec relacionada | `docs/specs/spec-0008/spec.md` (v0.2) | Capacitaciones obligatorias: se entrega cerrada hasta que el `admin` la abra. |
| ADR | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Configuración aislada por institución. |
| ADR | ADR-0010, Vigente, `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Secciones de la hoja de vida y validación de completitud. |
| ADR abierto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | Configuración por institución. No se cierra aquí; el almacenamiento del interruptor se decide en un ADR nuevo (PD-SEC-01). |
| Código | `src/Frontend/src/app/features/usuario/hoja-de-vida/hoja-de-vida.component.ts` | Las pestañas de sección son fijas; no existe el concepto de sección abierta o cerrada. |
| Código | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | Reglas de completitud independientes (`IReglaCompletitudEnvio`); cada una puede condicionarse a su sección. |
| Código | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Campana.cs` | La campaña solo tiene fechas y estado; no define secciones. |

**Confirmado:** lo de la columna «Código». **Inferido:** que el servicio de guardado de cada sección pueda consultar el interruptor antes de escribir, y que el tratamiento de datos (RF-DAT-001) no dependa de ninguna sección.

**ADR:** ninguno cubre el interruptor por sección (búsqueda en `docs/decisiones/`). Hace falta uno (PD-SEC-01): ADR-0028, Propuesto, `docs/decisiones/ADR-0028-secciones-habilitadas-por-institucion.md`.

## Alcance

**Incluye:**
- Un interruptor abierta/cerrada por sección y por institución, que solo el `admin` de la institución cambia.
- Las secciones: ficha personal, formación académica, referencias, experiencia laboral, capacitaciones, documentos personales y cuenta bancaria.
- Mostrar y aceptar datos solo de las secciones abiertas, también por la API.
- Exigir en el envío solo lo de las secciones abiertas.
- Conservar los datos al cerrar una sección.
- Avance por sección para el `admin`.
- Auditoría de cada apertura y cierre.

**Excluye:**
- Interruptores por campaña, por persona o por tipo de funcionario.
- Programar la apertura por fecha.
- Avisos o correos a las personas al abrir una sección.
- Cambiar campos, reglas de validación o el contenido de cada sección.
- Que el `supervisor` o la persona abran o cierren secciones.
- Pantallas propias del `superadmin` para este interruptor.

**Límites del proceso:** empieza cuando el `admin` abre o cierra una sección y termina cuando la persona la ve (o deja de verla) y el envío se valida con ese conjunto.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-SEC-001 | Dado un `admin`, cuando abre la configuración de secciones, ve las siete secciones de la hoja de vida de **su institución** con su estado, abierta o cerrada. | Sin priorizar | Decisiones del solicitante 1 y 2 |
| RF-SEC-002 | Dado un `admin`, cuando abre o cierra una sección, el sistema guarda el estado para su institución y lo aplica de inmediato. | Sin priorizar | Decisiones 1 y 3 |
| RF-SEC-003 | Dado un `usuario` o `supervisor`, cuando intenta abrir o cerrar una sección, el sistema lo rechaza. El `superadmin` queda permitido por la API (RF-MUL-004), sin pantalla propia en esta versión. | Sin priorizar | Decisión 2; PD-SEC-03 |
| RF-SEC-004 | Dada una persona, cuando abre su hoja de vida, el sistema muestra solo las secciones abiertas de su institución; las cerradas no aparecen. | Sin priorizar | Objetivo |
| RF-SEC-005 | Dada una sección cerrada, cuando se intenta guardar un dato o subir un archivo en ella, el sistema lo rechaza, también por la API, con un mensaje que indica que la sección no está disponible. | Sin priorizar | RF-CAM-003 por analogía |
| RF-SEC-006 | Dado un `usuario` que envía a revisión, cuando evalúa la completitud, el sistema exige solo lo obligatorio de las secciones abiertas y no menciona las cerradas. | Sin priorizar | RF-HDV-009 |
| RF-SEC-007 | Dado un `admin` que cierra una sección con datos cargados, cuando la cierra, el sistema conserva esos datos; si la vuelve a abrir, la persona los ve tal como los dejó. | Sin priorizar | Decisión 3 |
| RF-SEC-008 | Dada una persona con actualización enviada o aprobada, cuando el `admin` abre una sección nueva, el sistema no cambia su estado ni la devuelve; la sección nueva le aparece pendiente y se completa al iniciar una nueva actualización (acción explícita de RF-FLU-005). | Sin priorizar | Decisión 4; RF-CAP-012 |
| RF-SEC-009 | Dada la ficha personal, cuando el `admin` intenta cerrarla, el sistema se lo impide: la ficha siempre está abierta (propuesta, PD-SEC-02). | Sin priorizar | Propuesta |
| RF-SEC-010 | Dado un `admin`, cuando consulta el avance, el sistema muestra por sección cuántas personas la tienen completa y cuántas no, solo de su institución. | Sin priorizar | Objetivo: feedback con datos |
| RF-SEC-011 | Dado un `admin` que abre o cierra una sección, cuando lo hace, el sistema registra quién, cuándo, la sección y el nuevo estado en la auditoría, sin contenido de datos personales. | Sin priorizar | RF-DAT-004, 005 |
| RF-SEC-012 | Dado cualquier rol, cuando consulta o cambia el interruptor, el sistema solo opera sobre su institución aunque conozca identificadores de otra. | Sin priorizar | ADR-0004; RF-HDV-015 |
| RF-SEC-013 | Dada una institución que ya existe, cuando se aplica este cambio, el sistema deja las secciones en el estado inicial acordado (PD-SEC-02) sin perder ni alterar ningún dato cargado. | Sin priorizar | Compatibilidad |

## Escenarios del proceso

### Escenario 1 — Primera fase: solo la ficha

- **Actor y precondición:** `admin` de la institución de prueba; campaña abierta.
- **Disparador:** deja abierta solo la ficha personal y cierra las otras seis (RF-SEC-002).
- **Secuencia:** una persona ingresa y ve únicamente la ficha (RF-SEC-004); la llena y envía; el sistema valida solo la ficha (RF-SEC-006).
- **Resultado:** actualización enviada con solo la ficha.
- **Variantes y errores:** si alguien llama al API de «Formación» recibe un rechazo (RF-SEC-005); el `admin` ve el avance de la ficha (RF-SEC-010).

### Escenario 2 — Abrir la siguiente sección

- **Actor y precondición:** `admin`; hay personas con actualización enviada y otras en borrador.
- **Disparador:** abre «Formación académica» (RF-SEC-002).
- **Secuencia:** quien está en borrador ve la sección nueva y debe completarla para enviar; quien ya envió o fue aprobado no cambia de estado y ve la sección pendiente (RF-SEC-008).
- **Resultado:** la auditoría registra la apertura (RF-SEC-011).
- **Variantes y errores:** `usuario` o `supervisor` intentan abrir secciones y se rechazan (RF-SEC-003).

### Escenario 3 — Cerrar una sección ya abierta

- **Actor y precondición:** `admin`; «Referencias» está abierta y tiene datos.
- **Disparador:** la cierra.
- **Secuencia:** las personas dejan de verla y no pueden guardar (RF-SEC-004, 005); el envío ya no la exige (RF-SEC-006); los datos se conservan (RF-SEC-007); si el `admin` la reabre, reaparecen.
- **Resultado:** estado persistido y auditado.
- **Variantes y errores:** intentar cerrar la ficha se rechaza (RF-SEC-009).

## Datos, seguridad e integraciones

- **Datos nuevos:** el estado abierta/cerrada de cada sección por institución. Es configuración, no contiene datos personales.
- **Quién ve qué:** el `admin` ve y cambia el estado de su institución; las personas solo reciben las secciones abiertas; nada cruza instituciones.
- **Auditoría:** cada cambio queda registrado (RF-SEC-011).
- **Integraciones:** ninguna. No se define endpoint; los contratos van en el plan, con `openapi/v1.json` y el cliente regenerados.
- **Datos de ejemplo:** solo ficticios (documento `0000000000`, correo `usuario@ejemplo.test`).

## Criterios de aceptación

- [ ] El `admin` ve y cambia las siete secciones de su institución y nadie más puede (RF-SEC-001 a 003, 012).
- [ ] La persona ve solo las secciones abiertas y la API rechaza las cerradas (RF-SEC-004, 005; escenario 1).
- [ ] El envío exige solo lo de las secciones abiertas y no se rompe el envío actual con todas abiertas (RF-SEC-006).
- [ ] Cerrar una sección conserva los datos y reabrir los devuelve (RF-SEC-007; escenario 3).
- [ ] Abrir una sección no cambia el estado de actualizaciones enviadas o aprobadas (RF-SEC-008; escenario 2).
- [ ] La ficha no puede cerrarse (RF-SEC-009).
- [ ] El avance por sección y la auditoría funcionan (RF-SEC-010, 011).
- [ ] La migración no altera datos existentes (RF-SEC-013).
- [ ] Pruebas nuevas en xUnit y Vitest; `openapi/v1.json` y cliente regenerados; CI en verde; sin datos personales reales.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-SEC-01 | **Dónde se guarda el interruptor** (por ejemplo, una tabla por institución y sección, o un campo de configuración). No se escoge en esta spec. | Plan y migración. | ADR nuevo, a redactar antes de las tareas |
| PD-SEC-02 | **Estado inicial** al aplicar el cambio. | RF-SEC-009, 013 | **Resuelto (v0.2, 2026-10-27), según la propuesta (estado inicial confirmado con «correcto»):** las instituciones existentes quedan con todas las secciones abiertas, sin cambio de comportamiento; el `admin` cierra las que no quiera **antes de comunicar** a las personas; la ficha no se puede cerrar. |
| PD-SEC-03 | **`superadmin`.** | RF-SEC-003 | **Resuelto (v0.2, 2026-10-27):** el `superadmin` sí puede (RF-MUL-004), pero sus vistas lo limitan y no se trabaja en este cambio. |
| PD-SEC-04 | **Supervisor y exportación con secciones cerradas.** | Revisión y exportación | **Resuelto (v0.2, 2026-10-27):** lo ya cargado sigue visible al `supervisor` en solo lectura y se exporta; el interruptor controla solo lo que la persona ve y escribe. |
| PD-SEC-05 | **Granularidad.** Propuesta: siete secciones como están hoy. La foto y el perfil van dentro de la ficha. | RF-SEC-001 | Revisor funcional |
| PD-SEC-06 | **Cuenta bancaria.** Depende de lo que traiga la nómina. Propuesta: tratarla como una sección más, abierta o cerrada. | RF-SEC-001 | Revisor funcional |
| PD-SEC-07 | **Datos en borrador al vencer la campaña.** Ver PD-CAP-10 de spec-0008: el `admin` ve lo cargado aunque no se haya enviado. Esta spec lo hereda para las secciones abiertas y cerradas. | RF-SEC-007 | Resuelto en spec-0008 (opción 1) |

## Revisión funcional

**Versión revisada:** 0.2  
**Decisión:** Aprobado  
**Aprobó:** Joseph Baño, solicitante y responsable funcional  
**Fecha y evidencia de aprobación:** 2026-10-27; mensaje en la conversación de trabajo del issue #92 («si apruebo el spec … v2»; se entendió spec-0010)  
**Ajustes solicitados:** Ninguno hasta ahora.

**Cambios de 0.1 a 0.2:** PD-SEC-02, 03 y 04 resueltos; RF-SEC-003 permite al `superadmin` por la API; se excluyen pantallas propias del `superadmin`.

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
