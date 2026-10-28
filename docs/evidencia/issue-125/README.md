# Evidencia del issue #125

Fecha: 2026-10-28. Rama: `fix/125-persistencia-ficha-personal`. Alcance: `docs/specs/spec-0015/` y ADR-0037.

## Cambios y criterios

- RF-PER-001: se recuperan provincia y cantón por `padreId`, y se reconstruyen las listas a partir de la parroquia persistida. Se cancela la carga anterior al cambiar la residencia y al destruir el componente. Descartar restaura la cascada; fallos de carga permiten reintentar sin borrar el id guardado.
- RF-PER-002: selector del catálogo de discapacidad; porcentaje y carné asociados; quitar el tipo limpia los dependientes.
- RF-PER-003: `Persona.Nombre` se actualiza con los cuatro valores normalizados de la ficha, en orden de apellidos y nombres. Un solo `SaveChangesAsync` persiste ambas tablas. Migración expansiva de 200 a 403 caracteres, necesaria para admitir cuatro campos válidos de 100 caracteres.
- RF-PER-004: confirmación `role="status"` y error `role="alert"` junto al botón de guardar. Cada nuevo intento limpia el éxito anterior. El error conserva cambios pendientes.
- RF-PER-005: integración con PostgreSQL 17 de Testcontainers y migraciones reales; comparación de todos los campos contra la tabla y una lectura nueva del servicio; segundo guardado, actualización y limpieza, nombre máximo, aislamiento institucional, propiedad de foto y rechazos sin cambios. Una restricción de prueba provoca un fallo real de escritura para verificar rollback de ambas tablas.

## Salida real de validación

- `dotnet build src/Backend --no-restore`: `Build succeeded. 0 Warning(s), 0 Error(s)`.
- `dotnet test src/Backend`: **677 aprobadas, 0 fallidas, 0 omitidas**: dominio 125, aplicación 134, WebApi 418. Incluye las tres nuevas pruebas de PostgreSQL; no se excluyó la categoría Integracion.
- `pnpm --dir src/Frontend build`: compilación de producción correcta. Advertencia existente: estilos de `admin-dashboard.component.ts`, 9,11 kB frente al presupuesto de advertencia de 6 kB.
- `pnpm --dir src/Frontend test:ci`: **41 archivos y 432 pruebas aprobadas**. JSDOM emite tres avisos de navegación no implementada; no hay fallos.
- `pnpm --dir src/Frontend lint`: `All files pass linting.`
- `pnpm --dir src/Frontend format:check`: `All matched files use Prettier code style!`
- La compilación regenera OpenAPI y cliente automáticamente; no hay cambios en esos artefactos porque el contrato HTTP sigue igual.

## Navegador

Chromium sobre el frontend compilado, API simulada y datos evidentemente ficticios.
Se comprobaron selectores de provincia/cantón/parroquia y discapacidad, envío de
parroquia y discapacidad completos, confirmación, recarga y segundo guardado,
error 503 sin éxito anterior y conservación de la edición pendiente. Sin errores
JavaScript. La persistencia real se verifica por separado con PostgreSQL arriba.

- [Ficha guardada](ficha-guardada.png)
- [Error de guardado](ficha-error.png)

No se desplegó ni se accedió a datos de producción. La validación por roles en
producción de #130 conserva su alcance independiente.
