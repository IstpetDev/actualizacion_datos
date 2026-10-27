# ADR-0021 — Carga de catálogos en producción

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

Spec-0004 v0.2 fue aprobada explícitamente en esta conversación: «Aprobar la spec v0.2 e implementar todo su alcance». El issue #80 necesita CSV en producción, carga tras las migraciones y arranque que rechace catálogos incompletos. El importador ya conserva ids, no reactiva entradas y confirma por archivo.

## Opciones

1. Migración con miles de filas: duplica los CSV y complica mantener sus fuentes.
2. Descarga o importación manual por API: introduce una dependencia externa o una operación pendiente en cada instalación.
3. Incluir los CSV versionados en la distribución y ejecutar una carga explícita antes de iniciar Production.

## Decisión

Opción 3. El proyecto WebApi copia los CSV y el manifiesto como contenido a `catalogos/` en compilación y publicación. Docker construye el backend desde la raíz del repositorio con `-f src/Backend/Dockerfile`; un `.dockerignore` de lista permitida incluye solo backend y catálogos, excluyendo salidas y configuración local. Los builds de frontend conservan su contexto.

`--cargar-catalogos` reutiliza `ServicioCatalogos` y el cargador común, respeta el orden de padres, verifica archivos/hashes y disponibilidad y termina sin abrir HTTP. El despliegue lo ejecuta después de `--migrar` y antes de levantar la imagen nueva. Los fallos salen con código distinto de cero. No se descargan fuentes en el arranque. Los cambios de CSV disparan validación de backend en CI.

Al arrancar Production se comprueban los 21 tipos activos y las relaciones necesarias para país, geografía, IES, niveles/grados y UNESCO. Si faltan, el proceso falla antes de servir tráfico y registra el faltante sin datos de personas ni configuración sensible. `/health` conserva su contrato. `--migrar` no exige catálogos cargados y permite preparar una instalación vacía.

Se mantiene la transacción por CSV: un error no deja filas parciales del archivo que falló, pero no revierte archivos anteriores. El despliegue se detiene y puede reintentarse de forma idempotente. No se reactiva lo desactivado ni se eliminan entradas ausentes de un CSV.

## Consecuencias

Una instalación nueva tiene datos reproducibles antes del arranque. Un catálogo obligatorio completamente desactivado impide iniciar Production hasta corregirlo explícitamente. El comando de carga es una operación administrativa local del despliegue, no un permiso HTTP nuevo. El directorio opcional de carga permite pruebas de errores con archivos ficticios.

## ADR relacionados

- ADR-0005 — CI por niveles.
- ADR-0010 — Catálogos compartidos.
- ADR-0015 — Despliegue por etapas.
- ADR-0022 — Bancos e instituciones de educación superior.
