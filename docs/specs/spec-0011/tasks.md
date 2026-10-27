# Aceptación de protección de datos — Tareas

**Spec y plan:** v0.2. **Estado:** Implementación y verificación local completadas; CI y contenido institucional se verifican en el PR. **Responsable:** agente coordinador único.
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
- [ ] T-04: contratos, regresión y evidencia locales verificados; publicación del PR y CI pendientes al registrar esta evidencia.
- [ ] Texto institucional autorizado y criterio legal acreditado; depende de la institución, no del agente.
- [ ] Todos los criterios satisfechos, CI final en verde y PR sin conflictos antes de aprobar/integrar y cerrar #99.
