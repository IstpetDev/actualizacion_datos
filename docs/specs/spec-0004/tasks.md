# Tipos institucionales base — Tareas

**Spec aprobado:** v0.1. **Plan:** `plan.md`. **Estado:** Implementación y verificación local completadas; integración pendiente.

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

- [x] Cubrir con pruebas la ausencia de tipos, las repeticiones y el fallo de persistencia.
- [x] Implementar semilla idempotente y alta atómica.
- [x] Generar migración con datos inmutables y probarla en PostgreSQL.
- [x] Ejecutar `dotnet test src/Backend --filter FullyQualifiedName~SemillaTiposInstitucionales` y revisar RF-TIP-001 a 003.

## T-02 — Formulario y orden

**Archivos exclusivos:** componente de configuración y su `.spec.ts`. **Contrato:** misma API y atributo docente conservado. **Salida:** formulario sin control docente; orden siguiente al máximo. **ADR:** ADR-0020.

- [x] Reproducir con pruebas la sugerencia incorrecta y el control visible.
- [x] Implementar RF-TIP-004 y 005, incluida recarga asíncrona.
- [x] Ejecutar `corepack pnpm --dir src/Frontend test:ci`.

## T-03 — Integración y cierre

- [x] Revisar diff y coherencia de semilla/migración.
- [x] Ejecutar compilación, pruebas completas, formato y lint; registrar salida real en `docs/evidencia/issue-80.md`.
- [x] Ejecutar los recorridos de `test-e2e.md` e identificar qué nivel cubre cada requisito.
- [ ] Crear PR hacia `develop`, resolver conflictos y comprobar CI en el HEAD final.
- [ ] Intentar aprobación, integrar cuando se cumplan criterios y cerrar #80 sin comentarios adicionales.

**Bloqueos:** Ninguno; ampliación v0.2 aprobada. **Resultado registrado:** `docs/evidencia/issue-80.md`; código en `ac22381` y `74d377d`.

## Ampliación v0.2 aprobada

ADR-0021 y ADR-0022 registrados antes de implementación. Responsable único: coordinador. Sin bloqueos funcionales; el cierre ya está autorizado al cumplir todos los criterios.

- [x] T-04 (RF-CAT-004, 005, 010): extraer solo tablas de organizaciones de fuentes oficiales; generar Banco e InstitutosSuperiores, documentar códigos y hashes; verificar colisiones.
- [x] T-05 (RF-CAT-002, 003, 006): generalizar cargador, validar manifiesto y relaciones, agregar comando y comprobación Production; cubrir errores y repetición con tests.
- [x] T-06 (RF-CAT-001, 002): publicar contenido, construir imagen desde raíz con contexto limitado, incorporar etapa de carga y filtro CI; validar Docker, actionlint, shellcheck y scripts.
- [x] T-07 (RF-CAT-007 a 009): preparar base y cuentas ficticias; ejecutar navegador con API real, ficha, títulos/IES/otra institución, becas y bancos; conservar script y capturas.
- [ ] T-08: compilar y probar todo, registrar evidencia, resolver conflictos, actualizar título y descripción del PR al alcance final, verificar CI, intentar aprobar e integrar y cerrar #80 sin comentarios.
