# Aceptación de protección de datos — Tareas

**Spec y plan:** v0.2. **Estado:** Implementación verificada; aprobación rectoral confirmada por el solicitante. Integración y cierre sujetos al CI final. **Responsable:** agente coordinador único.
**Rama:** `feature/99-aceptacion-proteccion-datos`.

| Tarea | Resultado verificable y archivos exclusivos | Requisitos | Dependencia | Prueba |
|---|---|---|---|---|
| T-01 | Entidades de aviso/evidencia, contratos, servicio y migración PostgreSQL en las rutas de `plan.md`; publicación operativa | RF-PDP-004 a 009, 012 | ADR-0030 registrado y revisado | Dominio/servicio; claves, migración y concurrencia PostgreSQL |
| T-02 | Middleware, endpoint propio, sesión mínima, identidad institucional y envío sin duplicados | RF-PDP-001 a 004, 010, 011, 013 | T-01 | HTTP con cookies reales; bloqueo directo y suplantación |
| T-03 | Pantalla accesible, rutas/guards/interceptor y eliminación de aceptación duplicada en dashboard | RF-PDP-001, 007, 008, 014 | T-02 y contrato generado | Componentes/guards/interceptor Angular |
| T-04 | OpenAPI/cliente regenerados, regresión, evidencia, PR revisable | RF-PDP-015 y escenarios completos | T-01 a 03 | Build/test/backend/frontend, integración, lint/formato y CI |

Cada tarea crea pruebas de comportamiento, implementa el contrato acordado y entrega diff y salida real. No hay tareas paralelas ni subagentes. El registro de resultados queda en `docs/evidencia/issue-99/README.md`; no se marcan pruebas pendientes como aprobadas.

- [x] T-01 verificada.
- [x] T-02 verificada.
- [x] T-03 verificada.
- [x] T-04: contratos, regresión y evidencia verificados; PR #106 creado y CI del código en verde. Se verifica de nuevo su HEAD final antes de integrar.
- [x] Fuente y aprobación institucional confirmadas por el solicitante: documento físico firmado por Rectorado bajo su custodia; sin inspección independiente ni publicación del original por el agente.

El cierre se acredita con el estado de [PR #106](https://github.com/IstpetDev/actualizacion_datos/pull/106) y [issue #99](https://github.com/IstpetDev/actualizacion_datos/issues/99): verificar CI sobre el HEAD final, aprobar si GitHub lo permite, integrar sin conflictos y cerrar inmediatamente el issue sin comentarios adicionales.
