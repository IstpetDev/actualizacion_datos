# Tipos institucionales base — Tareas

**Spec aprobado:** v0.1. **Plan:** `plan.md`. **Estado:** En ejecución.

**Rama:** `feature/80-semillas-tipos-institucionales`. **Responsable:** agente coordinador.

| Tarea | Requisitos | Depende de | Paralelismo | Responsable |
|---|---|---|---|---|
| T-00 Documentar aprobación y decisiones | RF-TIP-006 | Ninguna | Ninguno | Coordinador |
| T-01 Semilla y migración | RF-TIP-001 a 003 | T-00, ADR-0019 | Ninguno | Coordinador |
| T-02 Pantalla y sugerencia de orden | RF-TIP-004 y 005 | T-00, ADR-0020 | Ninguno | Coordinador |
| T-03 Verificación e integración | Todos | T-01 y T-02 | Ninguno | Coordinador |

## T-00 — Aprobación funcional y ADR

- [x] Registrar aprobación de spec v0.1 y ADR-0019/0020 antes de programar.
- [x] Crear plan, tareas y recorridos de verificación.

## T-01 — Semilla institucional y migración

**Archivos exclusivos:** helper de semilla, `ServicioInstituciones.cs`, nueva migración y pruebas backend indicados en `plan.md`.

**Contrato:** tipos y valores de spec v0.1; guardado único, sin nueva API. **Salida:** instituciones nuevas y existentes con datos base; personalizaciones conservadas. **ADR:** ADR-0019.

- [ ] Comprobar con pruebas el comportamiento ausente.
- [ ] Implementar semilla idempotente y alta atómica.
- [ ] Generar migración con datos inmutables y probarla en PostgreSQL.
- [ ] Ejecutar `dotnet test src/Backend --filter FullyQualifiedName~SemillaTiposInstitucionales` y revisar RF-TIP-001 a 003.

## T-02 — Formulario y orden

**Archivos exclusivos:** componente de configuración y su `.spec.ts`. **Contrato:** misma API y atributo docente conservado. **Salida:** formulario sin control docente; orden siguiente al máximo. **ADR:** ADR-0020.

- [ ] Reproducir con pruebas la sugerencia incorrecta y el control visible.
- [ ] Implementar RF-TIP-004 y 005, incluida recarga asíncrona.
- [ ] Ejecutar `corepack pnpm --dir src/Frontend test:ci`.

## T-03 — Integración y cierre

- [ ] Revisar diff y coherencia de semilla/migración.
- [ ] Ejecutar compilación, pruebas completas, formato y lint; registrar salida real en `docs/evidencia/issue-80.md`.
- [ ] Ejecutar los recorridos de `test-e2e.md` e identificar qué nivel cubre cada requisito.
- [ ] Crear PR hacia `develop`, resolver conflictos y comprobar CI en el HEAD final.
- [ ] Intentar aprobación, integrar cuando se cumplan criterios y cerrar #80 sin comentarios adicionales.

**Bloqueos:** Ninguno. **Resultado registrado:** Pendiente de implementación y verificación.
