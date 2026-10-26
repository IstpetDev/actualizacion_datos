# Tipos institucionales base — Plan de implementación

**Spec aprobado:** `spec.md` v0.1, 2026-10-26; «continua con lo que propones».

**Objetivo:** catálogos iniciales sin sobrescrituras, pantalla sin clasificación docente y orden sugerido.

**Áreas y tecnologías:** backend .NET 10 / EF Core / PostgreSQL; frontend Angular 22 / Vitest. Se reutilizan servicios y contratos existentes, sin dependencias nuevas.

## Correspondencia y mapa de archivos

| Requisito / escenario | Diseño y ruta desde la raíz | Tarea | Verificación |
|---|---|---|---|
| RF-TIP-001, escenario 1 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/SemillaTiposInstitucionales.cs` agrega entidades; `Servicios/ServicioInstituciones.cs` confirma todo con un guardado | T-01 | V-01 alta real por HTTP y fallo atómico |
| RF-TIP-002 y 003, escenario 2 | Misma semilla con consulta explícita por institución y entidades locales; nueva migración en `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/` para completar instituciones existentes | T-01 | V-02 SQLite y PostgreSQL: repetición, personalización, aislamiento y migración |
| RF-TIP-004, escenario 3 | `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts`: recalcular al cargar lista y reiniciar; mantener orden al editar | T-02 | V-03 pruebas de componente con respuesta asíncrona |
| RF-TIP-005, escenario 4 | Mismo componente: retirar check y columna; preservar valor interno en solicitudes existentes | T-02 | V-04 DOM y solicitudes de edición/desactivación |
| RF-TIP-006 | ADR-0019 y ADR-0020 registrados y vigentes con aprobación funcional | T-00 | V-05 revisión documental y etiqueta `decision` de #80 |

Las pruebas se agregan en `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/SemillaTiposInstitucionalesTests.cs`, `Integracion/SemillaTiposInstitucionalesIntegracionTests.cs` y `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.spec.ts`.

## Diseño, contratos y migración

El servicio institucional prepara la semilla antes de su `SaveChangesAsync` existente. La semilla consulta solo la institución solicitada, aun cuando deba omitir filtros para el alta desde superadmin; no guarda por cuenta propia. Las claves únicas existentes impiden códigos duplicados. No se modifica el modelo, dominio, contratos ni cliente público; una compilación Debug verifica su regeneración sin diferencias.

La migración contiene SQL PostgreSQL inmutable con los valores aprobados; `ON CONFLICT (institucion_id, codigo) DO NOTHING` conserva los existentes, incluso inactivos. Su reversión conserva los datos para no eliminar personalizaciones o referencias. Se prueba migrando desde la versión anterior con una institución parcial y ejecutando nuevamente el SQL.

## ADR aplicables

| Decisión | ADR | Estado | Dependencias |
|---|---|---|---|
| Aislamiento | ADR-0004 | Vigente | T-01 |
| Tipos y requisitos | ADR-0010 | Vigente | T-01 |
| Lista, inicialización y migración | ADR-0019 | Vigente, aprobación de spec v0.1 | T-01 |
| Retirada del control | ADR-0020 | Vigente, aprobación de spec v0.1 | T-02 |

## Orden, riesgos y comprobación

T-00 precede a T-01 y T-02; se ejecutan secuencialmente por el agente coordinador. T-03 integra y valida todos los cambios. No se usan subagentes. Los archivos de contrato no requieren edición. Si `develop` avanza, se integra sin reescribir historial y se repiten los checks afectados sobre el HEAD final.

Riesgos: divergencia entre datos de migración y alta (comparación en PostgreSQL); reinicio del orden antes de recibir la lista actualizada (prueba con respuesta diferida); edición que borre `EsDocente` (prueba de solicitudes). No quedan decisiones funcionales abiertas.

- [x] Rutas y tecnologías revisadas.
- [x] ADR registrados antes de implementar.
- [x] Todos los requisitos tienen tarea y verificación.
- [x] Pruebas de HTTP, persistencia real y componente cubren límites distintos.
