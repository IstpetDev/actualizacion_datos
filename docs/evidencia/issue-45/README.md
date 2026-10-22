# Issue #45 — Cuenta bancaria cifrada y comparación con la nómina (T-10)

**Spec:** `docs/specs/spec-0003/spec.md` (RF-HDV-025 a 027, PD-HDV-14 y 17) · **ADR:** ADR-0013 (cerrado en el PR #41), ADR-0011, ADR-0004
**Rama:** `feature/45-cuenta-bancaria`, apilada sobre #49 (#32) y #47 (#42) · **Fecha:** 2026-10-22

## Qué se entregó

| Capa | Archivo | Qué hace |
|---|---|---|
| Dominio | `Domain/HojaDeVida/CuentaBancaria.cs` | Una cuenta por persona con `institucion_id`; estados y comparación por huella. Nunca ve el número en claro |
| Dominio | `TipoCatalogo.TipoCuentaBancaria` (20) y `TipoCatalogo.Banco` (21) | Catálogos compartidos (ADR-0013 dec. 2) |
| Aplicación | `IServicioCuentaBancaria`, `IProtectorCuentaBancaria`, `NumeroCuentaBancaria`, `ModelosCuentaBancaria.cs` | Contrato, normalización del número y DTO |
| Infraestructura | `ProtectorCuentaBancariaAesGcm` | AES-256-GCM para el número y HMAC-SHA256 para la huella |
| Infraestructura | `ServicioCuentaBancaria`, `ReglaCuentaBancariaObligatoria` | Reglas, auditoría y regla de completitud para T-04 |
| Persistencia | `CuentaBancariaConfiguracion`, migración `AgregarCuentaBancaria` | Tabla `cuentas_bancarias`, siembra de «Ahorros» (51) y «Corriente» (52) |
| API | `Endpoints/CuentaBancariaEndpoints.cs` | Seis rutas (abajo) |
| Frontend | `features/cuenta-bancaria/` | Cuenta del usuario, cuenta en el expediente del supervisor y estado de cuentas en el panel del admin |
| Despliegue | `docker-compose*.yml`, `.env*.example` | Variables de las claves (vacías); en desarrollo, claves temporales |

## Modelo y estados

`cuentas_bancarias`: `tipo_cuenta_id`, `banco_id` **o** `nombre_banco_otro` (la base exige exactamente uno), `numero_cifrado`, `ultimos_digitos` (4), `huella_numero`, `huella_nomina`, `estado`, `fecha_actualizacion_utc`. Índice único por `persona_id`.

| Estado (API) | Cuándo | Cómo se llega |
|---|---|---|
| `sin-confirmar` | Precargada desde la nómina | Carga de nómina (T-09) con `RegistrarPropuestaNominaAsync` |
| `coincide` | La versión de la persona es la de la nómina | Confirmar la propuesta, o escribir el mismo número |
| `difiere` | La persona escribió otro número | Corregir con un número distinto |
| `sin-nomina` | La registró la persona y no hay número de nómina | Registrar sin propuesta previa |
| `sin-registrar` (solo en la lista) | La persona no tiene cuenta | — |

**Desviación respecto de ADR-0013, a validar con quien lo cerró:** el ADR enumera tres estados. Se agregó `sin-nomina` porque **la nómina real que entrega la institución no trae columnas bancarias** (revisión del archivo de personal del 2026-10-22: 13 columnas, sin `tipo_cuenta_banco`, `banco` ni `num_cuenta_banco`). Sin ese estado, una cuenta registrada por la persona quedaría como «sin confirmar» para siempre o se marcaría como «coincide» sin haber comparado nada.

## Protección del número (ADR-0013 dec. 3 a 6)

```text
PUT /api/mis-datos/cuenta-bancaria { tipoCuentaId, numero: "0000-001 234", nombreBancoOtro }
  │
  ├─ NumeroCuentaBancaria.Normalizar → "0000001234" (solo dígitos, 6 a 20)
  ├─ IProtectorCuentaBancaria.Proteger
  │     ├─ cifrado  = "v1." + Base64(nonce[12] | AES-256-GCM(número) | etiqueta[16])   (datos asociados fijos)
  │     ├─ huella   = HMAC-SHA256(claveHuella, número) en hexadecimal (64)
  │     └─ últimos  = "1234"
  ├─ CuentaBancaria.RegistradaPorPersona / Corregir   (compara huella con huella_nomina)
  ├─ Auditoría «GuardarCuentaBancaria»: «Cuenta terminada en 1234; estado …» (sin el número)
  └─ 200 CuentaBancariaDto { numeroEnmascarado: "******1234", estado, … }   (nunca el número)

GET /api/mis-datos/cuenta-bancaria/numero   (solo el dueño, documento de la sesión)
  ├─ Descifrar; si la clave cambió o el dato fue alterado → 400 «vuelva a registrarlo»
  ├─ Auditoría «LeerNumeroCuentaBancaria» por cada lectura (sin el número)
  └─ 200 { numero } con Cache-Control: no-store
```

**Claves:** `CuentaBancaria:ClaveCifrado` (exactamente 32 bytes en Base64) y `CuentaBancaria:ClaveHuella` (32 bytes o más). En el servidor llegan como `CUENTA_BANCARIA_CLAVE_CIFRADO` y `CUENTA_BANCARIA_CLAVE_HUELLA` desde el `.env` (ADR-0011), que nunca se sube. Sin claves válidas, toda operación que cifra o descifra responde **503**. En desarrollo, `docker-compose.yml` activa `CuentaBancaria__PermitirClavesTemporales`: el backend genera claves en memoria y avisa en el log que **lo cifrado se pierde al reiniciar**.

> **Para quien administra el servidor (pendiente de ADR-0013, antes de producción):**
> 1. Generar dos claves distintas con `openssl rand -base64 32` y ponerlas en el `.env` del servidor.
> 2. Respaldarlas **aparte** de la base: sin `CUENTA_BANCARIA_CLAVE_CIFRADO` los números guardados son irrecuperables.
> 3. Cambiar `CUENTA_BANCARIA_CLAVE_HUELLA` rompe la comparación con nóminas ya cargadas.
> 4. Falta la base legal escrita (ADR-0013, puntos abiertos).

## Rutas

| Método y ruta | Rol | Respuesta | Errores |
|---|---|---|---|
| `GET /api/mis-datos/cuenta-bancaria` | dueño | `CuentaBancariaDto` o 204 | 401 |
| `PUT /api/mis-datos/cuenta-bancaria` | dueño, en borrador o devuelto, con campaña | `CuentaBancariaDto` | 400 regla, 403 sin campaña, 503 sin claves |
| `POST /api/mis-datos/cuenta-bancaria/confirmar` | dueño, ídem | `CuentaBancariaDto` (`coincide`) | 400 si no está «sin confirmar», 404 sin cuenta |
| `GET /api/mis-datos/cuenta-bancaria/numero` | dueño | `{ numero }`, sin caché, auditado | 404 sin cuenta, 400 no descifrable, 503 |
| `GET /api/revision/cuentas-bancarias` | supervisor, admin | Lista de personas con estado y últimos dígitos | 403 |
| `GET /api/revision/{documento}/cuenta-bancaria` | supervisor, admin | `CuentaBancariaDto` enmascarada o 204 | 403, 404 (otra institución o inexistente) |

## Notas para otras tareas

- **T-04 (validador de completitud, #30):** la regla `ReglaCuentaBancariaObligatoria` ya está registrada como `IReglaCompletitudEnvio`. El validador debe resolver `IEnumerable<IReglaCompletitudEnvio>` y juntar sus faltantes; produce `cuenta-bancaria.sin-registrar` o `cuenta-bancaria.sin-confirmar`. **Hasta que T-04 conecte el validador a `EnviarARevision`, la cuenta no bloquea el envío.**
- **T-09 (carga de nómina, #44):** traducir `tipo_cuenta_banco` y `banco` a ids de catálogo y llamar `RegistrarPropuestaNominaAsync(personaId, propuesta)` dentro de la misma unidad de trabajo; el método no hace `SaveChanges`. No sobrescribe una cuenta existente (devuelve `false`). **La nómina real no trae columnas bancarias:** la carga debe aceptar que falten las tres columnas sin advertir por cada fila.
- **T-01 (catálogos, #29):** los bancos (`TipoCatalogo.Banco`) se importan; mientras no haya bancos, la pantalla ofrece escribir el nombre. Los tipos de cuenta 51 y 52 ya están sembrados.
- **T-08 (exportación, #13):** exportar solo `numeroEnmascarado` y `estado` (ADR-0013 dec. 5); no llamar al descifrado.
- **T-12 (pantallas de revisión, #34):** `app-cuenta-bancaria-revision` y `app-estado-cuentas-bancarias` se pueden mover a las pantallas nuevas sin cambios.

## Pruebas

Entorno: Windows 11, .NET SDK 10.0.402, Docker 29.8.2, PostgreSQL 17 (Testcontainers y `docker compose`), Node 24.21.0, pnpm 12.4.1. Solo cuentas ficticias (`0000001234`, `0000005678`).

| Comando | Resultado |
|---|---|
| `dotnet build src/Backend` | 0 errores, 0 advertencias |
| `dotnet test src/Backend` (todas, con integración) | Domain 102/102, Application 2/2, WebApi 194/194 |
| `dotnet format --verify-no-changes` | Sin cambios |
| `pnpm --dir src/Frontend test:ci` | 16 archivos, 99/99 |
| `pnpm --dir src/Frontend lint` / `format:check` / `build` | Sin errores / correcto / correcto (el aviso de presupuesto de estilos del panel del supervisor ya existía en `develop`) |
| `node docs/evidencia/issue-45/flujo-e2e.mjs` contra `docker compose` | 30/30 (ver `resultado-e2e.txt`) |

### Casos, del más simple al más completo

**Dominio (`Domain.Tests/CuentaBancariaTests`, 14 casos):** registrada por la persona → `sin-nomina` y máscara; desde nómina → `sin-confirmar`; confirmar → `coincide`; solo se confirma lo que está sin confirmar; corregir compara con la huella de la nómina en cada cambio (difiere → coincide); sin nómina sigue `sin-nomina`; banco del catálogo o escrito, no ambos ni ninguno; tipo obligatorio; últimos dígitos válidos; número sin proteger rechazado.

**Protección (`ProtectorCuentaBancariaTests`, 19 casos):** normalización con espacios y guiones; rechazo de letras, puntos, menos de 6 y más de 20 dígitos; cifrado sin el número en claro y con prefijo `v1.`; dos cifrados del mismo número son distintos pero su huella es igual; la huella depende de la clave; un byte alterado, otra clave, otra versión o Base64 inválido no se descifran; sin claves no cifra (`CuentaBancariaNoDisponibleException`); la clave de cifrado debe tener exactamente 32 bytes; las claves temporales funcionan.

**API (`WebApi.Tests/CuentaBancariaTests`, 25 casos, SQLite):** 401 sin sesión; 204 sin cuenta y 404 al leer el número; registrar guarda cifrado, enmascarado y auditado sin el número; el dueño lee su número sin caché y cada lectura se audita; otra persona no lee un número ajeno; siete solicitudes inválidas → 400 sin guardar; banco del catálogo aceptado; enviado o aprobado → 400; sin campaña → 403 pero se puede consultar; propuesta de nómina → confirmar → difiere → coincide, con una sola copia cifrada; confirmar sin propuesta → 400 y sin cuenta → 404; la nómina no sobrescribe una cuenta registrada; el supervisor ve la lista y el detalle sin el número; el usuario no entra a la revisión; aislamiento entre instituciones; la regla de completitud pide registrar o confirmar; la regla está registrada; sin claves → 503.

**Integración en PostgreSQL 17:** la cuenta de A no se ve desde B; segunda cuenta para la misma persona rechazada por el índice único; la base rechaza dejar la cuenta sin banco aunque se escriba por fuera de la aplicación.

**Frontend (12 casos nuevos):** sin cuenta, aviso y tipos sembrados si el catálogo falla; fuera de edición, sin formulario ni confirmación; confirmar la propuesta; número completo solo a pedido y ocultable; guardar con banco escrito; guardar con banco del catálogo; error de la API visible sin perder lo escrito; 503 visible; lista del admin con resumen y sin números; error de permisos visible; cuenta en el expediente enmascarada o «sin registrar»; el expediente del supervisor muestra la cuenta.

### Recorrido E2E con la pila real

`docker compose up -d --build postgres backend` (claves temporales) y `node docs/evidencia/issue-45/flujo-e2e.mjs`. Datos ficticios. Cubre también #42 y #32:

| Bloque | Pasos verificados |
|---|---|
| 1. Admin | Crear institución; cargar dos personas ficticias; abrir campaña |
| 2. Contratos (#42) | Hoja de vida → 501; catálogo desconocido → 400; exportar como supervisor → 403 y como admin → 501; ruta retirada de #32 → 405 |
| 3. Cuenta del usuario | Sin cuenta → 204; letras → 400; registrar → `sin-nomina` y `******1234`; la respuesta no trae el número; el dueño lo lee; sin caché; otra persona no lo lee |
| 4. Archivos y envío (#32) | Subir sin clave y con clave; enviar; con la actualización enviada la cuenta no se modifica |
| 5. Supervisor | Lista y detalle sin números; el usuario no entra; otra institución → 404; aprobar; se borró el archivo sin uso y quedó el de clave |
| 6. Segunda campaña (#32) | Se ofrece reabrir; reabrir → 200; reabrir desde borrador → 400; corregir la cuenta en la nueva actualización |

Comprobaciones directas en la base y el disco del contenedor después del recorrido:

| Comprobación | Resultado |
|---|---|
| Migraciones aplicadas | 9 (incluidas `RetirarArchivosSubidosJson` y `AgregarCuentaBancaria`) |
| Columna `personas.archivos_subidos_json` | No existe |
| Filas de `cuentas_bancarias` con un número ficticio en claro | 0 (prefijo `v1.`, huella de 64 caracteres) |
| Filas de `auditorias` con un número ficticio | 0 |
| Auditoría | `GuardarCuentaBancaria` 2, `LeerNumeroCuentaBancaria` 1, `AprobarRevision` 1, `EliminarArchivosSustituidos` 1, `IniciarNuevaActualizacion` 1 |
| Archivos en la base y en el disco | 1 y 1 (el sin uso se borró de ambos) |
| Dueño de `/datos/archivos` | `app` (uid 1654) |

El recorrido descubrió que **toda subida fallaba en Docker por permisos** de la carpeta de archivos (también en producción). Se corrigió en #32; detalle en `docs/evidencia/issue-32/README.md`.

## Riesgos y pendientes

- ADR-0013 sigue en «Propuesto» en `develop` hasta que se fusione el PR #41; este PR depende de esa decisión.
- El estado `sin-nomina` no está en ADR-0013 (ver «Desviación»).
- Las cabeceras `X-Rol`, `X-Actor` y `X-Institucion-Id` siguen aceptándose sin sesión (señalado en #47). Con ellas, cualquiera podría pedir `/numero` en nombre de otra persona. **Debe resolverse antes de cargar cuentas reales.**
- Hasta T-04 la cuenta no bloquea el envío; hasta T-01 no hay lista de bancos.
