# Backlog posterior a la planificación de vacaciones

**Origen:** specs 0022–0025 v0.1 y sus planes/tareas/pruebas v0.1, preparados después de la [aprobación comunicada](aprobacion.md). **Alcance:** Modo A. **Estado:** descomposición preparada; implementación no iniciada.

El solicitante autorizó continuar hasta completar y cerrar #182, incluida la preparación/publicación del backlog derivado de #187. Los issues siguientes quedan fuera del milestone 3 de planificación. La autorización documental no resuelve ADR Propuestos ni los datos de activación institucional; se conserva el bloqueo de las tareas dependientes. Los casos positivos B se difieren y no generan tareas de implementación A.

| Entrega | Tareas de origen | Dependencias | Resultado verificable | Seguimiento |
|---|---|---|---|---|
| E0 — decisiones antes de implementación | T-MAR-00, T-VIN-00, T-SAL-00, T-ACT-00 | Aprobación funcional ya comunicada | Decisiones de ADR-0044/0045/0046 por responsable técnico; facultades, método/evidencia, retención, plantilla/numeración y validaciones respaldadas por institución; o bloqueo explícito | [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) — abierto; ejecución pendiente |
| E1 — marco y facultades | T-MAR-01, T-MAR-02 | E0 | Solo Modo A, configuración pendiente distinta de confirmada y permisos por servidor | [#190](https://github.com/IstpetDev/actualizacion_datos/issues/190) — abierto; ejecución pendiente |
| E2 — vínculo e historia | T-VIN-01, T-VIN-02 | E0, E1 | Fuentes/certificación de fecha y cargo por institución; sin inferir saldo ni antigüedad | [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191) — abierto; ejecución pendiente |
| E3 — períodos y eventos | T-SAL-01, T-SAL-02 | E0, E2 | Período/rango/días/retorno respaldados, validación de solapes, advertencia sin saldo | [#192](https://github.com/IstpetDev/actualizacion_datos/issues/192) — abierto; ejecución pendiente |
| E4 — emisión PDF | T-ACT-01 | E0, E3 | Instantánea, número/versión, archivo privado y reimpresión con bytes idénticos | [#193](https://github.com/IstpetDev/actualizacion_datos/issues/193) — abierto; ejecución pendiente |
| E5 — firma e historia | T-ACT-02 | E0, E4 | Verificación física, observación, pérdida de evidencia y corrección/anulación sin sobrescribir | [#194](https://github.com/IstpetDev/actualizacion_datos/issues/194) — abierto; ejecución pendiente |
| E6 — recorrido integrado | T-ACT-03 e integración de las UI previas | E1, E2, E3, E4, E5 | Persona trabajadora/TH/operador, aislamiento, errores/concurrencia/recuperación y 23 escenarios trazados con diferimientos B explícitos | [#195](https://github.com/IstpetDev/actualizacion_datos/issues/195) — abierto; ejecución pendiente |

## Reglas comunes de los issues posteriores

Cada issue enlaza tareas, requisitos, escenarios y E2E, detalla rutas desde el plan, dependencias, aceptación y comprobaciones. Una modificación API incluye OpenAPI y cliente NSwag en el mismo PR. Se usa rama desde develop y PR a develop, sin ejecutar producción en #182. No se comparte edición simultánea de migraciones, DbContext, Program, registro DI ni cliente generado. E6 integra rutas/menú después de contratos estables.

No se cierran estos issues al cerrar planificación: requieren implementación y evidencia real propia. Si una decisión cambia el alcance funcional, vuelve a revisión antes de ejecutar. Los planes no dan por vigente una norma ni por certificado un dato ausente; G0/E0 conserva esa puerta de activación.
