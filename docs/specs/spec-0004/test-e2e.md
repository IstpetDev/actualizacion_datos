# Tipos institucionales base — Verificación de recorridos

**Spec aprobado:** v0.1. **Plan:** `plan.md`. **Responsable:** agente coordinador. **Ambiente:** local y GitHub Actions.

## Preparación y límites

Backend por HTTP con `WebApplicationFactory` y SQLite aislada para altas y administración. PostgreSQL 17 efímero con Testcontainers para migración y SQL reales. Frontend con Angular TestBed/Vitest y API simulada; estas pruebas de componente no equivalen a un recorrido de navegador contra la API. Solo datos ficticios. La base de pruebas se elimina al finalizar; no se lee configuración de despliegue ni secretos. El commit probado y las salidas se registran en `docs/evidencia/issue-80.md`.

| Caso | Requisito / escenario | Tarea | Pasos y resultado esperado | Evidencia |
|---|---|---|---|---|
| V-01 | RF-TIP-001 / 1 | T-01 | Autenticar superadmin ficticio, crear institución por HTTP, consultar como admin y verificar 2 funcionarios, 6 documentos e instrucciones/vencimientos; fallo de guardado no deja datos parciales | Pruebas HTTP y persistencia SQLite |
| V-02 | RF-TIP-002 y 003 / 2 | T-01 | Migrar hasta versión previa, crear instituciones con catálogo parcial y tipos personalizados/inactivos; aplicar migración y repetir SQL; ejecutar semilla dos veces antes y después de guardar; confirmar códigos, valores y aislamiento | PostgreSQL real y pruebas del helper |
| V-03 | RF-TIP-004 / 3 | T-02 | Lista con órdenes 1, 4 y 7 (inactivo); proponer 8, crear, responder recarga diferida y proponer 9; cancelar recalcula, editar conserva 4; vacío propone 1 | Pruebas de componente; DOM y formularios |
| V-04 | RF-TIP-005 / 4 | T-02 | Abrir pestaña de funcionarios; verificar ausencia del check y columna docente; editar y desactivar DOCENTE conservando `true`; nuevo tipo envía `false` | Pruebas de componente y edición real por HTTP |
| V-05 | RF-TIP-006 | T-00 | Revisar ADR, aprobación y etiqueta `decision` del issue #80 | Revisión documental y consulta GitHub |

Las pruebas existentes de configuración cubren permisos de usuario/supervisor, duplicados e intentos entre instituciones. La migración y el guardado atómico se verifican en persistencia porque no existe una acción de usuario para repetir la semilla. No se agrega un endpoint de mantenimiento.

## Resultado global

| Caso | Estado | Resultado obtenido |
|---|---|---|
| V-01 | Aprobado | Alta HTTP, valores persistidos y fallo atómico; evidencia en `docs/evidencia/issue-80.md` |
| V-02 | Aprobado | SQLite y PostgreSQL real: repetición, preservación y aislamiento; misma evidencia |
| V-03 | Aprobado | Vitest y Chromium con API simulada; misma evidencia y capturas |
| V-04 | Aprobado | DOM y solicitudes en Vitest; edición HTTP; captura en Chromium |
| V-05 | Aprobado | Spec v0.1 aprobada y ADR registrados; etiqueta `decision` comprobada en #80 |

## Ampliación v0.2 aprobada — recorridos reales

- V-06 (RF-CAT-001/002): publicar/build Docker desde raíz; verificar 17 CSV y manifiesto. Con PostgreSQL efímero limpio, ejecutar `--migrar`, `--cargar-catalogos` y repetir; arrancar Production, comprobar salud y consultas autenticadas. Sin volúmenes de CSV de desarrollo ni descargas en ejecución.
- V-07 (RF-CAT-003/006): comprobar ids e inactivos; probar archivo ausente, hash incorrecto, CSV inválido y padre inexistente; comprobar fallo por CSV y recuperación. Vaciar un catálogo requerido o romper relación, verificar que Production falla antes de escuchar HTTP e identifica el faltante.
- V-08 (RF-CAT-007): Angular con API Production y PostgreSQL reales: persona ficticia, campaña abierta, país y etnia, provincia → cantón → parroquia filtrados; guardar y recargar ficha.
- V-09 (RF-CAT-005/008): comprobar universidades originales e institutos; guardar y recuperar títulos de tercer nivel con universidad, instituto y otra institución ficticia escrita; campos UNESCO dependientes y respaldo ficticio.
- V-10 (RF-CAT-004/009): opciones reales de beca/financiamiento y capacitación; banco y tipo de cuenta, cuenta solo ficticia y alternativa de banco escrito; confirmar respuesta enmascarada.
- V-11 (RF-CAT-010): manifiesto, fuentes oficiales y hashes; acciones externas fijadas por hash; permisos y contratos existentes conservados.

Resultados V-06 a V-11: aprobados; ejecución y límites registrados en `docs/evidencia/issue-80.md`. Las capturas de v0.1 con API simulada no aprueban estos recorridos.
