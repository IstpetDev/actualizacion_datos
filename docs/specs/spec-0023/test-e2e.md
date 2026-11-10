# Vínculos laborales e historia — Pruebas de punta a punta

**Spec aprobado:** [spec.md](spec.md) v0.2, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md) y [decisiones E0 de #189](../../evidencia/issue-189/README.md). **Plan:** [plan.md](plan.md) v1.0.

**Responsable de ejecución:** desarrollador/revisor asignado al issue [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191) / [#195](https://github.com/IstpetDev/actualizacion_datos/issues/195). **Ambiente:** prueba local o staging aislado con Angular, API real y PostgreSQL; almacén privado de prueba. **Estado:** diseñado, puerta ADR/E0 resuelta en #189, pendiente de ejecución cuando se implemente el módulo.

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
| E2E-VIN-01 | RF-VAC-VIN-002, RF-VAC-VIN-003 | ESC-VAC-VIN-01 | T-VIN-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-VIN-02 | RF-VAC-VIN-004 | ESC-VAC-VIN-02 | T-VIN-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-VIN-03 | RF-VAC-VIN-001, RF-VAC-VIN-004 | ESC-VAC-VIN-03 | T-VIN-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-VIN-04 | RF-VAC-VIN-005 | ESC-VAC-VIN-04 | T-VIN-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-VIN-05 | RF-VAC-VIN-006 | ESC-VAC-VIN-05 | T-VIN-D01 | Negativo A; aceptación positiva B diferida | UI/API, estado persistido y documento cuando aplique |
| E2E-VIN-06 | RF-VAC-VIN-007, RF-VAC-VIN-008 | ESC-VAC-VIN-06 | T-VIN-01, T-VIN-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |

## E2E-VIN-01 — Fechas discrepantes

**Precondición y datos ficticios:** Ficha 2020-04-01, contrato 2020-05-01 y ninguna certificación. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Consultar fuentes e intentar certificar sin respaldo; después aportar referencia ficticia válida y certificar.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Se ven ambas fechas, no se escoge mínimo; rechazo sin respaldo y certificación motivada con actor/versión al completar el trámite.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-VIN-02 — Ruptura y reingreso

**Precondición y datos ficticios:** Episodio anterior cerrado y referencia de reingreso 2025-08-01. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Clasificar ruptura y certificar nuevo episodio; repetir con renovación continua y dos reingresos contradictorios.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** La ruptura certificada abre episodio sin borrar el previo; renovación no reinicia sola; contradicción requiere resolución y no un Max automático.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-VIN-03 — Contratos y cargo

**Precondición y datos ficticios:** Dos contratos/cargos simultáneos en A y un contrato distinto en B. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Preparar selección de vínculo/cargo de A; intentar fin anterior al inicio y referencia a B.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Selección justificada solo de A; se rechazan intervalo inválido y asociación ajena. No se duplica derecho por contratos múltiples.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-VIN-04 — Ingreso antiguo sin historia

**Precondición y datos ficticios:** Ingreso 2010-01-01 certificado, sin consumos ni corte. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Consultar disponibilidad y preparar borrador con período documentado; repetir sin fecha certificada.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Saldo desconocido sin cero ni créditos históricos; sin fecha/período verificado no se emite. Historial incompleto no impide A si se certifican sus datos comunes.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-VIN-05 — Corte y apertura nativa diferidos

**Precondición y datos ficticios:** Fixture conceptual con corte 2026-10-31 y dos períodos; no hay interfaz B en A. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Comprobar que Entrega 1 no ofrece activar saldo ni registrar créditos; reservar prueba positiva del corte para futura spec B.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** No se expone saldo certificado ni FIFO. La aceptación de apertura/corte y su deduplicación queda diferida, no aprobada por esta prueba negativa.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-VIN-06 — Rectificación y facultades

**Precondición y datos ficticios:** Fecha certificada usada en un PDF y operador sin delegación en B. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Intentar rectificar desde B; rectificar desde A con facultad, motivo y referencia nueva; descargar PDF antiguo.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Denegar intento ajeno; conservar historia/archivo anterior y señalar revisión de documentos afectados, sin sobrescribir contenido.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## Verificaciones de otros niveles

Unitarias de dominio: invariantes de intervalo y transiciones, sin reemplazar recorrido real. WebApi con PostgreSQL: permisos en servidor, persistencia, concurrencia y reintentos; usar clases propuestas en plan. Pruebas Angular: errores/presentación, sin afirmar que un doble de API prueba el backend. PDF: legibilidad y contenido ficticio, hash sobre bytes conservados y doble firma en blanco; un PDF válido sintácticamente no acredita la corrección jurídica. Ejecución física del papel se representa con material sintético; no se afirma autenticidad pericial.

## Resultado global

| Caso | Estado | Evidencia |
|---|---|---|
| E2E-VIN-01 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-VIN-02 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-VIN-03 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-VIN-04 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-VIN-05 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-VIN-06 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |

Un caso solo pasa a aprobado con ejecución sobre commit identificado y resultado coincidente. Un caso bloqueado/diferido no cuenta como aprobado. El cierre del milestone valida diseño y trazabilidad de esta matriz, no el software futuro.
