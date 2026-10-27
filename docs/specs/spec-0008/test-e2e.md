# Capacitaciones obligatorias de la institución — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.2 (2026-10-27)  
**Plan:** `plan.md` versión 0.2  
**Responsable de ejecución:** Por asignar  
**Ambiente:** local con Docker (API, PostgreSQL y frontend)

## Preparación

Commit de `feature/92-capacitaciones-obligatorias` al ejecutar. Servicios: API, PostgreSQL y Angular. Datos ficticios únicamente (documento `0000000000`, correo `usuario@ejemplo.test`); certificados de prueba: un PDF y una imagen pequeños sin datos reales. Restaurar el ambiente recreando la base de pruebas. Ninguna integración externa.

Requiere la sección «Capacitaciones» **abierta** (spec-0010); sin ella no se ejecutan E2E-01 a E2E-08.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| Institución de prueba | Una institución con un `admin`, un `supervisor` y tres personas ficticias | Campaña abierta; sección «Capacitaciones» abierta |
| Tipos de funcionario | «Docente» y «Administrativo» | Persona A: Docente; persona B: Administrativo; persona C: sin tipo |
| Segunda institución | Otra institución con su `admin` | Datos distintos, para aislamiento |

## Matriz de cobertura

| Caso | Requisito y escenario | Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | RF-CAP-001, 002, 003; escenario 1 | T-02, T-08 | éxito y error | Obligatorias creadas; nombre repetido rechazado; desactivar conserva certificados |
| E2E-02 | RF-CAP-004, 007, 008; escenario 2 | T-03, T-04, T-07 | éxito y bloqueo | Cada persona ve solo las que le aplican; el envío se bloquea si falta una |
| E2E-03 | RF-CAP-005, 006, 014; escenario 2 | T-03, T-07 | éxito y error | Certificado subido; la segunda sustituye; enviado rechaza cambios por la API |
| E2E-04 | RF-CAP-009; escenario 3 | T-05, T-07 | éxito | El supervisor ve el estado y devuelve con marca sobre una obligatoria |
| E2E-05 | RF-CAP-010, 011; escenario 4 | T-06, T-08 | éxito | Resumen, lista de pendientes y Excel con el estado |
| E2E-06 | RF-CAP-012; escenario 5 | T-02, T-04 | límite | Crear una obligatoria no cambia el estado de actualizaciones enviadas o aprobadas |
| E2E-07 | RF-CAP-013, 015 | T-02 a T-06 | permiso | Otro `admin` no ve ni modifica; `usuario` y `supervisor` no configuran |
| E2E-08 | RF-CAP-016 | T-10 | éxito y permiso | Vencida la campaña, el `admin` ve el borrador incompleto con marca y auditoría; el `supervisor` no |
| E2E-09 | RF-CAP-017 | T-04, T-07 | límite | Con «Capacitaciones» cerrada no se exige ni se muestra |
| E2E-10 | RF-CAP-005, 018 | T-03, T-05, T-07 | éxito y error | La persona vincula una capacitación existente; un supervisor o admin vincula por ayuda; no con actualización aprobada ni de otra institución; queda auditado |

## E2E-01 — El admin define las obligatorias

**Precondición:** `admin` con sesión; tipos «Docente» y «Administrativo».  
**Datos:** «Seguridad y salud en el trabajo» (todas, 20 horas) y «Didáctica activa» (solo Docente).  
**Pasos:**

1. Crear ambas desde Configuración de requisitos.
2. Intentar crear otra con el nombre «Seguridad y salud en el trabajo» (activa).
3. Desactivar «Didáctica activa» y consultar.

**Resultado esperado:** las dos se crean; el duplicado se rechaza con mensaje; al desactivar no se pierden certificados ya subidos.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** Pendiente  
**Fecha y ejecutor:** Pendiente  
**Incidencia:** Ninguna

## E2E-02 — La persona ve las suyas y el envío se bloquea

**Precondición:** personas A (Docente), B (Administrativo), C (sin tipo), con lo demás de RF-HDV-009 completo.  
**Datos:** las dos obligatorias de E2E-01.  
**Pasos:**

1. A abre «Capacitaciones»: ve las dos como pendientes. B ve una. C ve la de «todas».
2. A intenta enviar: se rechaza e indica cuáles faltan.
3. B y C suben su certificado y envían.

**Resultado esperado:** cada persona ve y se le exige solo lo que le aplica; B y C envían; A no.  
**Resultado obtenido:** Pendiente de ejecución  
**Evidencia:** Pendiente  
**Fecha y ejecutor:** Pendiente  
**Incidencia:** Ninguna

## E2E-03 a E2E-10

Se redactan con el mismo formato antes de ejecutarse, siguiendo la matriz. Cada caso declara precondición, datos ficticios, pasos, resultado esperado, evidencia y fecha. E2E-08 y E2E-09 dependen de la regla de borradores y del interruptor de spec-0010.

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 a E2E-10 | Pendiente | Pendiente | Ninguna |

Un recorrido solo se marca aprobado cuando se ejecutó sobre la versión declarada y su resultado coincide con el esperado. Un caso bloqueado no cuenta como aprobado.
