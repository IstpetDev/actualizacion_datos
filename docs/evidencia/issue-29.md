# Issue #29 — Catálogos oficiales

## Base y alcance de ejecución

Spec aprobada: `docs/specs/spec-0003/spec.md` v0.3, PR #40. Plan y tarea: `spec-0003/plan.md`, T-01 de `spec-0003/tasks.md`; recorrido E2E-09 de `spec-0003/test-e2e.md`. Rama `feature/29-catalogos`, desde develop después de #27 y #28. ADR-0010 decisión 5 y ADR-0003 vigentes; los ADR propuestos no se cierran.

El contrato de catálogos de T-00 se define con esta tarea en `Application/Modelos/ModelosCatalogo.cs` e `IServicioCatalogos.cs`. Los contratos de las otras tareas pertenecen a sus responsables. No se crean endpoints sin implementación ni se incluyen otras funcionalidades.

## Plan concreto

1. Pruebas de importación, consulta y permisos con cookie; prueba PostgreSQL para concurrencia y datos de desarrollo.
2. Servicio de catálogos: lectura CSV UTF-8 (cabecera codigo,nombre,codigo_padre,codigo_externo), máximo 1 MiB y 10.000 filas, validación completa, identidad tipo/código, padres de TipoPadre, actualización sin cambiar ids, nuevos ids >=1000. Las importaciones PostgreSQL se serializan mediante bloqueo de la tabla dentro de la transacción para reservar ids sin colisiones. Una fila ausente no elimina ni desactiva elementos; no se reactiva implícitamente un elemento inactivo ni se alteran semillas existentes.
3. Validador compartido que comprueba id, tipo y activo. Endpoints separados en `WebApi/Endpoints/CatalogosEndpoints.cs`: GET para cualquier cookie autenticada y POST importar solo con claim Superadmin, sin confiar en X-Rol. CSV multipart con el patrón ya utilizado por subida de archivos.
4. Migración aditiva de semillas: primaria y secundaria con sus grados, e instrucción profesional. Fuentes CSV en data/catalogos con trazabilidad, versiones y cobertura; no se inventan equivalencias con códigos de talento humano.
5. Carga automática explícita solo en Development tras migrar; Docker monta catálogos de solo lectura. Reutiliza el mismo importador y ordena padres antes que hijos. Sin descargas al arrancar, sin importación automática en producción.
6. Regenerar OpenAPI/cliente; compilar y probar ambos proyectos, formato y lint; arranque/reinicio Docker de desarrollo y recuentos; revisar contra develop, PR, CI, merge y cierre sin comentarios adicionales.

## Datos y fuentes

La spec aprobada propone códigos externos compatibles con talento humano. No se encontró una exportación pública de sus catálogos. El solicitante autorizó explícitamente el 2026-10-22 continuar, resolverlo y tomar/documentar las decisiones que mejor se ajusten. Para esta tarea se adoptan los códigos de las fuentes oficiales públicas verificadas; no se afirma equivalencia con ids internos de talento humano. Es una decisión de procedencia de datos bajo ADR-0010, sin cambio de arquitectura ni acceso a datos personales. El README de data/catalogos registra fuente, edición, cobertura, transformaciones y hash de cada recurso. Las semillas nuevas acordadas de primaria/secundaria e instrucción profesional no reciben códigos externos inventados.

## Resultados

Pendientes de ejecución sobre la implementación. No se considera completo el issue sin comprobar sus criterios, incluida la carga de catálogos en Docker y sus fuentes.
