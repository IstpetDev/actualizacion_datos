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

Verificación local realizada el 2026-10-22 sobre `feature/29-catalogos`, integrada con `develop` en `c312539` (exportación del PR #46). Se resolvieron los conflictos de registro de servicios, endpoints y archivos generados conservando ambas funcionalidades; Docker conserva tanto el volumen persistente de archivos como el montaje de catálogos de solo lectura.

| Comprobación | Resultado real |
| --- | --- |
| `dotnet build src/Backend` | Correcta: 0 advertencias, 0 errores; OpenAPI y cliente regenerados, incluidos exportación y catálogos. |
| `dotnet test src/Backend --no-build` | 173 aprobadas: Application 2, Domain 84, WebApi 87; 0 fallidas, 0 omitidas. Incluye integración PostgreSQL con Testcontainers. |
| `dotnet format src/Backend --verify-no-changes --no-restore` | Correcto, sin diferencias. |
| `pnpm test:ci` en Frontend | 87 aprobadas en 14 archivos. |
| `pnpm lint` y `pnpm format:check` en Frontend | Correctos, sin incidencias. |
| `pnpm build` en Frontend | Correcto. Advertencias existentes de presupuesto de estilos de admin y supervisor; no introducidas por esta tarea. |
| Construcción Docker del backend | Release y publicación correctas usando el Dockerfile del repositorio. |
| Compose de desarrollo, servicios postgres y backend | Ambos saludables; `/health` devuelve 200 y `{"estado":"ok"}`. GET de catálogos sin sesión devuelve 401. |
| Verificación de fuentes | Los 15 CSV coinciden con los recuentos y SHA-256 de `data/catalogos/fuentes.json`. |

### Criterios y permisos

`CatalogosTests.cs` ejecuta solicitudes HTTP con cookies reales en WebApplicationFactory y SQLite: importación repetida sin duplicados, actualización con id estable, padre de tipo incorrecto rechazado sin cambios parciales, filtro por padre, solo activos y orden del CSV. Comprueba todos los roles autenticados, denegación de importación al admin y demás roles, sesión anónima, y que `X-Rol` no concede privilegios. También cubre tipos inexistentes o combinados, CSV inválido, duplicados normalizados, UTF-8 estricto, BOM, comillas/comas/CRLF, límites, protección de semillas y conservación de inactivos. Comprueba el validador compartido y que producción no ejecuta la carga automática.

`CatalogosIntegracionTests.cs` carga los CSV completos en PostgreSQL 17, repite la carga conservando ids y valida las jerarquías y semillas. Una segunda prueba ejecuta importaciones concurrentes desde contextos distintos y comprueba que no colisionan ni duplican.

### Carga real en Docker

Se usó `docker compose --env-file /dev/null --project-name catalogos29 up --build --wait postgres backend`, con variables de prueba ficticias y sin leer `.env`. No se crearon personas ni se usaron credenciales institucionales. El montaje `/catalogos` está verificado como `ro`, `RW=false`.

Después del primer arranque y de `docker restart catalogos29-backend-1`, PostgreSQL devolvió:

```text
total=2104; ids_distintos=2104; semillas(id<1000)=27; primer_importado=1000
md5(tipo:codigo:id, ordenado por id)=57e351997a1db21b1bca375063610de3
padres_ausentes=0
```

La huella y los recuentos son iguales antes y después del reinicio. En el segundo arranque los 15 tipos cargados registraron `0 creados, 0 actualizados`. Las cuatro filas de primaria/secundaria de los CSV coinciden con las semillas y no se duplican.

| Tipo | Filas en PostgreSQL |
| --- | ---: |
| Pais | 248 |
| Provincia | 24 |
| Canton | 222 |
| Parroquia | 1315 |
| NivelAcademico | 9 |
| GradoAcademico | 9 |
| CampoAmplioUnesco | 10 |
| CampoEspecificoUnesco | 26 |
| CampoDetalladoUnesco | 97 |
| Universidad | 64 |
| Etnia | 9 |
| NacionalidadIndigena | 34 |
| Discapacidad | 7 |
| TipoBeca | 3 |
| FinanciamientoBeca | 4 |
| Sexo | 2 |
| EstadoCivil | 5 |
| TipoSangre | 8 |
| TipoCapacitacion | 8 |

### Límites documentados

Las fuentes y sus ediciones se detallan en [README de catálogos](../../data/catalogos/README.md). Los códigos públicos no se presentan como ids internos de talento humano; la cobertura de universidades es nacional. Las importaciones PostgreSQL se serializan por tabla, adecuado para esta operación administrativa ocasional. La carga automática es exclusivamente de desarrollo; producción requiere importación explícita del superadmin. El cliente conserva el formato generado por NSwag sin ediciones manuales.

E2E-09 se verificó mediante pruebas HTTP automatizadas, integración PostgreSQL y el arranque/reinicio real descrito; no se afirma una ejecución de pantallas ni de otros recorridos de spec-0003.
