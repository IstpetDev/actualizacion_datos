# Pantallas del usuario — Tareas

**Spec aprobado:** spec-0002 v0.1. **Plan:** plan.md. **Estado:** Verificado localmente; cierre mediante PR.

| Tarea | Objetivo y archivos | Dependencia | Dueño | Criterio |
|---|---|---|---|---|
| T-01 | Autenticación real, guards y cambio de clave en core/auth, features/auth, app.routes y main-layout | Ninguna | Agente principal | Pruebas HTTP y componentes satisfactorias |
| T-02 | Panel en features/usuario: contacto, correo, archivos, consentimiento, estados y observaciones | T-01 | Agente principal | RF-UI-003 a 007 probados |
| T-03 | Validar, revisar y entregar PR a develop | T-02 | Agente principal | Build/test backend y frontend, lint, format:check, navegador y ci-ok |

## Verificación y cierre

- [x] T-01 implementada y verificada.
- [x] T-02 implementada y verificada.
- [x] T-03: validación local implementada y verificada.
- [x] Diff revisado contra develop actualizado; sin conflictos.
- [ ] PR fusionado con ci-ok verde e issue #11 cerrado sin comentarios adicionales.

**Resultados locales, 2026-10-22:**

- `dotnet build src/Backend -p:GenerarClienteAngular=false`: correcto, 0 errores y 0 advertencias.
- `dotnet test src/Backend --no-build`: 100 pruebas satisfactorias (58 dominio, 2 aplicación, 40 API, incluidas las de integración con PostgreSQL mediante Testcontainers), 0 fallos y 0 omitidas.
- `pnpm --dir src/Frontend test:ci`: 14 archivos y 84 pruebas satisfactorias.
- `pnpm --dir src/Frontend lint`: todos los archivos cumplen.
- `pnpm --dir src/Frontend format:check`: todos los archivos cumplen Prettier.
- `pnpm --dir src/Frontend build`: producción compilada; aviso previo en estilos del supervisor (5,65 kB frente a presupuesto de aviso de 4 kB). No hay aviso en los componentes añadidos.
- Recorrido Chromium con API simulada: correcto en escritorio y móvil (390 px), sin errores JavaScript ni desbordamiento horizontal. Incluye conservar borrador tras 403, eliminar y volver a subir un archivo del mismo nombre, descarga y bloqueo tras recargar el envío.
- `git diff --check`: limpio. Contrato OpenAPI y cliente generado sin cambios.

Se usó `corepack pnpm` desde `src/Frontend`, que ejecuta pnpm 12.4.1, y el SDK .NET 10.0.402. No se añadieron dependencias. El estado de CI, merge y cierre se comprueba en el PR asociado a [#11](https://github.com/IstpetDev/actualizacion_datos/issues/11), sin comentarios posteriores.
