# <Nombre del cambio> — Spec

**ID:** <código o issue>  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** <nombre y rol de quien revisa esta versión>  
**Fecha:** <AAAA-MM-DD>  
**Áreas afectadas:** <`src/Backend`, `src/Frontend` o ambas>

## Problema y resultado esperado

Describe el proceso actual, el disparador del cambio y el resultado observable.
Indica qué persona usa la función y qué decisión necesita tomar.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Diseño o regla de negocio | <ruta y sección> | <identificador y regla> |
| Decisión funcional | <ruta y sección> | <decisión> |
| ADR | <ID, estado y `docs/decisiones/ADR-NNNN-nombre.md`> | <restricción arquitectónica> |
| Comportamiento existente | <ruta de código o prueba> | <evidencia> |

Separa lo confirmado de lo inferido. Una historia documentada no demuestra
que la función exista en el producto.
Si aún no hay ADR, escribe «Ninguno encontrado» e indica dónde buscaste
(`docs/decisiones/`); no inventes un ID ni una decisión. Un ADR «Propuesto»
no es una decisión: cítalo como punto abierto.

## Alcance

**Incluye:** <operaciones y actores cubiertos>  
**Excluye:** <operaciones, actores y versiones fuera de alcance>  
**Límites del proceso:** <cuándo empieza y termina; sistemas externos>

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| <RF-ÁREA-001> | Dado <estado>, cuando <acción>, el sistema <resultado medible>. | <valor o Sin priorizar> | <ruta y sección> |

No conviertas palabras como «rápido» o «seguro» en requisitos sin métrica y
condiciones de medición. Usa prefijos de área para evitar IDs ambiguos.

## Escenarios del proceso

### Escenario 1 — <nombre>

- **Actor y precondición:** <quién, permisos y estado inicial>.
- **Disparador:** <acción concreta>.
- **Secuencia:** <pasos visibles y respuestas del sistema>.
- **Resultado:** <estado persistido, documento emitido o rechazo>.
- **Variantes y errores:** <casos límite y mensajes esperados>.

## Datos, seguridad e integraciones

Indica datos capturados, quién puede verlos, cuándo se persisten, cómo se
auditan y qué sistema externo aporta cada dato. Para datos personales usa solo
ejemplos ficticios (por ejemplo, documento `0000000000`, correo
`usuario@ejemplo.test`). Declara las interfaces sin contrato como
puntos abiertos; no inventes endpoints ni responsables.

## Criterios de aceptación

- [ ] <criterio ligado a un ID de requisito y a un escenario>.
- [ ] <criterio de autorización o rechazo, si aplica>.
- [ ] <criterio de cierre, inmutabilidad o corrección, si aplica>.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| <PD-01> | <hecho documentado, sin resolverlo aquí> | <qué no puede diseñarse aún> | <rol o ADR-NNNN> |

Incluye aquí las decisiones de arquitectura nuevas que requieran un ADR;
el spec define la necesidad, sin anticipar la opción técnica elegida.

## Revisión funcional

**Versión revisada:** <versión>  
**Decisión:** Pendiente / Aprobado / Devuelto con ajustes  
**Aprobó:** <nombre y rol de quien aprueba esta versión>  
**Fecha y evidencia de aprobación:** <fecha y enlace, comentario o acta>  
**Ajustes solicitados:** <lista o Ninguno>

Solo una aprobación explícita de esta versión habilita la creación de
`plan.md`, `tasks.md` y `test-e2e.md`.
