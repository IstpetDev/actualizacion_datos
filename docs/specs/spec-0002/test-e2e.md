# Pantallas del usuario — Verificación

**Spec aprobado:** spec-0002 v0.1. **Plan:** plan.md. **Responsable:** agente principal.

## Preparación

Frontend local y navegador Chromium. API simulada con datos inventados para comprobar interacción y presentación; esto no verifica PostgreSQL ni envío de correo real. Las pruebas de backend se ejecutan aparte. Documento 0000000000, correo usuario@ejemplo.test. No usar servicios ni datos de producción.

| Caso | Requisito | Recorrido y resultado esperado | Evidencia |
|---|---|---|---|
| V-01 | RF-UI-001/002 | Login real, error genérico, cambio obligatorio, rol de respuesta y cierre de cookie | Pruebas HTTP, componentes y guards |
| V-02 | RF-UI-003 | Solicitar/reenviar código, rechazar código inválido, verificar correo | Pruebas de componente |
| V-03 | RF-UI-004/006 | Cargar datos, editar contacto, conservar claves adicionales, aceptar y enviar; bloqueo posterior | Pruebas de componente y navegador |
| V-04 | RF-UI-005 | 5 MB avisa, 10 MB admite, más de 10 MB y tipo inválido rechaza; listar, descargar y eliminar | Pruebas de componente/HTTP |
| V-05 | RF-UI-006/007 | Devuelto muestra rondas/marcas y permite corregir; fuera de campaña y enviado/aprobado bloquean cambios | Pruebas de componente y navegador |
| V-06 | RF-UI-004/006 | Fallos de carga, guardado o envío no pierden el borrador ni continúan con el siguiente paso | Pruebas de componente |

## Resultado global

**Fecha:** 2026-10-22. **Resultado:** V-01 a V-06 satisfactorios en sus niveles declarados: 84 pruebas Angular con componentes y HTTP simulado, más el recorrido Chromium indicado abajo. Se ejecutaron aparte las 100 pruebas del backend, incluidas las de integración; no se probó entrega SMTP real.

Recorrido de navegador ejecutado sobre la rama `feature/11-pantallas-usuario`, con Angular servido en localhost y respuestas de API interceptadas por Playwright:

1. Abrir login sin sesión, introducir documento ficticio y contraseña inicial. La API simulada determina el rol y exige cambio de clave.
2. Cambiar clave y entrar al panel Devuelto; comprobar observación general y marca en teléfono.
3. Editar teléfono, dirección y ciudad; provocar 403 al guardar. La pantalla conserva los campos y muestra el motivo de cierre de campaña.
4. Solicitar código de correo y verificar seis dígitos.
5. Subir un PDF de ejemplo, descargarlo con su nombre, eliminarlo y volver a seleccionar/subir otro con el mismo nombre.
6. Revisar escritorio y móvil de 390 × 844: sin desbordamiento horizontal.
7. Aceptar explícitamente el tratamiento; comprobar orden guardar → aceptar → enviar. El estado pasa a Enviado y los campos quedan bloqueados incluso tras recargar.
8. Salir; comprobar llamada a logout y retorno al login. Sin errores JavaScript del navegador.

**Comando del recorrido de esta sesión:** `node /tmp/verificar-issue-11.mjs`, con Playwright disponible en el entorno y Chromium local. El script temporal usa exclusivamente datos inventados y una API simulada; no agrega dependencias al proyecto. Las verificaciones repetibles de regresión quedan en `src/Frontend/src/app/features/{auth,usuario}/*.spec.ts` y `src/Frontend/src/app/core/auth/*.spec.ts`, mediante `pnpm --dir src/Frontend test:ci`.

Capturas verificadas visualmente:

- [Login](../../evidencia/issue-11/login.png).
- [Formulario y devolución](../../evidencia/issue-11/formulario.png).
- [Vista móvil](../../evidencia/issue-11/movil.png).
- [Enviado, edición bloqueada](../../evidencia/issue-11/enviado.png).

Los límites de archivos (5 MB, 10 MB y más de 10 MB), el rechazo de tipos, la campaña cerrada, el estado Aprobado, los códigos inválidos y las fallas en cada paso del envío se comprueban con pruebas de componente; no se presentan como recorridos de navegador independientes. Los comandos y resultados de compilación, pruebas, lint y formato se registran en `tasks.md`.
