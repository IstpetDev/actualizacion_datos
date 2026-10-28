<<<<<<< HEAD
# Visibilidad de borradores y avance institucional para supervisores — Spec

**ID:** spec-0020; issue #143  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante en la petición de implementación del issue #143  
**Fecha:** 2026-10-28  
**Áreas:** `src/Backend`, `src/Frontend`

## Problema y resultado esperado

El supervisor institucional necesita visualizar a todo el personal (`RolUsuario.Usuario`)
de su institución en la bandeja de revisión, identificando con precisión quién no ha
iniciado la actualización, quién tiene un borrador en proceso, quién ya envió y quién
ha sido devuelto o aprobado. Además, requiere conocer el avance cuantitativo por sección
y poder inspeccionar lo registrado por el usuario en modo solo lectura, para realizar un
seguimiento proactivo previo al cierre de campaña.

Bajo ninguna circunstancia el supervisor podrá aprobar o devolver un expediente que no
haya sido enviado formalmente por el usuario.

## Fuentes y decisiones vigentes

- [Issue #143](https://github.com/IstpetDev/actualizacion_datos/issues/143): necesidad operativa, criterios de aceptación e investigación funcional.
- [ADR-0004](../../decisiones/ADR-0004-multitenancia-esquema-unico.md): aislamiento multi-institución estricto por tenant.
- [ADR-0008](../../decisiones/ADR-0008-granularidad-del-rechazo.md): observaciones y granularidad en revisiones.
- [ADR-0010](../../decisiones/ADR-0010-hoja-de-vida-estructurada.md): desglose estructurado de secciones de la hoja de vida.
- [ADR-0028](../../decisiones/ADR-0028-secciones-habilitadas-por-institucion.md): secciones activas y habilitadas por institución.
- [ADR-0040](../../decisiones/ADR-0040-visibilidad-de-borradores-y-avance-para-supervisores.md): visibilidad de borradores y cálculo de avance para supervisores.

## Alcance y requisitos verificables

| ID | Comportamiento observable | Fuente |
|---|---|---|
| RF-REV-001 | El supervisor consulta `/api/revision/pendientes` y obtiene a todas las personas de su institución (rol Usuario) con su estado efectivo (`Sin Iniciar`, `Borrador`, `Enviado`, `Devuelto`, `Aprobado`), total de secciones activas, secciones completadas y porcentaje de avance. | #143, criterio 1 |
| RF-REV-002 | Una persona en `EstadoActualizacion.Borrador` sin secciones guardadas ni tratamiento aceptado se expone como `Sin Iniciar` con avance 0%. Al guardar cualquier sección o aceptar tratamiento, su estado efectivo se actualiza automáticamente a `Borrador` y refleja el avance correspondiente. | #143, criterios 1 y 2 |
| RF-REV-003 | El supervisor puede consultar el expediente de una persona en `Sin Iniciar` o `Borrador` mediante `/api/revision/{documento}` y `/api/revision/{documento}/hoja-de-vida` en modo solo lectura. Cada lectura queda registrada en la tabla de auditoría (`ConsultaBorradorSupervisor`). | #143, criterio 3 |
| RF-REV-004 | Las operaciones `/api/revision/{documento}/aprobar` y `/api/revision/{documento}/devolver` rechazan cualquier solicitud en estado distinto de `Enviado` con error 400 (`ReglaNegocioException`). En la interfaz de usuario, los botones de aprobación y devolución se ocultan o deshabilitan si el estado no es `Enviado`. | #143, criterio 3 |
| RF-REV-005 | Se preserva el aislamiento multi-institucional: un supervisor que intente listar o consultar el expediente o archivos de una persona de otra institución recibe error 404 o lista vacía. | #143, criterio 4; ADR-0004 |

**Exclusiones:** No se altera el modelo relacional persistente de `EstadoActualizacion` en la base de datos (se mantiene compatible como enum de 4 valores). No se permite al supervisor editar los datos del usuario.

## Estados del proceso y capacidades del supervisor

| Estado Efectivo | Definición Técnica | Visibilidad en Bandeja | Consulta de Expediente | Acción Aprobar | Acción Devolver |
|---|---|---|---|---|---|
| **Sin Iniciar** | `EstadoActualizacion == Borrador` y sin ninguna sección con datos ni tratamiento aceptado. | Sí (Avance 0%) | Sí (Expediente en blanco, solo lectura) | Prohibido (400) | Prohibido (400) |
| **Borrador** | `EstadoActualizacion == Borrador` y con al menos una sección guardada o tratamiento aceptado. | Sí (Avance 1-99%) | Sí (Lectura auditada de datos parciales) | Prohibido (400) | Prohibido (400) |
| **Enviado** | `EstadoActualizacion == Enviado`. | Sí (Avance 100%) | Sí (Expediente completo para revisión) | Permitido | Permitido (con observaciones) |
| **Devuelto** | `EstadoActualizacion == Devuelto`. | Sí (En corrección) | Sí (Expediente e historial de observaciones) | Prohibido (400) | Prohibido (400) |
| **Aprobado** | `EstadoActualizacion == Aprobado`. | Sí (Aprobado) | Sí (Expediente finalizado en solo lectura) | Prohibido (400) | Prohibido (400) |

## Escenarios y criterios de aceptación

- [x] Persona sin datos registrada en la institución aparece en la bandeja con estado `Sin Iniciar` y avance en 0% (RF-REV-001, RF-REV-002).
- [x] Al guardar una sección (ej. Ficha Personal), la persona se visualiza como `Borrador` y el porcentaje de avance se actualiza (RF-REV-002).
- [x] El supervisor puede abrir y consultar el expediente de una persona en `Borrador` o `Sin Iniciar` sin recibir error 400, registrándose la auditoría correspondiente (RF-REV-003).
- [x] Al abrir un borrador en el panel de supervisor, los botones de aprobar y devolver no están operativos o se encuentran deshabilitados/ocultos; cualquier intento directo por API responde 400 Bad Request (RF-REV-004).
- [x] Consultas de supervisores hacia otra institución no retornan datos (RF-REV-005).

## Datos y seguridad

- Todos los ejemplos y pruebas utilizan datos ficticios (`1700000001`, `0912345678`, `usuario@ejemplo.test`).
- El acceso se audita exhaustivamente en cada consulta de borrador.
- El cálculo de avance no expone contraseñas ni datos sensibles.

=======
# Conservar parroquia al guardar la ficha personal — Spec

**ID:** spec-0020; issue #140  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante en issue #140  
**Fecha:** 2026-10-28  
**Áreas:** `src/Frontend`, `src/Backend`

## Problema y resultado esperado

Al seleccionar provincia, cantón y parroquia, la parroquia debe conservarse y persistir desde el primer intento de guardado sin quedar vacía. Al cambiar provincia o cantón, una selección previa de parroquia que ya no corresponda debe invalidarse de forma visible y evitar guardados vacíos sin aviso.

## Alcance y requisitos verificables

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-PAR-001 | Conservar parroquia al guardar y recargar desde el primer intento. | Seleccionar provincia, cantón y parroquia, guardar y recargar conserva las tres selecciones en el primer intento y subsecuentes. No borra la selección por recarga ni por sincronización asíncrona. |
| RF-PAR-002 | Invalidación visible al cambiar provincia o cantón. | Cambiar provincia o cantón invalida de forma visible una parroquia que ya no corresponda, mostrando error accesible en vez de persistir un valor vacío en silencio. |
| RF-PAR-003 | Persistencia y verificación en backend. | El backend persiste y retorna `ParroquiaResidenciaId` correctamente en la ficha personal y rechaza catálogos inválidos. |
| RF-PAR-004 | Cobertura de pruebas focalizadas. | Pruebas unitarias de frontend (`ficha-personal.component.spec.ts`) y backend (`HojaDeVidaTests.cs`) cubren la sincronización, persistencia e invalidación con datos ficticios. |

## Datos de prueba

Ubicaciones y nombres estrictamente ficticios (p. ej. Pichincha / Quito / Iñaquito ficticios con identificadores numéricos de prueba).
>>>>>>> origin/develop
