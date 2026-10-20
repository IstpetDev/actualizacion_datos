# <Nombre del cambio> — Plan de implementación

**Spec aprobado:** `spec.md` versión <versión y evidencia>  
**Objetivo:** <resultado observable>  
**Áreas:** <`src/Backend`, `src/Frontend` o ambas>  
**Tecnologías:** <las presentes en el código, con versión cuando importa>

## Correspondencia con el spec

| Requisito o escenario | Decisión de diseño | Archivo (ruta desde la raíz) | Tarea | Verificación |
|---|---|---|---|---|
| <ID> | <cómo se cumplirá> | <ruta exacta> | <T-01> | <V-01 o prueba> |

Cada requisito aprobado debe tener una ruta hasta una tarea y una
verificación. Registra cualquier excepción con su motivo.

## Diseño y contratos

Describe el flujo entre actores, frontend, API, dominio (`Domain`, `Application`, `Infrastructure`, `WebApi`), persistencia y
sistemas externos. Define entradas, salidas, errores, permisos y estados.
Especifica los contratos antes de distribuir tareas que los consumen.

## ADR aplicables y por redactar

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| <tema> | <docs/decisiones/ADR-NNNN-nombre.md> | <Vigente, Propuesto o Pendiente> | <T-01> |

Para una decisión nueva, redacta y revisa el ADR en `docs/decisiones/`
antes de ejecutar sus tareas dependientes. Un ADR «Propuesto» lo cierra quien
desarrolla, no un agente de IA por su cuenta; registra el archivo y la decisión
resultante en el plan.

## Mapa de archivos

| Área | Crear o modificar | Responsabilidad | Depende de |
|---|---|---|---|
| <Backend o Frontend> | <ruta exacta> | <una función clara> | <contrato o tarea> |

## Datos y migración

Indica esquema, migraciones, compatibilidad con datos existentes y despliegue.
Declara el punto de confirmación que escribe en base de datos. Si no hay
cambio de datos, explica por qué.

## Orden de ejecución e integración

1. <contrato o infraestructura compartida que debe fijarse primero>.
2. <tareas independientes que pueden ejecutarse en paralelo>.
3. <integración, revisión y pruebas>.

Explica qué archivos son de edición exclusiva para cada tarea y dónde se
unen sus resultados. No repartas una misma migración o contrato entre dos
subagentes en paralelo.

## Riesgos y decisiones pendientes

| Riesgo o punto abierto | Efecto | Acción y responsable |
|---|---|---|
| <ID> | <impacto concreto> | <cómo y quién lo resuelve> |

## Comprobación del plan

- [ ] Las rutas y tecnologías coinciden con el código actual de `src/Backend` y `src/Frontend`.
- [ ] Los ADR vigentes se respetan y los nuevos tienen quién los redacte y una
      tarea condicionada antes de implementar la decisión.
- [ ] Cada requisito del spec está cubierto o tiene una excepción explicada.
- [ ] Las tareas tienen dependencias y límites de edición claros.
- [ ] Las pruebas de unidad, integración y E2E verifican comportamientos
      distintos y necesarios.
