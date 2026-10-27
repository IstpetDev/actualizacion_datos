# ADR-0034 — Exención del aviso institucional de protección de datos para superadmin

- **Estado:** Vigente
- **Fecha:** 2026-10-27

## Contexto

`ADR-0030` (spec-0011) dispuso que `ServicioProteccionDatos` exigiera un `AvisoProteccionDatos` vigente y único para la institución y el rol de toda cuenta autenticada, incluyendo `superadmin` («Incluso superadmin acepta para la institución de su propia identidad»).

En producción (issue #115), esa regla bloqueó el arranque inicial de la plataforma:

1. Según `spec-0001` (`RF-MUL-001`, `RF-MUL-004`) y el `README.md`, `superadmin` es el rol técnico global encargado de aprovisionar instituciones, administradores iniciales y plantillas globales, no un funcionario que registre expediente personal ni documentos en campañas institucionales.
2. `AvisoProteccionDatos` es estrictamente institucional (`institucion_id`) y su publicación requiere que la institución ya exista y haya autorizado su texto legal (`--publicar-aviso`). Cuando aún no existe un aviso publicado para `Superadmin` en la institución técnica donde reside su credencial (o cuando una institución publica su aviso únicamente para su personal `Usuario`, `Supervisor` y `Admin`), `IniciarSesionAsync` y `ObtenerSesionActualAsync` marcan `RequiereAceptarProteccionDatos = true`, `GET /api/proteccion-datos/aviso` responde `503 ServiceUnavailable` (`AVISO_PROTECCION_DATOS_NO_DISPONIBLE`) y `ProteccionDatosMiddleware` bloquea con `403` todas las rutas globales (`/api/instituciones`, `/api/plantillas-hoja-de-vida`, etc.).
3. Adicionalmente, el middleware de contexto autenticado introducido junto con `ADR-0030` rechazaba con `403 CONTEXTO_NO_AUTORIZADO` cualquier cabecera `X-Institucion-Id` distinta del claim `institucion_id` incluso cuando la cookie autenticada pertenecía a `Superadmin`, impidiendo las operaciones multi-institución ya contempladas para ese rol en los endpoints de configuración (`RF-MUL-004`, `ADR-0004`).

## Opciones

1. **Sembrar un aviso ficticio o técnico para `Superadmin` en migraciones o arranque.** Contradice `ADR-0030` (prohibición de sembrar contenido legal ficticio o no autorizado en producción) y sigue acoplando un rol global de plataforma a un aviso legal por institución.
2. **Eximir únicamente al rol `Superadmin` de la condición de aviso institucional en `ServicioProteccionDatos` y permitirle seleccionar institución destino mediante `X-Institucion-Id` bajo cookie autenticada.** Mantiene intacto el bloqueo estricto para todos los roles institucionales (`Usuario`, `Supervisor`, `Admin`), conserva el cambio obligatorio de contraseña para `Superadmin` (`ADR-0007`) y habilita la administración inicial y multi-institución sin avisos artificiales.
3. **Permitir solo ciertas rutas globales en `ProteccionDatosMiddleware` manteniendo `RequiereAceptarProteccionDatos = true` para `Superadmin`.** Deja la sesión y el guard de Angular redirigiendo a `/proteccion-datos` y exige excepciones dispersas por ruta en frontend y backend.

## Decisión

Se adopta la opción 2, matizando `ADR-0030` en dos puntos acotados sin reescribir `spec-0011` ni `ADR-0030`:

1. **Alcance por rol del aviso institucional:** En `ServicioProteccionDatos.ObtenerEstadoAsync`, cuando el rol autenticado es `RolUsuario.Superadmin`, el servicio devuelve estado habilitado sin aviso requerido (`Aceptado = true`, `Aviso = null`, `FechaAceptacionUtc = null`). En consecuencia:
   - `IniciarSesionAsync` y `ObtenerSesionActualAsync` devuelven `RequiereAceptarProteccionDatos = false` para `Superadmin` (respetando previamente `DebeCambiarContrasena` si aplica).
   - `ProteccionDatosMiddleware` permite a `Superadmin` operar sobre los endpoints autorizados para su rol sin crear registros en `aceptaciones_proteccion_datos`.
   - `GET /api/proteccion-datos/aviso` devuelve `200 OK` con `Aceptado = true` y `Aviso = null` para `Superadmin`, permitiendo que el frontend redirija de inmediato a `/superadmin` incluso si se reintenta desde una pestaña abierta en `/proteccion-datos`.
2. **Invariabilidad para roles institucionales:** Para `Usuario`, `Supervisor` y `Admin`, la exigencia de un aviso institucional único, vigente y aceptado explícitamente se mantiene íntegra sin excepción ni fallback entre roles. El enumerado `RolDestinatarioAviso` conserva su definición binaria por compatibilidad con esquemas y archivos existentes.
3. **Selección explícita de institución por `Superadmin`:** La cookie autenticada sigue siendo la única autoridad de identidad y rol (`X-Actor` y `X-Rol` contradictorios se rechazan para todos los roles, y `X-Institucion-Id` contradictorio se rechaza para `Usuario`, `Supervisor` y `Admin`). Únicamente cuando la cookie autenticada tiene rol `Superadmin`, se admite `X-Institucion-Id` con un `Guid` válido para fijar `ContextoInstitucion.InstitucionId` en operaciones administrativas multi-institución (`RF-MUL-004`).

## Consecuencias

- `Superadmin` puede iniciar sesión, completar el cambio obligatorio de contraseña inicial y acceder a `/superadmin` para crear y administrar instituciones y plantillas globales aunque ninguna institución tenga aún un aviso publicado.
- Las cuentas institucionales (`Admin`, `Supervisor`, `Usuario`) creadas durante esa provisión inicial continúan bloqueadas hasta que el operador publique el aviso autorizado de su institución con `--publicar-aviso` y cada persona lo acepte individualmente.
- No cambia el esquema de base de datos ni el contrato OpenAPI (`openapi/v1.json`).

## ADR relacionados

- [ADR-0004](ADR-0004-multitenancia-esquema-unico.md) — Multitenancy: esquema único con `institucion_id`.
- [ADR-0007](ADR-0007-autenticacion-con-cedula.md) — Autenticación con cédula, cambio obligatorio y correo.
- [ADR-0024](ADR-0024-validacion-y-dominios-institucionales.md) — Validación y dominios institucionales.
- [ADR-0030](ADR-0030-avisos-versionados-y-aceptacion-de-acceso.md) — Avisos versionados y aceptación como condición de acceso.
