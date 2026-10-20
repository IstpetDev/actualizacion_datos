# <Nombre del cambio> — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión <versión>  
**Plan:** `plan.md` versión <versión>  
**Responsable de ejecución:** <nombre>  
**Ambiente:** <local, staging o ambiente de prueba>

## Preparación

Indica el commit del monorepo (`src/Backend` y `src/Frontend`), servicios necesarios,
cuentas de prueba, datos ficticios y forma de limpiar o restaurar el ambiente.
No uses datos personales reales: solo ficticios (documento `0000000000`, correo `usuario@ejemplo.test`). Anota las integraciones simuladas y las
reales; no presentes un doble como prueba de una integración externa.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| <API, base, identidad o catálogo> | <ruta, variable o servicio> | <dato ficticio> |

## Matriz de cobertura

| Caso | Requisito y escenario del spec | Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | <ID, Escenario 1> | <T-01> | <éxito, error o permiso> | <respuesta, estado o documento> |

Incluye recorrido principal, entradas inválidas, permisos y límites del
proceso. Si un requisito no se prueba de punta a punta, registra la prueba
de otro nivel que lo cubre y la razón.

## E2E-01 — <nombre del recorrido>

**Precondición:** <actor, permiso y estado del sistema>  
**Datos:** <valores ficticios reproducibles>  
**Pasos:**

1. <acción del usuario o llamada concreta>.
2. <respuesta visible y siguiente acción>.
3. <consulta del estado persistido o documento emitido>.

**Resultado esperado:** <valor observable y criterio de aceptación>  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** <comando y salida, captura anonimizada, log o enlace>  
**Fecha y ejecutor:** <fecha; nombre>  
**Incidencia:** <issue o Ninguna>

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 | Pendiente | <ruta o enlace> | <issue o Ninguna> |

Un recorrido solo se marca aprobado cuando se ejecutó sobre la versión
declarada y su resultado coincide con el esperado. Un caso bloqueado no
cuenta como aprobado.
