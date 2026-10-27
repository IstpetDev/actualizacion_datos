# Aceptación de protección de datos — Plan

**Spec:** v0.2, aprobación funcional y delegación registradas en `spec.md`.
**Objetivo:** proteger UI/API con aceptación institucional versionada, sin redactar el aviso.
**Tecnologías:** .NET 10, EF Core/PostgreSQL, Angular 22, NSwag; sin dependencias nuevas.

## Correspondencia y archivos

| Requisitos y escenarios | Diseño y rutas desde la raíz | Tarea | Verificación |
|---|---|---|---|
| RF-PDP-004 a 009, 012; E-PDP-03 a 08, 10, 12, 14 | Entidades `src/Backend/src/Istpet.ActualizacionDatos.Domain/{AvisoProteccionDatos,AceptacionProteccionDatos}.cs`; servicio `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioProteccionDatos.cs`; configuración y migración bajo `Persistence/` | T-01 | Tests de dominio, servicio y PostgreSQL |
| RF-PDP-001 a 004, 010, 011, 013; E-PDP-01, 02, 09, 11, 13 | Contratos `Application/Modelos/ModelosProteccionDatos.cs`, `Application/Servicios/IServicioProteccionDatos.cs`; `WebApi/Program.cs`, `WebApi/Middleware/ProteccionDatosMiddleware.cs`, `WebApi/Endpoints/ProteccionDatosEndpoints.cs`; servicios autenticación y datos | T-02 | HTTP con cookie real y pruebas de publicación |
| RF-PDP-001, 007, 008, 014; E-PDP-01 a 08, 13 | `src/Frontend/src/app/core/auth/`, `features/auth/aviso-proteccion-datos.component.ts`, login/cambio de clave, rutas/layout y dashboard anterior | T-03 | Tests Angular de componente, guards, interceptor y sesión HTTP |
| RF-PDP-015; todos los escenarios | `openapi/v1.json`, `src/Frontend/src/app/api-client/index.ts`, tests backend/frontend y `docs/evidencia/issue-99/README.md` | T-04 | Build, tests, integración PostgreSQL, lint/formato, CI |

Los directorios abreviados de backend corresponden a proyectos con prefijo `Istpet.ActualizacionDatos.` bajo `src/Backend/src/`. Las rutas del cliente generado se verifican en `nswag.json` antes de regenerarlo.

## Contratos y datos

`GET /api/proteccion-datos/aviso` devuelve estado, aviso/versionado/contenido/declaración y fecha de aceptación original; si no existe uno aplicable, devuelve pendiente y un mensaje operativo, sin datos de la persona. `POST /api/mis-datos/aceptar-tratamiento` exige `{ avisoId, acepta: true }`, sin aceptar identidad arbitraria. Login/sesión agregan `requiereAceptarProteccionDatos`; durante la restricción no entregan nombre, documento ni correo. El estado se consulta de nuevo en cada operación protegida y al enviar.

Publicación por comando con archivo JSON autorizado; no se crea un panel de administración. Dos tablas institucionales, claves compuestas y unicidad por persona/institución/aviso. Versiones únicas por institución. Se conservan columnas históricas de Persona sin convertirlas en autorización. Aceptar y publicar coordinan una transacción con bloqueo institucional; no se confía en locks de proceso. El commit de transacción es el punto de confirmación de la evidencia.

## ADR y orden

ADR-0030 se registra y revisa antes de T-01/T-02. Se respetan ADR-0001, 0003, 0004, 0007, 0023, 0024 y 0026. No se modifica un ADR Propuesto. Orden: contratos/modelo → persistencia/servicio/publicación → API/sesión → Angular → contratos generados → pruebas y revisión. Un único agente integra secuencialmente la rama `feature/99-aceptacion-proteccion-datos`.

## Riesgos y pendientes

PD-PDP-01 se resuelve para la entrega mediante la confirmación del solicitante de la aprobación rectoral en documento físico firmado bajo su custodia. El agente no inspeccionó ese original. El operador usa el documento como fuente para provisionar el aviso autorizado de cada institución/rol antes del uso; no se publica un sustituto ni se ejecuta configuración real desde esta tarea. La coordinación de escritura serializa por institución; revisar solo si se mide contención. Los tests anteriores con cabeceras requieren adaptación a autenticación de prueba explícita; la seguridad nueva se verifica por separado con cookie y política reales.
