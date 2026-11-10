# Períodos, calendario y registro sin saldo — Pruebas de punta a punta

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md). **Plan:** [plan.md](plan.md) v0.1.

**Responsable de ejecución:** desarrollador/revisor asignado al issue futuro. **Ambiente:** prueba local o staging aislado con Angular, API real y PostgreSQL; almacén privado de prueba. **Estado:** diseñado, pendiente de ejecución; #182 no implementa ni prueba el módulo.

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
| E2E-SAL-01 | RF-VAC-SAL-001, RF-VAC-SAL-003 | ESC-VAC-SAL-01 | T-SAL-01, T-SAL-D01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-SAL-02 | RF-VAC-SAL-002, RF-VAC-SAL-003 | ESC-VAC-SAL-02 | T-SAL-02, T-SAL-D01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-SAL-03 | RF-VAC-SAL-001, RF-VAC-SAL-003 | ESC-VAC-SAL-03 | T-SAL-01, T-SAL-D01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-SAL-04 | RF-VAC-SAL-004 | ESC-VAC-SAL-04 | T-SAL-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-SAL-05 | RF-VAC-SAL-006 | ESC-VAC-SAL-05 | T-SAL-D01 | Negativo A; aceptación positiva B diferida | UI/API, estado persistido y documento cuando aplique |
| E2E-SAL-06 | RF-VAC-SAL-005, RF-VAC-SAL-007, RF-VAC-SAL-009 | ESC-VAC-SAL-06 | T-SAL-01, T-SAL-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-SAL-07 | RF-VAC-SAL-007, RF-VAC-SAL-008 | ESC-VAC-SAL-07 | T-SAL-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |

## E2E-SAL-01 — Ingreso reciente y límites

**Precondición y datos ficticios:** Ingreso nativo ficticio 2026-03-10; período certificado [2026-03-10,2027-03-10). Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Crear período con respaldo y consultar límites, repetir con ciclo institucional y ancla 29 de febrero sin regla.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Período independiente del disfrute; no nace saldo/devengo. Caso bisiesto sin resolución queda pendiente; cálculo proporcional y apertura cero de B se difieren.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-SAL-02 — Acta sin saldo

**Precondición y datos ficticios:** Ingreso 2010-01-01 y período verificado, sin corte, días manuales respaldados. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Preparar evento y acta A, consultar disponibilidad e intentar seleccionar B.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Pantalla/PDF declaran saldo no certificado, sin cifra remanente. No se activa B ni se genera crédito desde 2010; conversión A/B se difiere.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-SAL-03 — Reingreso y régimen

**Precondición y datos ficticios:** Nuevo episodio certificado en A, previo sin cobertura y dos regímenes incompatibles propuestos. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Identificar período del nuevo episodio; intentar emisión sin resolver asignación contradictoria.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** No trasladar días del episodio previo ni inventar historia; contradicción bloquea emisión/cálculo. Cargo y continuidad proceden de certificación.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-SAL-04 — Feriados, empalme y retorno

**Precondición y datos ficticios:** Fixture de calendario con fecha repetida, rango que termina viernes y otro que inicia lunes. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Revisar rango/días certificados; intentar aplicar empalme sin regla y emitir sin retorno respaldado.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** No ampliar ni excluir por defecto; mostrar fuente de lo declarado y bloquear datos insuficientes. Cálculo aprobado futuro no descuenta una fecha dos veces; variante automática queda diferida si falta regla.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-SAL-05 — FIFO y bolsas diferidos

**Precondición y datos ficticios:** Fixture conceptual de 4 y 8 días y consumo 10; no hay Modo B. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Verificar ausencia de API/UI de consumo FIFO e indicadores de saldo exacto.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** No producir movimientos ni saldo 2. La partición 4+6, doble bolsa, anticipos y conservación aritmética quedan pendientes de implementación/aprobación B.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-SAL-06 — Solape y concurrencia

**Precondición y datos ficticios:** Evento activo 2026-12-01 a 2026-12-05 del mismo vínculo. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Confirmar otro 2026-12-05 a 2026-12-08, enviar dos confirmaciones concurrentes y acceder desde B.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Se rechaza solape inclusive y solo persiste una confirmación admisible; sin datos ajenos ni débitos. Idempotencia de consumo cuantificado B queda diferida.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-SAL-07 — Corrección y calendario posterior

**Precondición y datos ficticios:** Evento A y PDF emitido, nueva evidencia de fechas/calendario. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Autorizar rectificación y consultar original/sucesora; anular PDF e inspeccionar efectos.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Conservar historia y PDF original, revalidar solapes, sin devolver días ni generar compensaciones. La corrección contable de B queda diferida.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## Verificaciones de otros niveles

Unitarias de dominio: invariantes de intervalo y transiciones, sin reemplazar recorrido real. WebApi con PostgreSQL: permisos en servidor, persistencia, concurrencia y reintentos; usar clases propuestas en plan. Pruebas Angular: errores/presentación, sin afirmar que un doble de API prueba el backend. PDF: legibilidad y contenido ficticio, hash sobre bytes conservados y doble firma en blanco; un PDF válido sintácticamente no acredita la corrección jurídica. Ejecución física del papel se representa con material sintético; no se afirma autenticidad pericial.

## Resultado global

| Caso | Estado | Evidencia |
|---|---|---|
| E2E-SAL-01 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-SAL-02 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-SAL-03 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-SAL-04 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-SAL-05 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-SAL-06 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-SAL-07 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |

Un caso solo pasa a aprobado con ejecución sobre commit identificado y resultado coincidente. Un caso bloqueado/diferido no cuenta como aprobado. El cierre del milestone valida diseño y trazabilidad de esta matriz, no el software futuro.
