# Aceptación de protección de datos — Verificación

**Spec y plan:** v0.2. **Responsable:** agente coordinador. **Ambiente:** local, SQLite y PostgreSQL efímero con Testcontainers; Angular con HTTP simulado. Sin datos reales.

Las pruebas nuevas de API usan la autenticación por cookie y el servicio real; no usan el doble de política de los tests anteriores. Se publican avisos cuyo contenido indica expresamente que son ficticios. PostgreSQL verifica la migración real, claves compuestas y concurrencia entre contextos. Los recorridos Angular verifican navegación, casilla explícita y errores; no se presentan como evidencia de integración externa.

| Caso | Escenarios y requisitos | Tareas | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| V-01 | E-PDP-01, 02, 13; RF-PDP-001, 003, 014 | T-02, 03 | Credenciales → clave → aviso → funciones; sesión restringida sin perfil | Aprobado; ver evidencia |
| V-02 | E-PDP-03, 04; RF-PDP-004 a 007 | T-01 a 03 | Casilla desmarcada; rechazo sin evidencia; aceptar conserva fecha entre sesiones | Aprobado; ver evidencia |
| V-03 | E-PDP-05, 08, 14; RF-PDP-006, 009 | T-01 a 03 | Nueva versión bloquea cookie existente; obsoleta no habilita; sin duplicados | Aprobado; ver evidencia |
| V-04 | E-PDP-06, 07; RF-PDP-008 | T-01 a 03 | Ausencia/error de lectura/guardado mantienen el bloqueo; reintentar/salir operan | Aprobado; ver evidencia |
| V-05 | E-PDP-09, 10; RF-PDP-002, 003, 013 | T-01, 02 | UI/API, archivos, revisión, exportación y rutas nuevas bloqueados; identidad institucional aislada | Aprobado; ver evidencia |
| V-06 | E-PDP-11, 12; RF-PDP-010 a 012 | T-01, 02 | Booleano legado insuficiente; envío usa aceptación vigente; endpoint sin versión no muta | Aprobado; ver evidencia |
| V-07 | Todos; RF-PDP-015 | T-04 | Compilación, pruebas, contratos generados, lint/formato y CI con resultados reales | Aprobado; CI del código en verde y comprobación del HEAD documental final antes del merge |
| V-08 | Criterio institucional; PD-PDP-01 | Institución | Fuente institucional y autorización del aviso identificadas | Confirmadas por el solicitante: documento físico firmado por Rectorado bajo su custodia; original no inspeccionado por el agente |

Preparación: sembrar instituciones ficticias A/B, personas con documento `0000000000` y roles distintos; publicar versiones ficticias con fechas UTC. Abrir clientes independientes por sesión. Provocar fallos de persistencia con interceptor de pruebas, sin alterar producción. Verificar tablas después de aceptar/rechazar y repetir solicitudes. Eliminar bases y archivos temporales al terminar. La ejecución exacta, nombres de pruebas y salidas se registran en `docs/evidencia/issue-99/README.md`.

Resultados reales y capturas en [docs/evidencia/issue-99](../../evidencia/issue-99/README.md). V-08 registra la confirmación institucional recibida del solicitante, no una prueba automática ni la inspección del original físico. La carga del aviso real corresponde al procedimiento de despliegue.
