# Subíndices libres configurables por sección — Tareas

**Spec aprobado:** `spec.md` versión 0.1  
**Plan:** `plan.md` versión 0.1  
**Estado:** En ejecución

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Puede ir en paralelo con | Dueño |
|---|---|---|---|---|
| T-01 | RF-SUB-001, RF-SUB-005 | Ninguna (ADR-0043 vigente) | Ninguna | Coordinador |
| T-02 | RF-SUB-001..006 | T-01 | Ninguna | Coordinador |
| T-03 | RF-SUB-001..003 | T-02 | T-04 | Coordinador |
| T-04 | RF-SUB-004..007 | T-02 | T-03 | Coordinador |

## T-01 — Modelo de dominio y contratos de aplicación

**Objetivo:** Crear `SubindiceSeccion`, agregar `SubindiceSeccionId` a las 5 entidades multi-registro y definir DTOs e interfaz de configuración.  
**Área y rama:** Backend (`Domain`, `Application`); `feature/171-subindices-configurables-seccion`  
**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/*`, `src/Backend/src/Istpet.ActualizacionDatos.Application/**`, `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/**`  
**Entrada/contrato:** `ADR-0043` y `spec-0021`  
**Salida para integración:** Entidades compilables, contratos DTO e invariantes probadas en unitarias.  
**Dependencias:** Ninguna  
**ADR aplicable:** `ADR-0043` (`docs/decisiones/ADR-0043-subindices-configurables-por-seccion.md`)  
**Responsable:** Coordinador

- [x] Implementar `SubindiceSeccion` y vínculo en entidades multi-registro.
- [x] Crear pruebas unitarias de invariantes y alcance por `TipoFuncionario`.
- [x] Ejecutar `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests`.

**Resultado registrado:** Verificado en compilación y suite unitaria de dominio.  
**Bloqueos:** Ninguno

## T-02 — Persistencia EF Core, migración, servicios, endpoints y cliente OpenAPI

**Objetivo:** Persistir `subindices_seccion` y `subindice_seccion_id`, exponer `/api/configuracion/subindices`, validar completitud al enviar y regenerar `openapi/v1.json` + cliente Angular.  
**Área y rama:** Backend (`Infrastructure`, `WebApi`) + `openapi/v1.json` + `src/Frontend/src/app/api-client`; `feature/171-subindices-configurables-seccion`  
**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/**`, `src/Backend/src/Istpet.ActualizacionDatos.WebApi/**`, `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/**`  
**Entrada/contrato:** Salida de T-01  
**Salida para integración:** Migración EF Core, API REST operativa y cliente TypeScript NSwag actualizado.  
**Dependencias:** T-01  
**ADR aplicable:** `ADR-0003`, `ADR-0004`, `ADR-0028`, `ADR-0043`  
**Responsable:** Coordinador

- [x] Configurar `SubindiceSeccionConfiguracion`, columnas en `SeccionesHojaDeVidaConfiguracion` y generar migración EF Core.
- [x] Implementar CRUD en `ServicioConfiguracionHojaDeVida`, asociación/estado en `ServicioHojaDeVida`, `ReglaSubindicesSeccionObligatorios` y `ServicioSecciones`.
- [x] Mapear `/api/configuracion/subindices`, compilar en `Debug` para regenerar OpenAPI/NSwag y agregar pruebas de integración.

**Resultado registrado:** Verificado con pruebas unitarias e integración PostgreSQL (Testcontainers).  
**Bloqueos:** Ninguno

## T-03 — Interfaz de administración de subíndices por sección

**Objetivo:** Permitir al administrador institucional gestionar subíndices libres por sección desde «Configuración de Requisitos».  
**Área y rama:** Frontend (`src/Frontend`); `feature/171-subindices-configurables-seccion`  
**Archivos exclusivos:** `src/Frontend/src/app/features/admin/configuracion/subindices-seccion-config.component.ts`, `subindices-seccion-config.component.spec.ts`, `configuracion-requisitos.component.ts`  
**Entrada/contrato:** Cliente NSwag generado en T-02  
**Salida para integración:** Pestaña «7. Subíndices por Sección» funcional y probada.  
**Dependencias:** T-02  
**ADR aplicable:** `ADR-0043`  
**Responsable:** Coordinador

- [x] Crear `SubindicesSeccionConfigComponent` con filtro por sección, formulario libre, obligatoriedad, orden, tipo de funcionario y desactivación.
- [x] Integrar pestaña en `ConfiguracionRequisitosComponent` y crear pruebas unitarias Vitest.

**Resultado registrado:** Verificado con `pnpm --dir src/Frontend test:ci` y `pnpm --dir src/Frontend build`.  
**Bloqueos:** Ninguno

## T-04 — Interfaz de carga diferenciada del usuario y revisión del supervisor

**Objetivo:** Mostrar subíndices requeridos/opcionales y selector de clasificación en las 4 secciones del usuario, y visualizar subíndices e incumplimientos en el expediente del supervisor.  
**Área y rama:** Frontend (`src/Frontend`); `feature/171-subindices-configurables-seccion`  
**Archivos exclusivos:** `src/Frontend/src/app/features/usuario/hoja-de-vida/**`, `src/Frontend/src/app/features/supervisor/revision/expediente-secciones.component.ts`  
**Entrada/contrato:** `HojaDeVidaDto.subindicesSeccion` y `subindiceSeccionId` en DTOs de ítems  
**Salida para integración:** Carga diferenciada por subíndice en usuario y visualización en supervisor.  
**Dependencias:** T-02  
**ADR aplicable:** `ADR-0043`  
**Responsable:** Coordinador

- [x] Crear componente reutilizable de bloque de subíndices por sección y añadir selector/etiquetas en Formación Académica, Experiencia Laboral, Capacitaciones y Referencias.
- [x] Mostrar insignias de subíndice y faltantes en `ExpedienteSeccionesComponent`.
- [x] Ejecutar `pnpm --dir src/Frontend test:ci`, `lint`, `format:check` y `build`.

**Resultado registrado:** Verificado con suite completa de frontend y pruebas de integración.  
**Bloqueos:** Ninguno

## Integración y cierre

- [x] El coordinador revisó cada diff y comprobó la evidencia de cada tarea.
- [x] Se resolvieron dependencias y conflictos sin cambiar el spec aprobado.
- [x] Se ejecutaron las pruebas apropiadas de backend y frontend.
- [x] Se ejecutó `test-e2e.md` y se registraron resultados por escenario.
- [x] El cambio se integra mediante PR a `develop`, con título `<tipo>: <resumen en minúsculas>`.
- [x] Solo los requisitos con evidencia integrada y prueba satisfactoria pasan a `Implementado`.
