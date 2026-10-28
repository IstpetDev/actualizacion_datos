# Evidencia — Issue #141

Fecha: 2026-10-28. Rama: `feature/141-pregunta-previa-discapacidad`.

## Alcance implementado

- Pregunta «¿Posee alguna discapacidad?» con controles nativos Sí/No y agrupación accesible.
- No oculta los detalles y envía tipo, porcentaje y carné vacíos con el contrato existente. La API ya persiste los campos omitidos como nulos en el PUT; no se añade una propiedad de respuesta que pudiera contradecirlos.
- Sí muestra los tres campos y exige un tipo vigente. Porcentaje y carné siguen siendo opcionales conforme a spec-0003 v0.4 y spec-0007; se mantienen porcentaje entero de 0 a 100 y carné de hasta 30 caracteres.
- Se retiran del selector «Ninguna», «Ninguno», «Sin discapacidad» y «No aplica» por etiqueta/código semántico, sin asumir identificadores globales. El catálogo del repositorio contiene «No aplica» con código externo 7.
- El tipo guardado permite rehidratar Sí/No sin modificar el esquema ni la API. Un antiguo «No aplica» sin detalles se muestra como No y se normaliza solo al guardar. Si tiene detalles, falta el tipo o está fuera del catálogo vigente, se conservan los datos y se pide revisión antes de guardar Sí.
- Alternar No/Sí conserva el borrador; los detalles se limpian después de guardar No con éxito. Descartar restaura respuesta y detalles; un fallo de guardado los conserva.
- La validación alcanza el botón de guardar, `guardarFicha`, `guardarCambios` y el registro compartido de formularios usado al enviar/navegar. Sí sin tipo no puede guardarse mediante «Guardar y continuar».
- Una respuesta tardía del catálogo respeta la elección y otras ediciones. Se evita que las señales de respuesta disparen una rehidratación que sobrescriba el borrador.
- Los valores `null` de una ficha sin discapacidad se normalizan para que, al elegir Sí, aparezca el texto de selección y no un selector vacío.

No se generó spec por indicación expresa del solicitante: su equipo la gestiona.
No hay cambios en backend, contratos, catálogos persistidos, dependencias ni arquitectura.

## Verificación local

Se siguió la guía de pruebas selectivas de AGENTS.md y CONTRIBUTING.md: primero el
componente y después toda la carpeta de hoja de vida por su relación con los
formularios registrados y la navegación.

- `pnpm --dir src/Frontend test:ci '--include=**/features/usuario/hoja-de-vida/**/*.spec.ts'`: **14 archivos, 244 pruebas aprobadas**, 0 fallidas. Un aviso de navegación no implementada de JSDOM; no es un fallo.
- Se cubren ambos caminos, tipo obligatorio con Sí, carné/porcentaje opcionales y sus límites, recarga, valores null, descarte, alternancia, datos históricos, cargas tardías, reintento del catálogo y fallo de guardado.
- `pnpm --dir src/Frontend build`: producción compilada correctamente. Permanece la advertencia existente de estilos de `admin-dashboard.component.ts`: 9,11 kB frente al presupuesto de advertencia de 6 kB.
- `pnpm --dir src/Frontend lint`: `All files pass linting.`
- `pnpm --dir src/Frontend format:check`: `All matched files use Prettier code style!`
- `git diff --check`: sin errores.

## Navegador y capturas

Chromium sobre la compilación de producción, con API simulada y datos claramente
ficticios. Tres guardados verificados: Sí con tipo y detalles, No sin ninguno de
los tres detalles, y corrección de un registro antiguo conservando su carné.
Se comprobaron recarga de ambos estados, alternancia sin pérdida del borrador,
exclusión de Ninguna/No aplica, bloqueo de Sí sin tipo y del envío a revisión,
normalización de null y revisión de un No aplica antiguo con información.
Sin errores JavaScript.

- [Sí: tipo y detalles conservados al recargar](discapacidad-si.png)
- [No: detalles ocultos](discapacidad-no.png)
- [Sí sin tipo: selección y validación visibles](discapacidad-sin-tipo.png)

Estas capturas no representan una prueba de PostgreSQL ni de producción. El
cambio utiliza la persistencia existente sin modificarla. La coordinación con
datos ficticios de #147 mantiene su alcance independiente.
