# Liberación de secciones de la hoja de vida por fases — Tareas

**Spec aprobado:** `spec.md` versión 0.2 (2026-10-27)  
**Plan:** `plan.md` versión 0.1  
**Estado:** Preparado para implementación. ADR-0028 Vigente (2026-10-27); sin bloqueos.

Prioritaria: va antes que spec-0008. Rama sugerida: `feature/spec-0010-secciones-por-fases` (de `develop`). Cada tarea que cambie la API regenera `openapi/v1.json` y el cliente. Todas incluyen pruebas. Sin datos reales.

## Matriz de dependencias

| Tarea | Requisitos | Depende de | Puede ir en paralelo con | Dueño |
|---|---|---|---|---|
| T-00 | Todos | Aprobación de la spec | Ninguna | Coordinador (hecha) |
| T-01 | RF-SEC-009, 012, 013 | T-00 | Ninguna | Coordinador |
| T-02 | RF-SEC-001, 002, 003, 007, 008, 011, 012 | T-01 | Ninguna | Coordinador |
| T-03 | RF-SEC-005, 007 | T-02 | T-04, T-05, T-06 | Por asignar |
| T-04 | RF-SEC-006 | T-02 | T-03, T-05, T-06 | Por asignar |
| T-05 | RF-SEC-004, PD-SEC-04 | T-02 | T-03, T-04, T-06 | Por asignar |
| T-06 | RF-SEC-010 | T-02, T-04 | T-03, T-05 | Por asignar |
| T-07 | RF-SEC-004 | T-05 | T-08 | Por asignar |
| T-08 | RF-SEC-001, 002, 010 | T-02, T-06 | T-07 | Por asignar |
| T-09 | Todos | T-01 a T-08 | Ninguna | Coordinador |

## T-00 — Registrar la aprobación de la spec

- [x] Aprobación v0.2 registrada en `spec.md` (2026-10-27).
- [x] `plan.md` y `tasks.md` creados; `test-e2e.md` creado.

**Resultado registrado:** hecha el 2026-10-27.  
**Bloqueos:** Ninguno.

## T-01 — Dominio, persistencia y migración

**Objetivo:** enumeración, entidad `SeccionInstitucion` y tabla vacía; la ficha no se puede cerrar.  
**Área y rama:** Backend.  
**Archivos exclusivos:** `src/Backend/src/Istpet.ActualizacionDatos.Domain/HojaDeVida/SeccionHojaDeVida.cs`, `.../SeccionInstitucion.cs`, `.../Infrastructure/Persistence/Configuraciones/HojaDeVida/SeccionInstitucionConfiguracion.cs`, `.../Persistence/AplicacionDbContext.cs`, `.../Persistence/Migrations/*`, `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/HojaDeVidaTests.cs`.  
**Entrada/contrato:** sección «Diseño y contratos» del plan.  
**Salida para integración:** entidad, `DbSet` y migración.  
**Dependencias:** T-00. **ADR aplicable:** ADR-0028 (Vigente).

- [x] Prueba que falle: cerrar la ficha se rechaza; abrir y cerrar otras alterna; restricción única institución y sección.
- [x] Implementar y generar la migración; comprobar que la tabla queda vacía y no altera datos.
- [x] `dotnet test src/Backend --filter "Categoria!=Integracion"`.
- [x] Revisar RF-SEC-009, 012, 013.

**Resultado registrado:** completada  
**Bloqueos:** Ninguno.

## T-02 — Servicio, endpoints y auditoría

**Objetivo:** `IServicioSecciones`, listado y cambio por institución, permisos y auditoría; cliente regenerado.  
**Área y rama:** Backend.  
**Archivos exclusivos:** `.../Application/Servicios/IServicioSecciones.cs`, `.../Infrastructure/Servicios/ServicioSecciones.cs`, `.../WebApi/Endpoints/SeccionesEndpoints.cs`, `.../Infrastructure/RegistroDeInfraestructura.cs`, `openapi/v1.json`, `src/Frontend/src/app/api-client/index.ts`, `src/Backend/tests/.../WebApi.Tests/SeccionesTests.cs`.  
**Entrada/contrato:** endpoints provisionales del plan, a confirmar al inicio.  
**Salida para integración:** servicio inyectable y cliente.  
**Dependencias:** T-01. **ADR aplicable:** ADR-0028, ADR-0004.

- [x] Pruebas que fallen: el `admin` lista y cambia solo su institución; `usuario` y `supervisor` reciben 403; el `superadmin` puede por la API; sección inexistente 404; cada cambio queda en la auditoría sin datos personales; **abrir una sección no cambia el estado de una persona enviada o aprobada**; cerrar conserva los datos.
- [x] Implementar.
- [x] Regenerar `openapi/v1.json` y el cliente; `dotnet test src/Backend`.
- [x] Revisar RF-SEC-001, 002, 003, 007, 008, 011, 012.

**Resultado registrado:** completada  
**Bloqueos:** T-01.

## T-03 — Las escrituras respetan el interruptor

**Objetivo:** ninguna ruta de escritura de una sección cerrada guarda datos o archivos.  
**Área y rama:** Backend.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioHojaDeVida.cs`, `ServicioDocumentosPersonales.cs`, `ServicioCuentaBancaria.cs`, `ServicioArchivos.cs`, `src/Backend/tests/.../WebApi.Tests/HojaDeVidaTests.cs`, `ArchivosTests.cs`, `CuentaBancariaTests.cs`.  
**Entrada/contrato:** `IServicioSecciones.EstaAbiertaAsync`.  
**Salida para integración:** servicios actualizados.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0028.

- [x] Prueba que **recorre todas las rutas de escritura** (ficha, títulos, títulos en curso, capacitaciones, experiencia, referencias, documentos, cuenta bancaria y subida de archivos): con la sección cerrada, cada una responde 409; con todas abiertas, el comportamiento actual no cambia.
- [x] Implementar la consulta en una sola puerta de entrada.
- [x] `dotnet test src/Backend`.
- [x] Revisar RF-SEC-005, 007.

**Resultado registrado:** completada  
**Bloqueos:** T-02.

## T-04 — Completitud según las secciones abiertas

**Objetivo:** el envío exige solo lo de las secciones abiertas.  
**Área y rama:** Backend.  
**Archivos exclusivos:** `.../Application/Servicios/IValidadorCompletitudEnvio.cs`, `.../Infrastructure/Servicios/ValidadorCompletitudEnvio.cs`, `src/Backend/tests/.../WebApi.Tests/HojaDeVidaTests.cs` (casos de envío; coordinar con T-03).  
**Entrada/contrato:** cada `IReglaCompletitudEnvio` declara su `Seccion`.  
**Salida para integración:** validador filtrado.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0010, ADR-0028.

- [x] Pruebas que fallen: con solo la ficha abierta, enviar exige solo la ficha y no menciona las cerradas; al abrir formación, se exige; con todas abiertas el envío existente **no cambia** (regresión completa de RF-HDV-009).
- [x] Implementar.
- [x] `dotnet test src/Backend`.
- [x] Revisar RF-SEC-006.

**Resultado registrado:** completada  
**Bloqueos:** T-02.

## T-05 — Lectura de la hoja de vida y no regresión de revisión y exportación

**Objetivo:** la persona recibe las secciones abiertas; supervisor y exportación siguen mostrando lo cargado.  
**Área y rama:** Backend.  
**Archivos exclusivos:** `.../Application/Modelos/ModelosHojaDeVida.cs`, `.../Infrastructure/Servicios/ServicioHojaDeVida.cs` (solo lectura; coordinar con T-03), `src/Backend/tests/.../WebApi.Tests/FlujoRevisionTests.cs`, `ExportacionesTests.cs`.  
**Entrada/contrato:** campo `seccionesAbiertas`.  
**Salida para integración:** DTO ampliado.  
**Dependencias:** T-02. **ADR aplicable:** ADR-0028.

- [x] Pruebas que fallen: la hoja de vida lista solo las abiertas; el supervisor ve lo ya cargado de una sección cerrada en solo lectura; el Excel y el `.zip` lo incluyen (PD-SEC-04).
- [x] Implementar.
- [x] `dotnet test src/Backend`.
- [x] Revisar RF-SEC-004 y PD-SEC-04.

**Resultado registrado:** completada  
**Bloqueos:** T-02.

## T-06 — Avance por sección

**Objetivo:** el `admin` ve cuántas personas completaron cada sección.  
**Área y rama:** Backend.  
**Archivos exclusivos:** `.../Infrastructure/Servicios/ServicioSecciones.cs` (método de avance), `src/Backend/tests/.../WebApi.Tests/SeccionesTests.cs`.  
**Entrada/contrato:** avance definido en el plan.  
**Salida para integración:** campo de avance en el listado.  
**Dependencias:** T-02, T-04. **ADR aplicable:** ADR-0028.

- [x] Pruebas que fallen: cuenta solo personas de la institución; una persona con faltantes no cuenta; resultados distintos por sección.
- [x] Implementar.
- [x] `dotnet test src/Backend`.
- [x] Revisar RF-SEC-010.

**Resultado registrado:** completada  
**Bloqueos:** T-02, T-04.

## T-07 — Pestañas según las secciones abiertas

**Objetivo:** la persona ve solo las secciones abiertas.  
**Área y rama:** Frontend.  
**Archivos exclusivos:** `src/Frontend/src/app/features/usuario/hoja-de-vida/hoja-de-vida.component.ts` y `.spec.ts`, `.../servicios/hoja-de-vida-state.service.ts`.  
**Entrada/contrato:** cliente regenerado en T-02 y `seccionesAbiertas` de T-05.  
**Salida para integración:** componente.  
**Dependencias:** T-05. **ADR aplicable:** Ninguno nuevo.

- [x] Pruebas Vitest que fallen: solo las pestañas abiertas; la numeración sigue correlativa; con una sola pestaña se ve igual de claro; no se pierde el aviso de cambios sin guardar (spec-0006).
- [x] Implementar.
- [x] `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.
- [x] Revisar RF-SEC-004.

**Resultado registrado:** completada  
**Bloqueos:** T-05.

## T-08 — Pantalla de secciones del admin

**Objetivo:** interruptores y avance en una sección acotada de la configuración.  
**Área y rama:** Frontend.  
**Archivos exclusivos:** `src/Frontend/src/app/features/admin/configuracion/secciones.component.ts` y `.spec.ts`; ruta en `src/Frontend/src/app/app.routes.ts` o enlace en el panel.  
**Entrada/contrato:** cliente regenerado en T-02 y T-06.  
**Salida para integración:** componente.  
**Dependencias:** T-02, T-06. **ADR aplicable:** ADR-0028.

- [x] Pruebas Vitest que fallen: muestra las siete secciones con estado y avance; abrir y cerrar; la ficha no se puede cerrar; confirmación antes de cerrar una con datos; error accesible.
- [x] Implementar; revisar el estado del issue #83 antes de empezar.
- [x] `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.
- [x] Revisar RF-SEC-001, 002, 010.

**Resultado registrado:** completada  
**Bloqueos:** T-02, T-06.

## T-09 — Verificación integral y PR

**Objetivo:** todo verificado y el PR listo.  
**Área y rama:** ambas.  
**Archivos exclusivos:** `docs/specs/spec-0010/test-e2e.md` (resultados), `tasks.md`.  
**Dependencias:** T-01 a T-08.

- [x] `dotnet build src/Backend` y `dotnet test src/Backend` (con Docker para la integración).
- [x] `pnpm --dir src/Frontend test:ci`, `lint`, `format:check`.
- [x] `openapi/v1.json` y cliente al día.
- [x] Ejecutar los escenarios de `test-e2e.md` con datos ficticios y registrar resultados.
- [x] Abrir PR a `develop` con título `feat: liberacion de secciones de la hoja de vida por fases` y la salida real de las pruebas.

**Resultado registrado:** completada  
**Bloqueos:** T-01 a T-08.

## Integración y cierre

- [ ] El coordinador revisó cada diff y comprobó la evidencia de cada tarea.
- [ ] Se resolvieron dependencias y conflictos sin cambiar la spec aprobada.
- [ ] Se ejecutaron las pruebas de backend y frontend.
- [ ] Se ejecutó `test-e2e.md` y se registraron los resultados.
- [ ] El cambio se integra mediante PR a `develop`.
- [ ] Solo los requisitos con evidencia integrada y prueba satisfactoria pasan a `Implementado`.
