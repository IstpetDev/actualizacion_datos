# <Nombre del cambio> — Tareas

**Spec aprobado:** `spec.md` versión <versión>  
**Plan:** `plan.md` versión <versión>  
**Estado:** Preparado para implementación / En ejecución / Verificado

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Puede ir en paralelo con | Dueño |
|---|---|---|---|---|
| T-01 | <ID> | Ninguna | <T-02 o Ninguna> | <coordinador o subagente> |

Una tarea paralela debe tener contrato fijado y archivos de edición
separados. Si dos tareas modifican el mismo archivo, ordénalas o asigna la
integración al coordinador.
Si una tarea depende de un ADR nuevo, su estado debe ser «Bloqueada por ADR»
hasta que la decisión esté registrada y revisada en `docs/decisiones/`.

## T-01 — <resultado concreto>

**Objetivo:** <comportamiento que entrega>  
**Área y rama:** <Backend o Frontend; rama `feature/*`, `fix/*`, etc. según CONTRIBUTING.md>  
**Archivos exclusivos:** <rutas exactas para esta tarea>  
**Entrada/contrato:** <tipos, endpoint, esquema o decisión ya aprobada>  
**Salida para integración:** <archivo, API, componente o migración>  
**Dependencias:** <IDs o Ninguna>  
**ADR aplicable:** <ID y `docs/decisiones/ADR-NNNN-nombre.md`, o Ninguno>  
**Responsable:** <nombre o subagente>

- [ ] Crear una prueba que falle por el comportamiento ausente, cuando la
      tarea implemente una función o corrija un defecto.
- [ ] Implementar el cambio limitado a las rutas asignadas.
- [ ] Ejecutar <comando exacto de prueba o comprobación> y registrar el
      resultado esperado.
- [ ] Revisar que la salida cumple <ID de requisito y criterio de aceptación>.
- [ ] Entregar al coordinador diff, resultado de pruebas y riesgos restantes.

**Resultado registrado:** <pendiente / evidencia con fecha, commit o MR>  
**Bloqueos:** <decisión requerida o Ninguno>

## Integración y cierre

- [ ] El coordinador revisó cada diff y comprobó la evidencia de cada tarea.
- [ ] Se resolvieron dependencias y conflictos sin cambiar el spec aprobado.
- [ ] Se ejecutaron las pruebas apropiadas de backend y frontend.
- [ ] Se ejecutó `test-e2e.md` y se registraron resultados por escenario.
- [ ] El cambio se integra mediante PR a `develop`, con título `<tipo>: <resumen en minúsculas>`.
- [ ] Solo los requisitos con evidencia integrada y prueba satisfactoria
      pasan a `Implementado`.
