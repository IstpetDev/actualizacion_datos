# Issue #42 — Contratos de la hoja de vida (T-00)

**Spec:** `docs/specs/spec-0003/spec.md` (v0.4) · **Plan:** `docs/specs/spec-0003/plan.md`, «Diseño y contratos» · **Tarea:** T-00 de `tasks.md`
**Rama:** `feature/42-contratos-hoja-de-vida` · **Fecha:** 2026-10-22

Este documento es la guía para quien implementa T-01 a T-08: qué contrato quedó fijado, cómo fluyen los datos, qué error devuelve cada caso y qué cambiar al implementar. No hay lógica de negocio en este cambio: cada endpoint aplica el rol y responde **501** hasta que su tarea lo reemplace.

## Qué se entregó

| Capa | Archivo | Contenido |
|---|---|---|
| Application | `Modelos/ModelosHojaDeVida.cs` | DTO de entrada (`Guardar*Request`) y salida (`*Dto`) de ficha, ítems, documentos, faltantes y configuración |
| Application | `Servicios/IServicioHojaDeVida.cs` | Ficha e ítems del usuario (T-02) |
| Application | `Servicios/IServicioDocumentosPersonales.cs` | Documentos por requisito (T-03) |
| Application | `Servicios/IValidadorCompletitudEnvio.cs` | `IValidadorCompletitudEnvio`, `IReglaCompletitudEnvio`, `EnvioIncompletoException`, `RecursoNoEncontradoException` (T-04) |
| Application | `Servicios/IServicioConfiguracionHojaDeVida.cs` | Tipos y requisitos del admin (T-05) |
| WebApi | `Endpoints/*.cs` | Un archivo por grupo, con su `MapXxx` |
| WebApi | `Program.cs` | Seis líneas de registro y el 400 con faltantes de `POST /api/mis-datos/enviar` |
| Contrato | `openapi/v1.json`, `src/Frontend/src/app/api-client/index.ts` | Regenerados |
| Pruebas | `tests/.../WebApi.Tests/ContratosHojaDeVidaTests.cs` | Roles, 401, 501 y presencia de cada operación en el OpenAPI |

## Rutas, roles y tarea dueña

> **Integración con `develop` (2026-10-22):** catálogos (#48) y exportación (#46) se fusionaron antes que este contrato con sus propias interfaces, DTO (`ModelosCatalogo.cs`, `DescargaArchivoDto`) y rutas. Este PR conserva lo de `develop` y retira sus esqueletos equivalentes. Para validar un catálogo desde T-02 se usa la clase `ValidadorCatalogos` de #48 (`ValidarAsync(id, tipo)`), no una interfaz nueva.

Las secciones se expandieron en rutas explícitas (en vez de `{seccion}` genérico del plan) para que el OpenAPI tenga un cuerpo tipado por sección y el cliente generado tenga un método por operación.

| Método y ruta | Rol | Operación (cliente) | Tarea |
|---|---|---|---|
| `GET /api/catalogos/{tipo}?padreId=` | cualquiera con sesión | `consultarCatalogo` | **Implementado en #48** (T-01) |
| `POST /api/catalogos/{tipo}/importar` (multipart `archivo`) | `superadmin` | `importarCatalogo` | **Implementado en #48** (T-01) |
| `GET /api/mis-datos/hoja-de-vida` | `usuario` | `obtenerMiHojaDeVida` | T-02 |
| `GET` / `PUT /api/mis-datos/hoja-de-vida/ficha` | `usuario` | `obtenerMiFichaPersonal` / `guardarMiFichaPersonal` | T-02 |
| `POST /api/mis-datos/hoja-de-vida/titulos`, `PUT` y `DELETE .../titulos/{id}` | `usuario` | `agregarTituloAcademico`, `actualizar…`, `eliminar…` | T-02 |
| Igual para `titulos-en-curso`, `capacitaciones`, `experiencias`, `referencias` | `usuario` | `…TituloEnCurso`, `…Capacitacion`, `…ExperienciaLaboral`, `…Referencia` | T-02 |
| `GET /api/mis-datos/hoja-de-vida/faltantes` | `usuario` | `obtenerFaltantesEnvio` | T-04 |
| `GET /api/revision/{documento}/hoja-de-vida` | `supervisor`, `admin` | `obtenerHojaDeVidaParaRevision` | T-02 |
| `GET /api/mis-datos/documentos` | `usuario` | `listarMisDocumentosPersonales` | T-03 |
| `PUT /api/mis-datos/documentos/{tipoDocumentoId}` | `usuario` | `guardarMiDocumentoPersonal` | T-03 |
| `POST /api/mis-datos/iniciar-actualizacion` | `usuario` | `iniciarNuevaActualizacion` | T-06 |
| `GET` / `POST /api/configuracion/tipos-funcionario`, `PUT .../{id}` | `admin` | `listarTiposFuncionario`, `crear…`, `actualizar…` | T-05 |
| Igual para `tipos-documento` y `requisitos` | `admin` | `…TiposDocumento`, `…RequisitosDocumento` | T-05 |
| `PUT /api/personas/{id}/tipo-funcionario` | `admin` | `asignarTipoFuncionario` | T-05 |
| `GET /api/exportaciones/excel`, `GET /api/exportaciones/zip` | `admin` (y `superadmin`) | `exportarExcel`, `exportarZip` | **Implementado en #46** (T-08, #13) |

Cuenta bancaria (`/api/mis-datos/cuenta-bancaria`, `/api/revision/{documento}/cuenta-bancaria`) no está en T-00: la agrega T-10 (#45) con su propio archivo de endpoints y su propia línea en `Program.cs`.

## Flujo de datos

```text
Usuario (Angular)                       API                                   Base (PostgreSQL)
──────────────────                      ───                                   ─────────────────
1. GET /api/catalogos/Pais          ──► IServicioCatalogos.ListarAsync    ──► elementos_catalogo (sin institucion_id)
   GET /api/catalogos/Provincia?padreId=…  (selectores dependientes)
2. POST /api/archivos/subir (PDF)   ──► IServicioArchivos (ADR-0006)      ──► archivos_adjuntos  → devuelve ArchivoDto.Id
3. POST …/hoja-de-vida/titulos      ──► IServicioHojaDeVida
   { …, archivoId: <id del paso 2> }     ├─ Persona.AsegurarEdicionPermitida()   (RF-HDV-010)
                                         ├─ campaña abierta                      (RF-CAM-003)
                                         ├─ IValidadorCatalogos por cada *Id     (RF-HDV-001)
                                         ├─ archivo de la misma persona          (RF-HDV-006)
                                         └─ un solo SaveChanges              ──► titulos_academicos (filtro por institución)
4. GET …/hoja-de-vida/faltantes     ──► IValidadorCompletitudEnvio        ──► lee ficha, ítems, documentos, requisitos
5. POST /api/mis-datos/enviar       ──► ServicioDatosUsuario.EnviarARevision
                                         ├─ validador → EnvioIncompletoException → 400 EnvioIncompletoRespuesta
                                         └─ Persona.EnviarARevision()        ──► personas.estado_actualizacion = Enviado
6. Supervisor: GET /api/revision/{documento}/hoja-de-vida (solo lectura) y devolución con marcas por ítem (T-07)
```

## Contrato de errores

Todo archivo de `Endpoints/` debe envolver la llamada al servicio con `AccesoEndpoints.EjecutarAsync`, que traduce:

| Excepción | HTTP | Cuerpo | Cuándo lanzarla |
|---|---|---|---|
| `RecursoNoEncontradoException` | 404 | `MensajeRespuesta` | El id no existe, es de otra persona o de otra institución. **Nunca 403**: no se confirma que exista. |
| `EnvioIncompletoException` | 400 | `EnvioIncompletoRespuesta { mensaje, faltantes[] }` | Solo el validador de completitud. |
| `ReglaNegocioException` con «fuera del período» | 403 | `MensajeRespuesta` | Sin campaña abierta (mismo texto que el resto de la API). |
| `ReglaNegocioException` | 400 | `MensajeRespuesta` | Cualquier regla del dominio o del servicio (catálogo de otro tipo, fechas incoherentes, sexta referencia…). |

Sin sesión: 401. Rol no permitido: 403 con `MensajeRespuesta`.

`POST /api/mis-datos/enviar` declara `EnvioIncompletoRespuesta` para su 400. Solo la falta de datos (T-04) trae `faltantes`; los demás rechazos (tratamiento no aceptado, sin correo) siguen llegando como `MensajeRespuesta`, sin esa propiedad. El frontend lee `mensaje` en ambos casos y `faltantes` solo si viene.

### Faltantes al enviar

`FaltanteEnvioDto { seccion, codigo, mensaje, itemId? }`. Secciones: `ficha`, `formacion`, `referencias`, `titulos`, `capacitaciones`, `experiencias`, `documentos`, `cuenta-bancaria`. El `codigo` es estable para que el frontend marque el campo (p. ej. `ficha.primer-nombre`, `referencias.minimo-personales`, `item.sin-respaldo`, `documentos.obligatorio`). T-04 fija la lista de códigos en su PR.

Para no editar el validador cada vez, cada regla es una `IReglaCompletitudEnvio` registrada en el contenedor; el validador ejecuta todas y junta los faltantes. T-10 agrega la de la cuenta bancaria así.

## Notas para quien implementa cada tarea

1. **Reemplazar el 501.** En su archivo de `Endpoints/`, cambiar `AccesoEndpoints.NoImplementado(...)` por la llamada al servicio dentro de `AccesoEndpoints.EjecutarAsync`. No tocar `Program.cs` (la línea de registro ya está).
2. **Registrar el servicio** en `Infrastructure/RegistroDeInfraestructura.cs` (una línea `AddScoped`). Es el único archivo compartido; si dos PR lo tocan a la vez, el conflicto es de una línea.
3. **Quitar de `ContratosHojaDeVidaTests`** las filas de sus rutas en las pruebas de 501 y agregar pruebas de comportamiento (y la de aislamiento entre dos instituciones si lee o escribe hoja de vida).
4. **Mapeo de enumeraciones:** la API usa texto en minúsculas: `TipoParticipacion` = `asistente|aprobado|facilitador`; `Tipo` de referencia = `personal|familiar`; `Tipo` de catálogo = nombre de `TipoCatalogo` (`ListarCatalogo` acepta cualquier combinación de mayúsculas y rechaza números).
5. **Fechas:** `DateOnly` viaja como `"aaaa-MM-dd"`.
6. **Respaldo por ítem:** el archivo se sube primero con `POST /api/archivos/subir` **sin** `claveDestino` y luego se envía su id en `archivoId`. Sin clave, la limpieza al aprobar (#32, ADR-0006) borra el respaldo viejo cuando el ítem cambia de archivo o se elimina; con clave quedaría guardado para siempre.
7. **El usuario solo opera sobre sí mismo:** las rutas de `/api/mis-datos/hoja-de-vida` y `/api/mis-datos/documentos` no aceptan `?documento=`; el documento sale de la sesión.
8. **Regenerar el cliente** si cambia una firma: `pnpm --dir src/Frontend generar:api` (o `dotnet build` del WebApi en Debug).

## Pruebas ejecutadas

Entorno: Windows 11, .NET SDK 10.0.402, Node 24.21.0, pnpm 12.4.1.

| Comando | Resultado |
|---|---|
| `dotnet build src/Backend` | Compilación correcta, 0 errores, 0 advertencias |
| `dotnet test src/Backend` (con integración en PostgreSQL 17, tras integrar `develop`) | Domain 84/84, Application 2/2, WebApi 155/155 |
| `dotnet format src/Backend/Istpet.ActualizacionDatos.sln --verify-no-changes` | Sin cambios (con el árbol en LF, como en el CI) |
| `pnpm --dir src/Frontend test:ci` | 14 archivos, 87/87 |
| `pnpm --dir src/Frontend lint` | Sin errores |
| `pnpm --dir src/Frontend build` | Correcto |

Casos que cubre `ContratosHojaDeVidaTests` (del más simple al más estricto):

1. Cada ruta del usuario con sesión responde 501 y el mensaje cita spec-0003 (22 rutas).
2. Las mismas rutas sin sesión responden 401.
3. Las rutas del admin rechazan a `usuario` y `supervisor` con 403 y responden 501 al `admin` (10 rutas).
4. La revisión de hoja de vida: 403 al `usuario`, 501 al `supervisor` y al `admin`.
5. El documento OpenAPI publica las 33 operaciones nuevas de este contrato.

Las pruebas de catálogos y exportación son las de #48 y #46 (`CatalogosTests`, `ExportacionesTests`).

## Riesgos y pendientes

- `AccesoEndpoints` repite la resolución de actor y rol de `Program.cs`. Cuando todo `Program.cs` pase a `Endpoints/`, las funciones locales de `Program.cs` deben borrarse a favor de esta clase.
- La identidad sigue llegando por cookie o por las cabeceras `X-Actor`, `X-Rol`, `X-Institucion-Id` que ya usa la API. Las cabeceras permiten suplantar rol en un entorno expuesto; no es parte de este issue, pero conviene un issue aparte antes de producción.
- El reemplazo de `{seccion}` por rutas explícitas es un detalle de contrato, no cambia ningún requisito; se anota aquí y en el PR.
