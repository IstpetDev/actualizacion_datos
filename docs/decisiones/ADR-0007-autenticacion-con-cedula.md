# ADR-0007 — Autenticación con cédula, cambio obligatorio y correo

- **Estado:** Propuesto
- **Fecha:** 2026-10-20

## Contexto

Las personas permitidas se cargan por número de documento (cédula). Entran con la cédula como usuario. De ellas no se tiene el correo. Antes el acceso era por enlace mágico enviado al correo; ahora será con login. Reglas acordadas:

- Si la contraseña coincide con el usuario (estado inicial), el sistema **obliga a cambiarla** en el primer ingreso.
- El correo se pide en el primer ingreso, como parte de la actualización de datos.
- Cómo se verifica ese correo y cómo se recupera una contraseña queda **pendiente** para quien desarrolle.

Riesgo conocido: una contraseña inicial igual a la cédula es débil, porque la cédula no es secreta. Hasta que la persona la cambie, cualquiera que conozca su número de documento podría entrar a su cuenta.

## Opciones

Verificación del correo:

1. Enviar un código o enlace de confirmación al correo indicado.
2. Aceptarlo sin verificar y marcarlo como no verificado.

Recuperación de contraseña:

1. Restablecimiento por correo verificado.
2. Restablecimiento por el admin de la institución.

Mitigaciones del riesgo de la contraseña inicial (a evaluar, sin decidir):

1. Bloqueo temporal tras varios intentos fallidos.
2. Código enviado por correo en el primer ingreso, además de la cédula.
3. Ventana de validez limitada de la contraseña inicial.
4. Registro y auditoría de los intentos de acceso.

## Decisión

Pendiente. La toma quien desarrolle. Debe quedar decidida la verificación del correo, la recuperación de contraseña y qué mitigaciones se aplican a la contraseña inicial.

## Consecuencias

A completar al decidir. Puntos a considerar: dependencia del correo de notificaciones por configurar, duración de la sesión (pendiente), almacenamiento seguro de contraseñas y trato de los datos de acceso como datos personales.

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
