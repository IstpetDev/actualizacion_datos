# Liberación de secciones de la hoja de vida por fases — Plan de implementación

**Spec aprobado:** `spec.md` versión 0.2 (2026-10-27, evidencia en «Revisión funcional»)  
**Objetivo:** el `admin` abre y cierra cada sección de la hoja de vida de su institución; las personas ven y escriben solo las abiertas; el envío exige solo lo de las abiertas.  
**Áreas:** `src/Backend` y `src/Frontend`  
**Tecnologías:** .NET 10 con Clean Architecture y EF Core con PostgreSQL, xUnit; Angular 22 con Vitest; cliente OpenAPI con NSwag.

## Correspondencia con el spec

| Requisito o escenario | Decisión de diseño | Archivo (desde la raíz) | Tarea | Verificación |
|---|---|---|---|---|
| RF-SEC-001, 002 | Endpoints para listar y cambiar el estado de las siete secciones de la institución del solicitante. | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/SeccionesEndpoints.cs`, `.../Application/Servicios/IServicioSecciones.cs`, `.../Infrastructure/Servicios/ServicioSecciones.cs` | T-02 | V-01 |
| RF-SEC-003, 012 | Autorización `admin` y `superadmin`; todo filtrado por la institución del token. | `.../WebApi/Endpoints/SeccionesEndpoints.cs` | T-02 | V-01 |
| RF-SEC-004 | `HojaDeVidaDto` incluye `seccionesAbiertas`; el frontend dibuja solo esas pestañas. | `.../Application/Modelos/ModelosHojaDeVida.cs`, `.../Infrastructure/Servicios/ServicioHojaDeVida.cs`, `src/Frontend/src/app/features/usuario/hoja-de-vida/hoja-de-vida.component.ts` | T-05, T-07 | V-02, V-06 |
| RF-SEC-005 | Todo servicio de escritura pregunta a `IServicioSecciones` antes de guardar; si está cerrada, `ReglaNegocioException` con mensaje claro. | `.../Infrastructure/Servicios/ServicioHojaDeVida.cs`, `ServicioDocumentosPersonales.cs`, `ServicioCuentaBancaria.cs`, `ServicioArchivos.cs` | T-03 | V-03 |
| RF-SEC-006 | Cada `IReglaCompletitudEnvio` declara su `Seccion`; el validador ignora las reglas de secciones cerradas. | `.../Application/Servicios/IValidadorCompletitudEnvio.cs`, `.../Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | T-04 | V-04 |
| RF-SEC-007 | Cerrar solo cambia el estado; no se borra ni se mueve nada. | `.../Infrastructure/Servicios/ServicioSecciones.cs` | T-02 | V-01 |
| RF-SEC-008 | Abrir una sección no toca `Persona.EstadoActualizacion`; la completitud se calcula al leer. | `.../Infrastructure/Servicios/ServicioSecciones.cs` | T-02 | V-01 |
| RF-SEC-009 | La ficha se trata siempre abierta en el dominio; cerrarla se rechaza. | `.../Domain/HojaDeVida/SeccionInstitucion.cs` | T-01 | V-05 |
| RF-SEC-010 | Avance = personas de la institución sin faltantes de las reglas de esa sección. | `.../Infrastructure/Servicios/ServicioSecciones.cs`, `src/Frontend/src/app/features/admin/configuracion/secciones.component.ts` | T-06, T-08 | V-01, V-07 |
| RF-SEC-011 | Cada cambio escribe en `IServicioAuditoria` sin contenido personal. | `.../Infrastructure/Servicios/ServicioSecciones.cs` | T-02 | V-01 |
| RF-SEC-013 | Sin fila = abierta; la migración solo crea la tabla vacía. | `.../Infrastructure/Persistence/Migrations/*` | T-01 | V-05 |
| PD-SEC-04 | La revisión del supervisor y la exportación no filtran por sección: lo ya cargado se sigue viendo y exportando. | `ServicioRevision.cs`, `ServicioExportacion.cs` (sin cambio de lógica; solo prueba de no regresión) | T-05 | V-04 |
| Escenarios 1 a 3 | Recorrido de punta a punta. | `docs/specs/spec-0010/test-e2e.md` | T-09 | V-08 |

## Diseño y contratos

**Dominio.** Enumeración `SeccionHojaDeVida` (ficha, formación, referencias, experiencia, capacitaciones, documentos, cuenta bancaria). Entidad `SeccionInstitucion : EntidadInstitucional` con sección, `Habilitada`, fecha y actor del último cambio. **Sin fila = abierta.** La ficha siempre cuenta como abierta.

**Servicio.** `IServicioSecciones` con `EstaAbiertaAsync(institucionId, seccion)`, `ListarAsync()` (estado y avance por sección), `CambiarAsync(seccion, habilitada)`. Una lectura por solicitud se cachea en el alcance de la solicitud.

**API (nombres provisionales, a fijar en T-02).**
- `GET /api/configuracion/secciones`: las siete secciones con estado y avance (solo `admin`, `superadmin`).
- `PUT /api/configuracion/secciones/{codigo}`: cuerpo `{ habilitada: bool }`.
- `GET /api/mis-datos/hoja-de-vida`: incluye `seccionesAbiertas`.

**Errores.** Escritura en sección cerrada: 409 con mensaje «La sección ya no está disponible.». Cerrar la ficha: 409. Sección inexistente: 404. Sin rol: 403.

**Permisos.** Cambiar: `admin` (su institución) y `superadmin` (por la API; sin pantalla en esta versión). Leer el estado propio: cualquier rol de la institución.

**Avance.** «Sección completa» para una persona = la regla de completitud de esa sección no devuelve faltantes. Cada regla declara su `Seccion`. La cuenta se hace sobre las personas con acceso habilitado de la institución.

## ADR aplicables y por redactar

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| Almacenamiento del interruptor (opción 1, tabla con ausencia = abierta) | `docs/decisiones/ADR-0028-secciones-habilitadas-por-institucion.md` | Vigente (cerrado el 2026-10-27) | T-01 a T-06, T-08 |
| Aislamiento por institución | `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Vigente | T-01 a T-06 |
| Hoja de vida estructurada | `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Vigente | T-04 |
| Campos configurables | `docs/decisiones/ADR-0009-campos-configurables.md` | Propuesto, no se cierra | Ninguna |

ADR-0028 está Vigente: ninguna tarea queda bloqueada por ADR.

## Mapa de archivos

| Área | Crear o modificar | Responsabilidad | Depende de |
|---|---|---|---|
| Backend Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/SeccionHojaDeVida.cs`, `.../SeccionInstitucion.cs` (crear) | Enumeración y entidad | ADR-0028 |
| Backend Infra | `.../Infrastructure/Persistence/Configuraciones/HojaDeVida/SeccionInstitucionConfiguracion.cs` (crear), `.../Persistence/AplicacionDbContext.cs`, `.../Persistence/Migrations/*` | Mapeo y migración | Entidad |
| Backend Application | `.../Application/Servicios/IServicioSecciones.cs` (crear), `.../Application/Modelos/ModelosHojaDeVida.cs`, `.../Application/Servicios/IValidadorCompletitudEnvio.cs` | Contratos | Entidad |
| Backend Infra | `.../Infrastructure/Servicios/ServicioSecciones.cs` (crear), `ServicioHojaDeVida.cs`, `ServicioDocumentosPersonales.cs`, `ServicioCuentaBancaria.cs`, `ServicioArchivos.cs`, `ValidadorCompletitudEnvio.cs`, `RegistroDeInfraestructura.cs` | Reglas | Contratos |
| Backend WebApi | `.../WebApi/Endpoints/SeccionesEndpoints.cs` (crear) | Endpoints | Servicio |
| Contrato | `openapi/v1.json`, `src/Frontend/src/app/api-client/index.ts` | Regenerados | Endpoints |
| Frontend admin | `src/Frontend/src/app/features/admin/configuracion/secciones.component.ts` y `.spec.ts` (crear) | Interruptores y avance | Cliente |
| Frontend usuario | `src/Frontend/src/app/features/usuario/hoja-de-vida/hoja-de-vida.component.ts` y su spec; `.../servicios/hoja-de-vida-state.service.ts` | Pestañas según secciones abiertas | Cliente |
| Pruebas Backend | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/SeccionesTests.cs`, `.../Integracion/SeccionesIntegracionTests.cs`, `.../Domain.Tests/HojaDeVidaTests.cs` (crear o ampliar) | Unitarias e integración | Cada tarea |

## Datos y migración

Una migración nueva con la tabla `secciones_institucion`, **vacía**: como sin fila equivale a abierta, el despliegue no cambia el comportamiento de las instituciones existentes (RF-SEC-013). Restricción única `(institucion_id, seccion)`. Se escribe en base de datos al cambiar el interruptor (un `SaveChangesAsync` por operación, con la auditoría).

## Orden de ejecución e integración

1. **T-01** fija esquema y entidad; es el único dueño de la migración y de `AplicacionDbContext.cs`.
2. **T-02** fija el servicio, los contratos y regenera el cliente.
3. **T-03, T-04, T-05, T-06** son independientes entre sí (archivos distintos): T-03 toca los servicios de escritura, T-04 el validador, T-05 la lectura y la revisión, T-06 el avance. Pueden ir en paralelo tras T-02.
4. **T-07 y T-08** (frontend) tras regenerar el cliente.
5. **T-09** verificación integral y PR a `develop`.

**Con spec-0008:** spec-0010 va **primero**. Las tareas T-04 y T-07 de spec-0008 usan `IServicioSecciones`. Dos migraciones en ramas distintas se ordenan por fecha; se rebasa la segunda al integrar la primera.

## Riesgos y decisiones pendientes

| Riesgo o punto abierto | Efecto | Acción y responsable |
|---|---|---|
| Una ruta de escritura sin consulta al interruptor | Sección cerrada escribible por la API | Prueba que recorre todas las rutas de escritura; una sola puerta de entrada |
| Cambiar la completitud rompe el envío actual | Nadie podría enviar | Pruebas de regresión con todas las secciones abiertas (RF-SEC-006) |
| Conflictos con #83 (pantalla de admin) | Rehacer la pantalla | Componente nuevo y acotado; revisar #83 antes de T-08 |
| PR #94 y #87 abiertos y ADR-0027 ya usado en `fix/76-asignacion-tipo-funcionario` | Colisión de números de spec o ADR | Confirmar numeración antes de abrir el PR |
| `superadmin` sin pantalla propia | Solo por API | Aceptado por el solicitante |

## Comprobación del plan

- [x] Las rutas y tecnologías coinciden con el código actual (servicios de escritura, validador, componente de pestañas).
- [x] ADR-0028 Vigente (opción 1).
- [x] Cada requisito de la v0.2 tiene tarea.
- [x] Las tareas tienen dependencias y límites de edición.
- [ ] Revisar con quien desarrolla los nombres de endpoints (provisionales) antes de T-02.
