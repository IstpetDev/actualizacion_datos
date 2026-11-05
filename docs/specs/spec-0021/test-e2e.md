# Subíndices libres configurables por sección — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.1  
**Plan:** `plan.md` versión 0.1  
**Responsable de ejecución:** Agente coordinador  
**Ambiente:** Local automatizado con PostgreSQL real (Testcontainers) + Vitest Angular

## Preparación

Todos los datos empleados son estrictamente ficticios: institución `Institución Demo Subíndices`, administrador `0000000099` (`admin@ejemplo.test`), docente `0000000001` (`docente@ejemplo.test`) y administrativo `0000000002` (`administrativo@ejemplo.test`).

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| PostgreSQL 17 (Testcontainers) | `FabricaAplicacionPostgres` con migraciones EF Core aplicadas | Esquema limpio con nueva migración `20261105155233_AgregarSubindicesSeccion` |
| API .NET 10 + Cliente Angular | `openapi/v1.json` sincronizado con `src/Frontend/src/app/api-client` | Sin diferencias pendientes en Git |

## Matriz de cobertura

| Caso | Requisito y escenario del spec | Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | RF-SUB-001, RF-SUB-002, RF-SUB-003 (Escenario 1) | T-02, T-03 | Éxito, conflicto y baja lógica | Creación 201, duplicado 409, sección inválida 400 y desactivación 204 conservando vínculos |
| E2E-02 | RF-SUB-004, RF-SUB-005, RF-SUB-006 (Escenario 2) | T-02, T-04 | Carga diferenciada y bloqueo de envío | Faltante reportado antes de cargar subíndice obligatorio; envío permitido tras adjuntar ítem con respaldo; no aplica a otro `TipoFuncionario` ni en sección cerrada |
| E2E-03 | RF-SUB-007 (Escenario 3) | T-02, T-04 | Revisión por supervisor y compatibilidad previa | Expediente devuelve registros previos (`subindiceSeccionId = null`) intactos y registros nuevos con etiqueta de subíndice visible |

## E2E-01 — Configuración administrativa, unicidad y baja lógica

**Precondición:** Administrador autenticado en su institución con tipo de funcionario `DOCENTE`.  
**Datos:** Subíndices ficticios `Títulos de 3er Nivel`, `Títulos de 4to Nivel` y `Título SENESCYT` en sección `experiencia`.  
**Pasos:**
1. Enviar `POST /api/configuracion/subindices` con los subíndices libres para `DOCENTE`.
2. Intentar repetir el mismo nombre activo en la misma sección y alcance, e intentar crear uno en sección `ficha`.
3. Desactivar un subíndice con `DELETE /api/configuracion/subindices/{id}` tras haber vinculado un registro.

**Resultado esperado:** Respuestas `201 Created`, `409 Conflict` ante duplicado, `400 Bad Request` ante sección no soportada y `204 No Content` al desactivar manteniendo la referencia histórica.  
**Resultado obtenido:** Aprobado en suite de integración (`SubindicesSeccionTests` y `SubindicesSeccionIntegracionTests`) y suite unitaria (`SubindicesSeccionConfigComponent`).  
**Evidencia:** `dotnet test src/Backend --filter "FullyQualifiedName~SubindicesSeccion"` y `pnpm --dir src/Frontend test:ci`.  
**Fecha y ejecutor:** 2026-11-05; Agente coordinador  
**Incidencia:** Ninguna

## E2E-02 — Carga por subíndice del usuario y bloqueo de envío a revisión

**Precondición:** Persona `0000000001` con tipo `DOCENTE`, campaña abierta y subíndices obligatorios activos en `experiencia`.  
**Datos:** Experiencia ficticia en `Instituto Tecnológico Ficticio` con archivo PDF de respaldo asociado al subíndice obligatorio.  
**Pasos:**
1. Consultar `GET /api/mis-datos/hoja-de-vida` y verificar `subindicesSeccion` con estado `pendiente`.
2. Consultar `GET /api/mis-datos/hoja-de-vida/faltantes` y comprobar bloqueo por `experiencia.subindice.<id>`.
3. Registrar experiencia vinculada al subíndice con `archivoId` válido y volver a consultar faltantes; verificar además que cerrar la sección omite el bloqueo.

**Resultado esperado:** El estado del subíndice cambia a `cargado` y desaparece el faltante de completitud.  
**Resultado obtenido:** Aprobado en pruebas de integración (`SubindicesSeccionTests` y `SubindicesSeccionIntegracionTests`) y componentes de sección en Vitest.  
**Evidencia:** `dotnet test src/Backend --filter "FullyQualifiedName~SubindicesSeccion"` y `pnpm --dir src/Frontend test:ci`.  
**Fecha y ejecutor:** 2026-11-05; Agente coordinador  
**Incidencia:** Ninguna

## E2E-03 — Visualización en revisión del supervisor y compatibilidad retroactiva

**Precondición:** Expediente con un ítem previo sin subíndice (`null`) y un ítem nuevo asociado a subíndice obligatorio.  
**Datos:** Consulta `GET /api/revision/0000000001/hoja-de-vida` como `Supervisor` y renderizado de `ExpedienteSeccionesComponent`.  
**Pasos:**
1. Consultar hoja de vida para revisión.
2. Renderizar pestaña de la sección en `ExpedienteSeccionesComponent`.

**Resultado esperado:** Ambos ítems se listan sin error; el nuevo muestra la insignia del subíndice y los subíndices pendientes se destacan para revisión.  
**Resultado obtenido:** Aprobado en pruebas de integración y pruebas unitarias de `ExpedienteSeccionesComponent`.  
**Evidencia:** `dotnet test src/Backend --filter "FullyQualifiedName~SubindicesSeccion"` y `pnpm --dir src/Frontend test:ci`.  
**Fecha y ejecutor:** 2026-11-05; Agente coordinador  
**Incidencia:** Ninguna

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 | Aprobado | `SubindicesSeccionTests` y `SubindicesSeccionIntegracionTests` + `subindices-seccion-config.component.spec.ts` | Ninguna |
| E2E-02 | Aprobado | `SubindicesSeccionTests` y `SubindicesSeccionIntegracionTests` + specs de secciones de hoja de vida | Ninguna |
| E2E-03 | Aprobado | `SubindicesSeccionTests` y `SubindicesSeccionIntegracionTests` + `expediente-secciones.component.spec.ts` | Ninguna |
