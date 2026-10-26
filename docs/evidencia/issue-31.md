# Issue #31 — Configuración de la hoja de vida (T-05)

Fecha: 2026-10-23. Rama: `feature/31-config-documentos`, desde `develop`.
Base funcional: spec-0003 v0.4 aprobada, tarea T-05; ADR-0004 y ADR-0010,
decisiones 6 y 7. La dependencia #42 está cerrada. Las propuestas de v0.5 no
forman parte de esta entrega.

## Cambio y comportamiento

- `ServicioConfiguracionHojaDeVida` implementa los contratos de T-00 y se registra
  en la infraestructura. Los endpoints de configuración dejan de responder 501.
- `GET`, `POST`, `PUT` y `DELETE` para tipos de funcionario, tipos de documento y
  requisitos. La baja usa el campo `Activo` existente; conserva personas,
  documentos y requisitos vinculados. El listado administrativo incluye inactivos
  para poder reactivarlos mediante `PUT`.
- Los códigos se normalizan a mayúsculas y siguen siendo claves estables, como en
  las entidades existentes. `PUT` cambia los campos que admite `Actualizar`; un
  cambio de código o de combinación del requisito devuelve 400 explícito.
- Los tipos y requisitos se validan dentro de la institución seleccionada, incluso
  para `superadmin`. Un identificador ajeno responde 404. Los índices existentes
  garantizan unicidad, también ante altas concurrentes; su violación se traduce a 400.
- Los permisos de los nuevos endpoints se comprueban con el rol de la sesión:
  `usuario` y `supervisor` reciben 403; sin sesión se recibe 401. Las cabeceras no
  permiten a un admin suplantar otra institución ni elevarse a superadmin.
- `PUT /api/personas/{id}/tipo-funcionario` asigna un tipo activo de la institución;
  un valor nulo quita la asignación.
- `PersonaCargaItem.TipoFuncionarioCodigo` es opcional. Un código explícito tiene
  prioridad sobre el cargo. Si no existe o está inactivo, se carga la persona sin
  tipo y se informa una advertencia sin reproducir el valor recibido (ADR-0012).
  Sin código se conserva la resolución por `CargoTrabajo`.
- `openapi/v1.json` y el cliente Angular se regeneran en el mismo cambio.

## Evidencia de los criterios

| Criterio | Prueba automática |
|---|---|
| Solo admin y superadmin | `Solo_admin_y_superadmin_incluso_con_cabeceras_suplantadas`: 13 rutas, sin sesión, usuario y supervisor |
| Código duplicado: 400 en la institución, permitido en otra | `Admin_crea_tipo_normalizado_y_rechaza_duplicado` y `Dos_instituciones_reutilizan_codigos_sin_ver_ni_modificar_datos_ajenos` |
| Aislamiento en lectura y escritura | Listados vacíos, actualización, baja, referencias y asignaciones ajenas rechazadas; ejecutado como admin y superadmin |
| Requisitos para todos y por tipo | `CRUD_y_requisitos_para_todos_y_por_tipo_conservan_referencias` |
| Cinco documentos de la versión aprobada sin depender del tipo | `Cinco_documentos_aprobados_aplican_sin_tipo_de_funcionario` |
| Tipo opcional durante la carga | `Codigo_de_tipo_es_opcional_tiene_prioridad_y_no_resuelve_tipos_ajenos_o_inactivos` |
| Integridad real en PostgreSQL | `PostgreSQL_preserva_unicidad_concurrente_y_requisito_para_todos_por_institucion`: altas simultáneas y rechazo de duplicado con tipo nulo por `NULLS NOT DISTINCT` |

La prueba inicial `Admin_crea_tipo_normalizado_y_rechaza_duplicado` falló con los
endpoints originales: esperaba `Created` (201), recibió `NotImplemented` (501).
La prueba pasa con la implementación.

La suite completa detectó una expectativa anterior a ADR-0012 en
`RF_ACC_001_y_PD_09_Admin_carga_personas_con_deduplicacion_y_coexistencia`.
Se actualizó para exigir una fila rechazada, en lugar de una omitida, cuando se
repite el documento dentro del archivo. El servicio ya tenía ese comportamiento
en `develop`; no se cambió la política de duplicados.

## Límites

La semilla automática era opcional y no se añade. El escenario aprobado se prueba
creando por API `CEDULA`, `PAPELETA_VOTACION`, `ANTECEDENTES_PENALES`,
`DECLARACION_JURAMENTADA` y `MECANIZADO_IESS` como obligatorios para todos.
No hay migración: se reutilizan entidades, campos e índices existentes.
Los códigos y las combinaciones de requisito dados de baja continúan reservados;
se recuperan reactivando el registro original.

## Validación local

Entorno: .NET SDK 10.0.402, Node 22.23.3, pnpm 12.4.1 y Docker con
PostgreSQL 17 mediante Testcontainers. Datos ficticios.

| Comando | Salida real final |
|---|---|
| `dotnet build src/Backend` | `Build succeeded. 0 Warning(s), 0 Error(s)`; regenera contrato y cliente |
| `DOTNET_PROCESSOR_COUNT=4 dotnet test src/Backend --no-build` | Application: 13; Domain: 102; WebApi: 230. **345 aprobadas, 0 fallidas, 0 omitidas**, incluidas las de integración |
| `NG_BUILD_MAX_WORKERS=2 corepack pnpm --dir src/Frontend test:ci` | `Test Files 27 passed (27); Tests 173 passed (173)` |
| `NG_BUILD_MAX_WORKERS=2 corepack pnpm --dir src/Frontend build --configuration development` | `Application bundle generation complete` |
| `corepack pnpm --dir src/Frontend lint` | `All files pass linting` |
| `corepack pnpm --dir src/Frontend format:check` | `All matched files use Prettier code style!` |
| `dotnet format src/Backend --no-restore --verify-no-changes` | Salida vacía, código 0 |
| `git diff --check` | Salida vacía, código 0 |

Una ejecución simultánea de las suites terminó con procesos interrumpidos: Vitest informó
`SIGKILL` y se abortó un proceso de pruebas .NET. Se repitieron por separado con
los límites de concurrencia anteriores; ambas suites terminaron completas y sin
fallos. No se modificaron configuraciones del proyecto ni del CI para hacerlo.
