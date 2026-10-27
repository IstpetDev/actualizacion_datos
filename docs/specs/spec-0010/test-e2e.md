# Liberación de secciones de la hoja de vida por fases — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.2 (2026-10-27)  
**Plan:** `plan.md` versión 0.1  
**Responsable de ejecución:** Por asignar  
**Ambiente:** local con Docker (API, PostgreSQL y frontend)

## Preparación

Commit de la rama de la feature al ejecutar. Servicios: API, PostgreSQL y Angular. Datos ficticios únicamente (documento `0000000000`, correo `usuario@ejemplo.test`). Restaurar recreando la base de pruebas. Ninguna integración externa.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| Institución de prueba | Un `admin`, un `supervisor` y tres personas ficticias | Campaña abierta; todas las secciones abiertas (estado tras la migración) |
| Segunda institución | Otro `admin` y una persona | Para aislamiento |

## Matriz de cobertura

| Caso | Requisito y escenario | Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | RF-SEC-001, 002, 004, 005, 006; escenario 1 | T-02 a T-08 | éxito | Con solo la ficha abierta, la persona ve solo la ficha, la API rechaza las demás y el envío exige solo la ficha |
| E2E-02 | RF-SEC-008, 011; escenario 2 | T-02, T-04 | límite | Abrir formación no cambia el estado de quien envió o fue aprobado; quien está en borrador debe completarla; queda auditado |
| E2E-03 | RF-SEC-007, 009; escenario 3 | T-01, T-03, T-08 | éxito y error | Cerrar referencias conserva los datos y reabrir los devuelve; cerrar la ficha se rechaza |
| E2E-04 | RF-SEC-003, 012 | T-02 | permiso | `usuario` y `supervisor` no pueden cambiar; otro `admin` no ve ni cambia; el `superadmin` puede por la API |
| E2E-05 | RF-SEC-006 | T-04 | regresión | Con todas abiertas, el envío completo sigue funcionando igual que antes del cambio |
| E2E-06 | RF-SEC-010 | T-06, T-08 | éxito | El avance por sección refleja a las personas que la completaron, solo de la institución |
| E2E-07 | RF-SEC-013 | T-01 | migración | Tras migrar, todo sigue abierto y los datos existentes no cambian |
| E2E-08 | PD-SEC-04 | T-05 | éxito | El supervisor ve lo ya cargado de una sección cerrada y el Excel y el `.zip` lo incluyen |

## E2E-01 — Primera fase: solo la ficha

**Precondición:** `admin` con sesión; todas las secciones abiertas; persona A sin enviar.  
**Datos:** documento `0000000000`, correo `usuario@ejemplo.test`.  
**Pasos:**

1. El `admin` cierra las seis secciones que no son la ficha.
2. La persona A entra: ve solo la pestaña de ficha.
3. Una llamada directa a la API de formación, experiencia y cuenta bancaria responde 409.
4. La persona A completa la ficha y envía.

**Resultado esperado:** la persona ve solo la ficha; las escrituras de las cerradas se rechazan; el envío valida solo la ficha y se acepta.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** Pendiente  
**Fecha y ejecutor:** Pendiente  
**Incidencia:** Ninguna

## E2E-02 — Abrir la siguiente sección

**Precondición:** persona A con actualización enviada; persona B en borrador; solo la ficha abierta.  
**Pasos:**

1. El `admin` abre «Formación académica».
2. Consultar el estado de A y de B.
3. B completa formación y envía; A queda pendiente de la sección nueva.

**Resultado esperado:** A conserva su estado; B ve la sección y debe completarla; la auditoría registra la apertura sin datos personales.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** Pendiente  
**Fecha y ejecutor:** Pendiente  
**Incidencia:** Ninguna

## E2E-03 a E2E-08

Se redactan con este mismo formato antes de ejecutarse, siguiendo la matriz: precondición, datos ficticios, pasos, resultado esperado, evidencia y fecha.

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 a E2E-08 | Pendiente | Pendiente | Ninguna |

Un recorrido solo se marca aprobado cuando se ejecutó sobre la versión declarada y su resultado coincide con el esperado. Un caso bloqueado no cuenta como aprobado.
