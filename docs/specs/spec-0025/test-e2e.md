# Acta PDF y firma física — Pruebas de punta a punta

**Spec aprobado:** [spec.md](spec.md) v0.2, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md) y [puertas E0 resueltas en #189](../../evidencia/issue-189/README.md). **Plan:** [plan.md](plan.md) v1.0.

**Responsable de ejecución:** desarrollador/revisor asignado a #193/#194/#195. **Ambiente:** prueba local o staging aislado con Angular, API real y PostgreSQL; almacén privado de prueba. **Estado:** diseñado con contratos congelados en #189, pendiente de ejecución; #182/#189 no implementan ni prueban código de producción.

## Preparación

Registrar commit, versión de API/cliente, migraciones aplicadas y políticas ficticias confirmadas. Usar instituciones Educativa Ejemplo A/B, Persona Trabajadora Ejemplo con documento `9999999999` en ambas instituciones (registros separados), Otro Trabajador Demo `0000000000`, operador y verificador sintéticos con delegaciones explícitas. Ningún dato ni firma manuscrita real; representaciones sintéticas de evidencia solo en almacenamiento de prueba. Correo, si hace falta: `persona@ejemplo.test`.

Cada caso recibe ambiente reiniciado o transacción/fixture independiente; no limpiar por borrado de auditoría en producción. Las certificaciones, fechas y cantidades del escenario son datos de prueba, no reglas legales. Probar sesión real en UI/API y persistencia real; fallos de almacenamiento se inyectan solo en pruebas y se identifican como simulación. No se simula una respuesta HTTP para afirmar integración E2E. Registrar las dos sesiones/race cuando aplique.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| Identidad y tenant | Sesiones de trabajador/operador/verificador de A y B | Sin facultades de vacaciones implícitas por rol |
| Configuración | Régimen, fuente, plantilla, evidencia y facultades de fixture aprobadas, según E0 | Completa para éxito; retirar un dato para error |
| Base y archivos | PostgreSQL y almacén de prueba privados, estado inicial recuperable | Sin saldos ni ledger en Modo A |
| API y Angular | Rutas del plan implementadas en commit registrado y NSwag sincronizado | Puerta ADR satisfecha antes de probar |

## Matriz de cobertura

| Caso | Requisitos | Escenario del spec | Tareas | Tipo / disposición | Evidencia esperada |
|---|---|---|---|---|---|
| E2E-ACT-01 | RF-VAC-ACT-001, RF-VAC-ACT-002, RF-VAC-ACT-007 | ESC-VAC-ACT-01 | T-ACT-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-ACT-02 | RF-VAC-ACT-002, RF-VAC-ACT-003, RF-VAC-ACT-008, RF-VAC-ACT-010 | ESC-VAC-ACT-02 | T-ACT-01, T-ACT-02, T-ACT-03 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-ACT-03 | RF-VAC-ACT-004, RF-VAC-ACT-005 | ESC-VAC-ACT-03 | T-ACT-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-ACT-04 | RF-VAC-ACT-005, RF-VAC-ACT-006, RF-VAC-ACT-010 | ESC-VAC-ACT-04 | T-ACT-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-ACT-05 | RF-VAC-ACT-005, RF-VAC-ACT-008, RF-VAC-ACT-010 | ESC-VAC-ACT-05 | T-ACT-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-ACT-06 | RF-VAC-ACT-002, RF-VAC-ACT-009 | ESC-VAC-ACT-06 | T-ACT-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |

## E2E-ACT-01 — Preparar y emitir A

**Precondición y datos ficticios:** Facultad de TH, vínculo/período/retorno/días certificados y plantilla ficticia aprobada. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Previsualizar, emitir DEMO-0001 v1, repetir con cargo ambiguo y base legal ausente.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** PDF con identificación/firmas en blanco y saldo no certificado; sin firma verificada; campos incompletos bloquean emisión. Tabla B y saldo B diferidos.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-ACT-02 — Descarga propia y entrega

**Precondición y datos ficticios:** v1 emitida del trabajador de A; operador delegado y otro trabajador en A/B. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Descargar dos veces, comparar SHA-256, imprimir y registrar entrega; intentar accesos ajenos.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Mismos bytes/versiones; firma pendiente; accesos/entrega auditados y denegación sin archivo ni datos ajenos.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-ACT-03 — Inspección y firma faltante

**Precondición y datos ficticios:** Verificador delegado y política ficticia de evidencia/ref. física confirmada. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Inspeccionar papel sintético de v1, registrar resultado y respaldo; repetir con firma faltante, solo adjunto y referencia inválida; subsanar.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Solo verificación completa activa indicador; faltantes producen OBSERVADA; subsanación de la misma versión conserva historia. No usar firmas/personas reales en pruebas.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-ACT-04 — Corrección y papel de otra versión

**Precondición y datos ficticios:** v1 emitida o verificada con fecha errónea. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Anular con motivo, crear/emitar v2, presentar respaldo de v1 para v2 y descargar ambas.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Original íntegro, sucesión enlazada, v2 requiere nueva firma; no se acepta evidencia de v1 ni cambian datos al modificar ficha/plantilla.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-ACT-05 — Pérdida de evidencia

**Precondición y datos ficticios:** v1 verificada y referencia/archivo posteriormente perdido o inválido. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Registrar incidente, consultar estado/historia y tratar de borrar/sustituir respaldo sin facultad.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** OBSERVADA con verificación anterior conservada; no borrar rastro ni afirmar firma vigente; solo subsanación permitida por política.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-ACT-06 — Fallo y concurrencia

**Precondición y datos ficticios:** Dos sesiones y almacenamiento de pruebas con fallo inyectable. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Verificar y anular concurrentemente; reintentar emisión; fallar guardado de archivo/registro y recuperar.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Una transición compatible con estado/revisión vigente; sin número/versión duplicados ni emisión publicada sin archivo; recuperación íntegra y auditoría consistente.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## Verificaciones de otros niveles

Unitarias de dominio: invariantes de intervalo y transiciones, sin reemplazar recorrido real. WebApi con PostgreSQL: permisos en servidor, persistencia, concurrencia y reintentos; usar clases propuestas en plan. Pruebas Angular: errores/presentación, sin afirmar que un doble de API prueba el backend. PDF: legibilidad y contenido ficticio, hash sobre bytes conservados y doble firma en blanco; un PDF válido sintácticamente no acredita la corrección jurídica. Ejecución física del papel se representa con material sintético; no se afirma autenticidad pericial.

## Resultado global

| Caso | Estado | Evidencia |
|---|---|---|
| E2E-ACT-01 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-ACT-02 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-ACT-03 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-ACT-04 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-ACT-05 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-ACT-06 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |

Un caso solo pasa a aprobado con ejecución sobre commit identificado y resultado coincidente. Un caso bloqueado/diferido no cuenta como aprobado. El cierre del milestone valida diseño y trazabilidad de esta matriz, no el software futuro.
