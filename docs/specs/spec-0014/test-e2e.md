# Pruebas End-to-End y Verificación — Spec-0014

## Recorrido 1: Consulta y Publicación por Superadmin
1. Superadmin inicia sesión e ingresa a `/superadmin`.
2. Se dirige a la pestaña «Políticas de Protección de Datos».
3. Selecciona una institución recién registrada: visualiza estado «Pendiente de publicación».
4. Llena el formulario con:
   - Versión: `1.0.0`
   - Título: `Aviso Legal de Protección de Datos Ficticio`
   - Responsable: `Oficial de Protección de Datos Institucional`
   - Fuente oficial: `https://ejemplo.test/aviso-legal`
   - Evidencia: `Resolución Rectoral Ficticia 2026-001`
   - Contenido: `Texto íntegro explicativo ficticio para pruebas de protección de datos.`
   - Declaración de aceptación: `Acepto de manera voluntaria el tratamiento de mis datos personales ficticios.`
   - Roles: Usuario, Supervisor, Admin marcados.
   - Fecha de vigencia: Actual UTC.
   - Confirmación de aprobación institucional: `true`.
5. Envía el formulario.
6. La API responde 201 Created y persiste el aviso y la auditoría.
7. La interfaz actualiza el estado a «Vigente», mostrando la versión y datos publicados.

## Recorrido 2: Desbloqueo de Usuario Institucional
1. Usuario institucional de dicha institución inicia sesión con sus credenciales.
2. Accede a la pantalla de aceptación de aviso `/proteccion-datos`.
3. El aviso versión `1.0.0` publicado por el superadmin es desplegado correctamente.
4. El usuario acepta el aviso y es redirigido a sus datos con sesión habilitada.

## Recorrido 3: Intentos no autorizados y rechazo de duplicados
1. Usuario con rol Admin o Usuario intenta llamar a `POST /api/superadmin/instituciones/{id}/avisos-proteccion-datos` -> Recibe 403 Forbidden.
2. Superadmin intenta publicar nuevamente la versión `1.0.0` para la misma institución -> Recibe 400 Bad Request ("La versión ya fue publicada").
3. Superadmin intenta publicar sin confirmación institucional -> Recibe 400 Bad Request ("La publicación requiere la autorización explícita de la institución").
