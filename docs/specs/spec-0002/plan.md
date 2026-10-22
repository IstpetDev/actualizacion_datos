# Pantallas del usuario — Plan de implementación

**Spec aprobado:** `spec.md` v0.1, aprobación explícita en la sesión del 2026-10-22.  
**Objetivo:** completar el issue #11 en Angular 22 con Forms, RxJS y el cliente NSwag existente.

| Requisito | Diseño y rutas desde src/Frontend/src/app | Tarea | Verificación |
|---|---|---|---|
| RF-UI-001 | core/auth/auth.service.ts, auth.guard.ts, auth.interceptor.ts; features/auth/login.component.ts; layout/main-layout | T-01 | HTTP real simulado, guards y componentes |
| RF-UI-002 | features/auth/cambiar-clave.component.ts; app.routes.ts | T-01 | Validación y redirección obligatoria |
| RF-UI-003 | features/usuario/usuario-dashboard.component.ts y .html | T-02 | Solicitud, reenvío y verificación |
| RF-UI-004 | mismo componente; preservar propiedades del JSON | T-02 | Guardado, carga y rechazo sin perder datos |
| RF-UI-005 | mismo componente; ArchivosClient y HttpClient para binarios | T-02 | Límites, permisos y descarga |
| RF-UI-006 | mismo componente; operaciones RxJS secuenciales | T-02 | Consentimiento, guardado antes de envío y bloqueo |
| RF-UI-007 | mismo componente y plantilla | T-02 | Observaciones y corrección tras devolución |

## Contratos y decisiones

AutenticacionClient devuelve el rol y las marcas de sesión: no se permite elegirlos. Los guards comprueban la cookie con obtenerSesionActual, incluyendo navegación entre módulos. Cambiar clave actualiza la marca antes de entrar al panel. El cierre llama a la API antes de limpiar la sesión local; un fallo permite reintentar.

MisDatosDto y EstadoEdicionDto determinan la edición. Las operaciones del usuario omiten documento. ActualizarDatosRequest recibe JSON con telefono/direccion/ciudad y conserva propiedades adicionales. Un JSON previo ilegible bloquea el guardado para evitar pérdida. Enviar guarda primero, registra aceptación explícita si hace falta y luego envía; errores interrumpen la cadena y conservan el formulario. ArchivosClient administra metadatos y subida; HttpClient descarga el binario porque el cliente generado expone void.

ADR-0003, 0006, 0007 y 0008 vigentes aplican; ADR-0009 permanece Propuesto. Se reutiliza la arquitectura existente y no hay decisiones nuevas, migraciones ni cambios de contrato. El texto legal y la entrega real de correo quedan a cargo de la institución; no se afirma probar SMTP con dobles.

## Orden y riesgos

1. T-01: autenticación y cambio de clave, incluidas pruebas HTTP y guards.
2. T-02: formulario, correo, archivos y revisión, con pruebas de componentes.
3. T-03: compilación y pruebas de ambos proyectos, lint y formato; recorrido de navegador con API simulada; revisión del diff y PR.

Edición secuencial por el agente principal. El prefijo público /api ya usado por la aplicación se conserva: nginx retira ese prefijo y reenvía la ruta /api del cliente generado. La API sigue siendo autoridad para permisos y fechas. El catálogo institucional de campos no se amplía. Evidencia final en tasks.md y test-e2e.md.
