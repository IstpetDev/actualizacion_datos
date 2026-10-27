# Advertencia y protección ante cambios sin guardar en la Hoja de Vida — Spec

**ID:** spec-0006  
**Versión:** 1.0  
**Estado:** Aprobado (2026-10-26)  
**Revisor funcional:** Anthony Pilatasig (@AnthonyPilatasig)  
**Fecha:** 2026-10-26  
**Áreas afectadas:** `src/Frontend`  

## Problema y resultado esperado

En la pantalla de la Hoja de Vida (`HojaDeVidaComponent`), las secciones principales (`ficha`, `formacion`, `capacitaciones`, `experiencia`, `referencias`, `documentos`) se renderizan de manera condicional mediante un `@switch (tabActiva())`, y algunas secciones contienen subpestañas internas (por ejemplo, `FormacionAcademicaComponent` con `obtenidos` / `en-curso`, y `ReferenciasComponent` con `Personal` / `Laboral`).

Cuando un usuario se encuentra editando o introduciendo datos en una sección o formulario secundario y hace clic en otra pestaña, subpestaña o enlace de navegación, Angular destruye el componente hijo activo y descarta silenciosamente toda la información modificada o en borrador, sin advertencia ni confirmación previa (Issue #90). Igualmente, si el usuario navega a otra ruta (`/admin`, `/cambiar-clave`, `/login`) o recarga/cierra la ventana del navegador, las ediciones se pierden.

**Resultado esperado:**
1. El sistema detecta cuándo una sección activa tiene cambios no persistidos o formularios abiertos con datos sin guardar.
2. Al intentar cambiar de pestaña o subpestaña con cambios sin guardar, se presenta un modal accesible (`role="alertdialog"`) con tres alternativas claras:
   - **«Guardar y continuar»**: persiste los cambios mediante el servicio de la sección. Si la validación o persistencia falla, permanece en la pestaña actual mostrando los errores; si tiene éxito, avanza a la pestaña solicitada.
   - **«Descartar cambios»**: revierte las modificaciones locales o cierra el formulario en curso y procede con la navegación a la pestaña solicitada.
   - **«Quedarme aquí»**: cancela el intento de cambio de pestaña, cierra el diálogo y devuelve el foco a la sección activa.
3. Se implementa un guard de ruta `canDeactivate` (`cambiosSinGuardarGuard`) para evitar salir de la ruta de la hoja de vida mientras haya modificaciones sin guardar.
4. Se implementa el manejador `window:beforeunload` para advertir al usuario si intenta cerrar o recargar la pestaña del navegador con modificaciones pendientes.
5. Se incluye un indicador visual en la interfaz (indicador de cambios pendientes) para que el usuario identifique qué sección tiene datos pendientes de guardado.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Issue #90 | GitHub Issue #90 | Requerimiento de advertir o guardar al cambiar de pestaña con datos sin guardar. |
| Spec previa | `docs/specs/spec-0003/spec.md` | Hoja de vida del personal: estructura modular de secciones (ficha, títulos, capacitaciones, experiencia, referencias, documentos). |
| ADR-0010 | `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Edición estructurada en el lugar y aislamiento de secciones de la hoja de vida. |
| HIG / WCAG | Directrices de Accesibilidad | Diálogos de confirmación destructiva/preventiva con `role="alertdialog"`, `aria-modal="true"`, foco atrapado y retorno de foco al elemento invocador. |

## Alcance

**Incluye:**
- Detección de estado modificado (*dirty*) en las secciones con formulario: Ficha Personal, Formación Académica (Títulos Obtenidos y Estudios en Curso), Capacitaciones, Experiencia Laboral y Referencias.
- Modal de advertencia accesible con las tres acciones: Guardar y continuar, Descartar cambios y Quedarme aquí.
- Interceptación de navegación entre pestañas principales de la Hoja de Vida.
- Interceptación de cambio de subpestaña interna en `FormacionAcademicaComponent` y `ReferenciasComponent` cuando hay un formulario abierto con datos.
- Guard de ruta `canDeactivate` aplicado en `app.routes.ts` para `/usuario`.
- Listener `window:beforeunload` en `HojaDeVidaComponent`.
- Indicador visual accesible de cambios pendientes en las pestañas.
- Pruebas unitarias completas en Vitest.

**Excluye:**
- Guardado automático periódico en segundo plano (*auto-save debounce*) a la base de datos (se mantiene guardado explícito por petición funcional).
- Modificaciones al esquema backend o contratos OpenAPI (la API actual ya soporta guardar cada sección de manera atómica).

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad | Fuente |
|---|---|---|---|
| RF-HDV-MOD-001 | Dado un usuario en una sección de la hoja de vida con cambios sin guardar en su formulario, cuando intenta seleccionar otra pestaña principal, el sistema suspende la transición y despliega un diálogo modal de confirmación. | Alta | Issue #90 |
| RF-HDV-MOD-002 | Dado el diálogo modal de confirmación, cuando el usuario selecciona «Guardar y continuar», el sistema intenta persistir los cambios de la sección actual; si la validación falla, permanece en la pestaña actual y muestra el error; si tiene éxito, completa la transición a la nueva pestaña solicitada. | Alta | Issue #90 |
| RF-HDV-MOD-003 | Dado el diálogo modal de confirmación, cuando el usuario selecciona «Descartar cambios», el sistema revierte los cambios locales no guardados y procede a la pestaña solicitada. | Alta | Issue #90 |
| RF-HDV-MOD-004 | Dado el diálogo modal de confirmación, cuando el usuario selecciona «Quedarme aquí» (o presiona Escape), el sistema cancela la transición, oculta el modal y mantiene el foco en el formulario actual. | Alta | Issue #90 |
| RF-HDV-MOD-005 | Dado un usuario con un formulario abierto con datos en subpestañas internas (títulos en curso vs obtenidos, o referencias laborales vs personales), cuando intenta cambiar de subpestaña, el sistema advierte o previene la pérdida de datos antes de alternar. | Alta | Issue #90 |
| RF-HDV-MOD-006 | Dado un usuario con cambios sin guardar, cuando intenta navegar a otra ruta de la aplicación mediante el enrutador de Angular, el guard `canDeactivate` intercepta la navegación y exige confirmación. | Alta | Issue #90 |
| RF-HDV-MOD-007 | Dado un usuario con cambios sin guardar, cuando intenta recargar la página o cerrar la pestaña del navegador, el manejador `window:beforeunload` previene la pérdida accidental invocando la confirmación nativa del navegador. | Media | Issue #90 |
| RF-HDV-MOD-008 | Dada una pestaña con cambios locales sin guardar, la interfaz visual muestra un indicador discreto (punto o distintivo visual) que alerta al usuario de modificaciones pendientes. | Media | Issue #90 |

## Escenarios del proceso

### Escenario 1 — Intento de cambio de pestaña con formulario modificado y opción «Quedarme aquí»
- **Actor:** Usuario autenticado en modo edición de Hoja de Vida.
- **Precondición:** Modifica su primer nombre o teléfono en la sección «Ficha Personal» sin pulsar el botón guardar.
- **Disparador:** Hace clic en la pestaña «Formación Académica».
- **Secuencia:**
  1. El sistema detecta modificaciones pendientes en `FichaPersonalComponent`.
  2. No destruye el componente ni cambia la pestaña activa.
  3. Muestra el modal con título «Tiene cambios sin guardar», descripción y tres botones.
  4. El usuario presiona «Quedarme aquí».
  5. El modal se cierra, la pestaña se mantiene en «Ficha Personal» y los datos modificados se conservan intactos.

### Escenario 2 — Intento de cambio con opción «Guardar y continuar»
- **Actor:** Usuario autenticado.
- **Precondición:** Ha completado los campos requeridos de su ficha o de un título nuevo.
- **Disparador:** Hace clic en otra pestaña y selecciona «Guardar y continuar».
- **Secuencia:**
  1. El sistema invoca el método de persistencia del formulario activo.
  2. La petición HTTP responde con éxito.
  3. El sistema actualiza el estado, limpia la bandera de cambios pendientes y transiciona a la pestaña destino.

### Escenario 3 — Intento de navegación de ruta con opción «Descartar»
- **Actor:** Usuario autenticado.
- **Precondición:** Ha escrito datos en un formulario y hace clic en «Cambiar contraseña» o en el enlace superior.
- **Disparador:** Disparo de enrutamiento por Angular Router.
- **Secuencia:**
  1. El guard `canDeactivate` detecta cambios pendientes en la hoja de vida.
  2. Muestra el modal de confirmación o diálogo.
  3. Al confirmar descartar, el componente limpia el estado sucio y la navegación procede normalmente.

## Criterios de aceptación

- [ ] Las pestañas no se alternan directamente si la sección activa tiene cambios no guardados.
- [ ] El modal de confirmación presenta las 3 acciones: «Guardar y continuar», «Descartar cambios», «Quedarme aquí».
- [ ] Si «Guardar y continuar» falla por validación de campos requeridos, el usuario no sale de la pestaña y se le indica el motivo.
- [ ] Al seleccionar «Descartar cambios», se limpian los datos no guardados y se navega a la pestaña de destino.
- [ ] La navegación fuera de `/usuario` está protegida por un guard `canDeactivate`.
- [ ] El evento `beforeunload` previene el cierre accidental del navegador cuando hay cambios sucios.
- [ ] Todas las pruebas unitarias (existentes y nuevas) pasan en verde en Vitest (`pnpm test:ci`).
