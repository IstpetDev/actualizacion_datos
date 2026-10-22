# Issue #32 — Segunda campaña, archivos sustituidos y una sola vía de subida (T-06)

**Spec:** `docs/specs/spec-0003/spec.md` (PD-HDV-04) y `docs/specs/spec-0001/spec.md` (RF-FLU-005) · **ADR:** ADR-0006
**Rama:** `fix/32-flujo-actualizacion`, apilada sobre `feature/42-contratos-hoja-de-vida` (PR #47) · **Fecha:** 2026-10-22

## Problema y solución

| Regla | Antes | Ahora |
|---|---|---|
| RF-FLU-005: quien fue aprobado «vuelve a enviar una actualización» | No existía paso de «aprobado» a «borrador»: una persona aprobada no podía volver a actualizar | `Persona.IniciarNuevaActualizacion()` + `POST /api/mis-datos/iniciar-actualizacion`, solo desde «aprobado» y con campaña abierta (PD-HDV-04) |
| ADR-0006: «al aprobarse, los archivos que sustituye se eliminan» | `AprobarActualizacionAsync` solo cambiaba el estado | Al aprobar se borran, de la base y del disco, los archivos de la persona que ya no respaldan nada |
| Una sola vía de subida con validación de firma | `POST /api/mis-datos/archivos` guardaba solo el nombre en `personas.archivos_subidos_json` | Ruta, servicio, DTO y columna retirados; la única vía es `POST /api/archivos/subir` |

## Flujo de la segunda campaña

```text
Estado: Aprobado ── campaña abierta ──► GET /api/mis-datos/estado-edicion
                                         { puedeEditar: false, puedeIniciarNuevaActualizacion: true }
                                         El frontend muestra «Actualizar mis datos».
         │
         ▼ POST /api/mis-datos/iniciar-actualizacion   (sin parámetros: siempre la propia persona)
   ServicioDatosUsuario.IniciarNuevaActualizacionAsync
     ├─ sin campaña abierta ............................ 403 «fuera del período…»
     ├─ Persona.IniciarNuevaActualizacion()
     │    └─ estado distinto de Aprobado ............... 400 «…cuando la anterior ya fue aprobada»
     ├─ Auditoría «IniciarNuevaActualizacion» (con el id de la campaña)
     └─ SaveChanges ─────────────────────────────────── 200; estado = Borrador
         │
         ▼ La persona edita en el lugar (ADR-0010 dec. 11), reemplaza respaldos, envía.
   Supervisor aprueba ─► ServicioRevision.AprobarActualizacionAsync
     ├─ Persona.AprobarActualizacion()
     ├─ Busca archivos sustituidos (ver regla)
     ├─ Quita sus registros + auditoría «EliminarArchivosSustituidos» (cantidad)
     ├─ SaveChanges
     └─ Borra los archivos del disco (IAlmacenArchivos)
```

**Por qué el disco se limpia después de confirmar la base:** si el borrado físico falla, queda un archivo sin registro (basura recuperable); al revés quedaría un registro que apunta a un archivo inexistente, que rompería la descarga.

**Por qué no se reabre a todos al abrir la campaña:** PD-HDV-04 decidió una acción explícita por persona; pasar toda la nómina a borrador escribiría en masa y dejaría sin datos aprobados la exportación (PD-HDV-02).

## Regla de «archivo sustituido»

Un archivo de la persona se elimina al aprobar si cumple **las dos** condiciones:

1. **No tiene `claveDestino`.** Los respaldos de la hoja de vida se asocian por `archivo_id`; los archivos con clave (pantallas de spec-0002, p. ej. `cedula`) ya se reemplazan al subir otro con la misma clave (`ServicioArchivos`), así que nunca quedan duplicados.
2. **Nada lo referencia:** ni `archivo_id` de títulos, títulos en curso, capacitaciones, experiencias, referencias o documentos personales, ni `fichas_personales.foto_archivo_id`.

Casos que esto cubre: el respaldo viejo de un ítem al que se le asoció uno nuevo; el respaldo de un ítem eliminado; un archivo subido y nunca asociado.

> **Nota para T-02 y T-03:** sube los respaldos **sin** `claveDestino` y asócialos con `archivoId`. Si les pones clave, la limpieza no los toca y el viejo queda guardado para siempre.

## Cambios de API (cliente regenerado)

| Cambio | Efecto en el frontend |
|---|---|
| Nuevo `POST /api/mis-datos/iniciar-actualizacion` → `MisDatosClient.iniciarNuevaActualizacion()` | Botón «Actualizar mis datos» en el panel del usuario |
| `EstadoEdicionDto.puedeIniciarNuevaActualizacion` (nuevo, `false` por defecto) | El botón solo aparece cuando la API lo permite |
| Retirados `POST /api/mis-datos/archivos`, `SubirArchivoRequest` y `archivosSubidosJson` de `MisDatosDto` y `ExpedienteRevisionDto` | Solo se usaban en dos mocks de prueba; se quitaron |
| Mensaje de estado «aprobado» con campaña abierta | Indica que puede usar «Actualizar mis datos» |

Migración `RetirarArchivosSubidosJson`: elimina `personas.archivos_subidos_json`. El dato no se usaba para nada (guardaba el nombre del último archivo subido), así que no se pierde información útil. `Down` recrea la columna vacía.

## Pruebas

Entorno: Windows 11, .NET SDK 10.0.402, Docker 29.8.2 (PostgreSQL 17 por Testcontainers), Node 24.21.0, pnpm 12.4.1.

| Comando | Resultado |
|---|---|
| `dotnet build src/Backend` | 0 errores, 0 advertencias |
| `dotnet test src/Backend --filter "Categoria!=Integracion"` | Domain 88/88, Application 2/2, WebApi 137/137 |
| `dotnet test src/Backend --filter "Categoria=Integracion"` | 12/12 en PostgreSQL 17 (aplica las 7 migraciones, incluida la nueva) |
| `dotnet format --verify-no-changes` | Sin cambios |
| `pnpm --dir src/Frontend test:ci` | 87/87 |
| `pnpm --dir src/Frontend lint` / `build` | Sin errores / correcto |

### Casos, del más simple al más completo

**Dominio (`PersonaTests`)**

1. Desde «aprobado», `IniciarNuevaActualizacion` deja «borrador», editable, y se puede volver a enviar.
2. Desde «borrador», «enviado» y «devuelto» lanza la regla y **no cambia** el estado (3 casos).

**API (`SegundaCampanaYArchivosTests`, SQLite en memoria + disco temporal)**

3. Sin sesión → 401.
4. Aprobado con campaña: `estado-edicion` ofrece reabrir; `iniciar-actualizacion` → 200; queda «borrador»; `PUT /api/mis-datos` funciona; hay auditoría.
5. Aprobado sin campaña: no se ofrece reabrir; `iniciar-actualizacion` → 403 y sigue «aprobado».
6. Borrador, enviado, devuelto → 400 con el motivo y sin cambio (3 casos).
7. Aislamiento: misma cédula ficticia aprobada en dos instituciones y otra persona aprobada en la primera; solo cambia la propia persona de la institución de la sesión.
8. Limpieza al aprobar con seis archivos: se borra solo el que no usa nadie (base y disco); se conservan el respaldo del título, la foto, el respaldo del documento personal, el archivo con clave y el archivo sin uso **de otra persona**; la auditoría registra «1 archivo».
9. Aprobar sin archivos sustituidos no borra nada ni registra limpieza.
10. Ciclo de dos campañas: aprueba con respaldo v1 → reabre → sube v2 y lo asocia al mismo título → v1 sigue existiendo hasta la aprobación → al aprobar se borra v1 (base y disco) y queda v2.

**Vía única de subida (`FlujoRevisionTests`)**

11. `POST /api/mis-datos/archivos` responde 405 (la ruta ya no existe para POST).
12. Subir a nombre de otra persona por `POST /api/archivos/subir` → 403.

**Frontend (`usuario-dashboard.component.spec.ts`)**

13. Sin `puedeIniciarNuevaActualizacion` no hay botón y el método no llama a la API.
14. Con permiso, el botón llama a la API, pasa a «Borrador», habilita los campos y desaparece.
15. Si la API rechaza, se muestra el motivo y se conserva «Aprobado» sin habilitar edición.

**Integración en PostgreSQL:** las 12 pruebas existentes (filtro por institución, hoja de vida, campañas) pasan con la columna retirada.

## Riesgos y notas

- La aceptación del tratamiento de datos no se reinicia al reabrir: sigue vigente la ya registrada (RF-DAT-001 no pide renovarla por campaña). Si la institución lo exige, es un cambio de spec.
- Mientras T-02 y T-03 no publiquen sus endpoints, las pruebas de limpieza crean los ítems directo en la base.
- `RF-FLU-005` de spec-0001 quedó anotado con el nuevo paso (spec-0001 sigue en borrador).
