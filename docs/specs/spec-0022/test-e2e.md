# Marco y régimen — Pruebas de punta a punta

**Spec aprobado:** [spec.md](spec.md) v0.2, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md) y [decisiones E0 de #189](../../evidencia/issue-189/README.md). **Plan:** [plan.md](plan.md) v1.0.

**Responsable de ejecución:** desarrollador/revisor asignado al issue [#190](https://github.com/IstpetDev/actualizacion_datos/issues/190) / [#195](https://github.com/IstpetDev/actualizacion_datos/issues/195). **Ambiente:** prueba local o staging aislado con Angular, API real y PostgreSQL; almacén privado de prueba. **Estado:** diseñado, puerta ADR/E0 resuelta en #189, pendiente de ejecución cuando se implemente el módulo.

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
| E2E-MAR-01 | RF-VAC-MAR-002, RF-VAC-MAR-006 | ESC-VAC-MAR-01 | T-MAR-01, T-MAR-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-MAR-02 | RF-VAC-MAR-001, RF-VAC-MAR-007 | ESC-VAC-MAR-02 | T-MAR-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-MAR-03 | RF-VAC-MAR-003 | ESC-VAC-MAR-03 | T-MAR-01 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |
| E2E-MAR-04 | RF-VAC-MAR-004, RF-VAC-MAR-005 | ESC-VAC-MAR-04 | T-MAR-02 | Modo A; componentes B señalados en el caso | UI/API, estado persistido y documento cuando aplique |

## E2E-MAR-01 — Sin régimen confirmado

**Precondición y datos ficticios:** A sin referencia de régimen ni cláusula confirmada. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Abrir disponibilidad y después intentar emitir un borrador.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Ver bloqueos de régimen/fuente, sin cifra de saldo; emisión denegada sin completar datos comunes. La dedicación parcial no determina elegibilidad automáticamente.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-MAR-02 — Instituciones independientes

**Precondición y datos ficticios:** Operador delegado solo en A; persona humana con registros en A/B. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Cambiar identificador de acta/vínculo a uno de B desde sesión A.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Denegación sin metadatos ni archivo ajenos; probar también admin sin delegación y superadmin sin facultad operativa.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-MAR-03 — Nueva revisión de fuente

**Precondición y datos ficticios:** Acta v1 emitida con revisión documental ficticia R1 y nueva revisión R2. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Registrar R2 autorizada y descargar de nuevo v1.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** El PDF v1 conserva bytes/hash/fuente R1; un borrador nuevo usa la revisión que corresponda. Rechazar intervalos incompatibles. No probar recálculo B como implementado.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## E2E-MAR-04 — Firma y exclusiones

**Precondición y datos ficticios:** Acta v1 emitida y firma pendiente. Actor con facultad de fixture para éxito; repetir sin facultad para el error aplicable.

**Pasos:**

1. Abrir sesión con actor/tenant del caso y comprobar estado inicial.
2. Descargar, recibir un escaneo ficticio e intentar registrar una licencia como vacaciones.
3. Consultar nuevamente por API y UI; verificar persistencia y ausencia de modificación indebida. Si hay PDF, conservar bytes/hash, no una captura como prueba de inmutabilidad.

**Resultado esperado:** Firma sigue pendiente hasta verificación; el tipo de ausencia excluido se rechaza. No importar permisos al dominio de vacaciones.

**Resultado obtenido:** Pendiente de ejecución. **Evidencia:** al ejecutar, guardar commit, entradas sintéticas, respuesta/status, auditoría y consulta de base/archivo en expediente del issue futuro; sin secretos ni datos reales. **Fecha/ejecutor/incidencia:** pendientes; enlazar issue del [backlog](../../evidencia/issue-182/backlog.md).

## Verificaciones de otros niveles

Unitarias de dominio: invariantes de intervalo y transiciones, sin reemplazar recorrido real. WebApi con PostgreSQL: permisos en servidor, persistencia, concurrencia y reintentos; usar clases propuestas en plan. Pruebas Angular: errores/presentación, sin afirmar que un doble de API prueba el backend. PDF: legibilidad y contenido ficticio, hash sobre bytes conservados y doble firma en blanco; un PDF válido sintácticamente no acredita la corrección jurídica. Ejecución física del papel se representa con material sintético; no se afirma autenticidad pericial.

## Resultado global

| Caso | Estado | Evidencia |
|---|---|---|
| E2E-MAR-01 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-MAR-02 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-MAR-03 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |
| E2E-MAR-04 | Pendiente de ejecución; componentes B diferidos según caso | No hay ejecución del módulo en #182 |

Un caso solo pasa a aprobado con ejecución sobre commit identificado y resultado coincidente. Un caso bloqueado/diferido no cuenta como aprobado. El cierre del milestone valida diseño y trazabilidad de esta matriz, no el software futuro.
