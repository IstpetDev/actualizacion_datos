# Panel de administración: unificar pantallas, paginación, botones responsive y panel de cuentas bancarias — Spec

**ID:** #83 (Unifica #78, #79 y #82)  
**Versión:** 0.1  
**Estado:** Borrador para revisión funcional  
**Revisor funcional:** Joseph Baño / Equipo de Desarrollo  
**Fecha:** 2026-10-26  
**Áreas afectadas:** `src/Frontend`

## Problema y resultado esperado

El panel de administración institucional presenta problemas de usabilidad, rendimiento y desbordamiento visual:
1. **Panel de cuentas bancarias redundante y descontextualizado:** El bloque de cotejo de cuentas bancarias (`<app-estado-cuentas-bancarias />`) se encuentra renderizado en el pie del panel fuera de los bloques condicionales de pestañas, apareciendo en todas las pantallas. Además, solo consulta datos una vez en `ngOnInit`, mostrando habitualmente «No hay personas cargadas.» incluso tras importar una nómina.
2. **Tabla de nómina sin paginación ni búsqueda:** En la pestaña «Carga de Personas (Nómina)», la tabla lista todas las personas sin control de paginación ni filtros. Con 100 o más registros el scroll vertical dificulta la operación, no hay confirmación persistente del guardado automático de la nómina y no se visualiza si la ficha personal fue registrada.
3. **Acciones no adaptables:** Los botones de acción en las tablas de configuración y personas no cuentan con contenedor flexible (`flex-wrap`), provocando desbordamiento horizontal en pantallas angostas (360 px a 768 px).
4. **Dispersión del flujo de campaña:** Preparar una campaña requiere navegar entre pestañas desconectadas sin un indicador de avance o estado de preparación institucional.

El resultado esperado es un panel de administración unificado, con cuentas bancarias en su propia pestaña dedicada con actualización automática, tabla de nómina con paginación configurable y búsqueda reactiva, botones responsivos accesibles y flujo simplificado.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Regla de negocio | RF-HDV-027 | Monitoreo y cotejo de cuentas bancarias frente a la nómina institucional (máscara de últimos 4 dígitos). |
| Decisión arquitectónica | `docs/decisiones/ADR-0013-datos-bancarios.md` (dec. 4) | Supervisores y admins visualizan cotejo de cuenta sin exponer número completo. |
| Decisión arquitectónica | `docs/decisiones/ADR-0018-la-carga-de-nomina-habilita-el-acceso.md` | La carga por admin habilita acceso y persiste ficha personal inicial. |
| Decisión arquitectónica | `docs/decisiones/ADR-0019-asignacion-masiva-y-persistencia-tipo-funcionario.md` | Pestaña «4. Asignación a Personas» queda desacoplada de este cambio (llevada por #76/PR #87). |
| Comportamiento existente | `src/Frontend/src/app/features/admin/admin-dashboard.component.ts:471` | Evidencia de `<app-estado-cuentas-bancarias />` fuera del selector de pestañas. |
| Comportamiento existente | `src/Frontend/src/app/features/cuenta-bancaria/estado-cuentas-bancarias.component.ts:260` | Consulta de cuentas únicamente en `ngOnInit`. |

## Alcance

**Incluye:**
- Creación de la pestaña dedicada «Cuentas bancarias» en el panel de administración institucional.
- Aislamiento del componente `<app-estado-cuentas-bancarias />` exclusivamente dentro de dicha pestaña.
- Método de refresco reactivo para recargar el cotejo de cuentas bancarias al activar la pestaña o al completar una carga de nómina.
- Mensaje diferenciado cuando no hay personas registradas frente a cuando hay personas pero ninguna ha registrado cuenta bancaria.
- Paginación configurable (25/50 registros) y búsqueda en tiempo real por documento o nombre en la tabla de personas de nómina.
- Indicador visual del estado de ficha personal por persona en la tabla.
- Contenedores de botones de acción flexibles (`flex-wrap`, espaciado consistente) y tablas con scroll horizontal autocontenido.

**Excluye:**
- Pestaña «4. Asignación a Personas» (gestionada de forma independiente por el issue #76 / PR #87).
- Modificaciones al contrato de la API de backend para cuentas bancarias.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-ADM-010 | Dado el panel de administración, cuando el usuario navega entre las pestañas de campañas, nómina, exportación o configuración, el componente de cuentas bancarias no se renderiza. | Alta | Issue #83 (Parte 3) |
| RF-ADM-011 | Dado que el usuario selecciona la pestaña «Cuentas bancarias», el sistema muestra el monitoreo y solicita la lista actualizada a la API. | Alta | Issue #83 (Parte 3) |
| RF-ADM-012 | Dado que el usuario importa un archivo de nómina exitosamente, cuando activa la pestaña «Cuentas bancarias», los datos reflejan las personas importadas sin recargar toda la página web. | Alta | Issue #83 (Parte 3) |
| RF-ADM-013 | Dado que la institución no tiene nómina cargada, el componente muestra «No hay personas registradas en la institución». Si hay nómina pero nadie ha registrado cuenta, el resumen muestra «0 registradas» con desglose fáctico. | Media | Issue #83 (Parte 3) |
| RF-ADM-020 | Dado el listado de personas de la institución, el administrador puede filtrar por texto (documento o nombre) y seleccionar el tamaño de página (25 o 50 filas). | Alta | Issue #83 (Parte 2) |
| RF-ADM-021 | Dado un listado de más de 25 personas, la tabla muestra controles de paginación anterior/siguiente y número de página activa. | Alta | Issue #83 (Parte 2) |
| RF-ADM-030 | Dado un ancho de pantalla de 360 px, 768 px o 1280 px, los botones de acción de las tablas se adaptan sin desbordar el ancho de la ventana. | Alta | Issue #83 (Parte 4) |

## Escenarios del proceso

### Escenario 1 — Monitoreo de cuentas bancarias en su propia pestaña
- **Actor y precondición:** Administrador de institución con sesión activa en el panel.
- **Disparador:** Hace clic en la pestaña «Cuentas bancarias».
- **Secuencia:** El sistema activa la pestaña, invoca `listarEstadosCuentasBancarias()` y renderiza el resumen de métricas y la tabla de enmascaramiento.
- **Resultado:** Visualización única y contextualizada del cotejo bancario.

### Escenario 2 — Paginación y búsqueda de personas de nómina
- **Actor y precondición:** Administrador con 110 personas registradas en la institución.
- **Disparador:** Ingresa al panel «Carga de Personas (Nómina)» y escribe «0102» en el buscador.
- **Secuencia:** La tabla filtra instantáneamente mostrando solo las personas coincidentes, ajustando el contador de páginas y permitiendo navegar entre los resultados.
- **Resultado:** Búsqueda rápida sin bloqueos en el navegador.

## Criterios de aceptación

- [ ] `<app-estado-cuentas-bancarias />` aparece únicamente bajo la pestaña «Cuentas bancarias».
- [ ] La lista de cuentas bancarias se actualiza al cambiar a dicha pestaña y tras importar nómina.
- [ ] La tabla de personas de nómina soporta búsqueda por documento y nombre con paginación de 25 y 50 registros.
- [ ] Las tablas y botones de acción no provocan desbordamiento horizontal en viewports de 360 px, 768 px y 1280 px.
- [ ] Las pruebas automatizadas unitarias en frontend cubren la navegación, paginación, filtros y actualización de cuentas.

## Revisión funcional

**Versión revisada:** 0.1  
**Decisión:** En implementación técnica por fases  
**Aprobó:** Equipo de Desarrollo / Asignado a JorgeDoicela  
**Fecha:** 2026-10-26  
