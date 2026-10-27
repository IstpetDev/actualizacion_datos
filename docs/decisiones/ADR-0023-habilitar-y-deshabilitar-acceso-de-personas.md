# ADR-0023 — Habilitación y deshabilitación del acceso de personas por el administrador

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

El [ADR-0018](ADR-0018-la-carga-de-nomina-habilita-el-acceso.md) estableció que la carga de nómina habilita por defecto el acceso de las personas (`AccesoHabilitado = true`). Sin embargo, en el ciclo de vida institucional se requiere pausar o retirar el acceso a personas que dejan la institución, finalizan contratos o deben quedar inhabilitadas temporalmente entre campañas, así como habilitar individual o masivamente a personas que estuvieran pendientes.

Antes de esta decisión, no existía endpoint ni interfaz para que un `Admin` deshabilitara el acceso, y el método `DeshabilitarAcceso()` de la entidad `Persona` solo se invocaba en pruebas unitarias de dominio.

Adicionalmente, las sesiones se autentican mediante cookies seguras (`istpet_auth`) con duración de 30 minutos y renovación deslizante. Es crítico definir el comportamiento de las sesiones activas cuando un usuario es deshabilitado.

## Opciones

1. **Permitir habilitar y deshabilitar individual y masivamente con invalidación inmediata de sesión en backend:**
   El endpoint `POST /api/personas/acceso` permite alternar el estado `AccesoHabilitado` de usuarios de la institución. En cada solicitud autenticada mediante cookie, `OnValidatePrincipal` verifica el estado en la base de datos por clave primaria y revoca la sesión de inmediato si el acceso ha sido revocado.
2. **Aceptar desfase de sesión de 30 minutos sin validación en cada petición:**
   La persona deshabilitada mantendría acceso hasta que expire su cookie (hasta 30 minutos). Deja una ventana de riesgo de seguridad donde una persona desvinculada puede seguir consultando o modificando datos.
3. **Control exclusivo para superadministrador:**
   Contradice la necesidad operativa diaria de los administradores institucionales en cada sede.

## Decisión

Se adopta la **Opción 1**:

1. **Endpoint administrativo:** Se implementa `POST /api/personas/acceso` que recibe `{ habilitar: bool, personaIds?: Guid[], todas?: bool }`. Responde con `{ cambiadas: int, yaEnEstado: int }`.
2. **Restricciones de rol e institución:**
   - La operación aplica estrictamente sobre personas con rol `RolUsuario.Usuario` de la institución del administrador autenticado.
   - Un administrador no puede deshabilitarse a sí mismo ni a otros administradores o supervisores.
3. **Invalidación de sesiones abiertas:**
   - Se configura `options.Events.OnValidatePrincipal` en la autenticación por cookies para verificar el estado `AccesoHabilitado` de la persona autenticada. Si está deshabilitada, se invoca `RejectPrincipal()` y `SignOutAsync()`, respondiendo `401 Unauthorized` de inmediato.
   - `ObtenerSesionActualAsync` devuelve `null` si el usuario no tiene el acceso habilitado.
4. **Mensaje de login para cuentas deshabilitadas:**
   - Se mantiene el mensaje genérico de RF-ACC-004 (`Credenciales incorrectas o usuario no habilitado.`) sin revelar si la cuenta existe o está deshabilitada.
5. **Auditoría:**
   - Toda operación de habilitación o deshabilitación registra un evento en la tabla `auditorias` con la acción (`HABILITAR_ACCESO` o `DESHABILITAR_ACCESO`), el actor administrador, la institución y el detalle con la cantidad de personas afectadas.
6. **Interfaz de usuario en panel de admin:**
   - En la tabla de personas se agrega casilla de selección por fila, selector global «seleccionar todas las visibles», filtro por estado de acceso (Todas, Habilitadas, Pendientes/Deshabilitadas), barra de acciones masivas con confirmación previa y botón directo por fila para conmutar el estado individual.

## Consecuencias

- Los administradores adquieren control operativo completo sobre el acceso de su personal.
- La invalidación inmediata de sesión elimina la ventana de vulnerabilidad tras una desvinculación laboral.
- La verificación en `OnValidatePrincipal` se realiza mediante búsqueda directa por clave primaria (`id`), manteniendo un impacto de rendimiento insignificante.
- El contrato OpenAPI se amplía con el nuevo endpoint y DTOs; el cliente de Angular se regenera en el mismo cambio.

## ADR relacionados

- [ADR-0007](ADR-0007-autenticacion-con-cedula.md) — Autenticación con cédula, cambio obligatorio y correo.
- [ADR-0018](ADR-0018-la-carga-de-nomina-habilita-el-acceso.md) — La carga de nómina habilita el acceso de las personas.
