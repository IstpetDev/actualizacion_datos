# Hoja de vida del personal — Plan de implementación

**Spec aprobado:** `spec.md` versión 0.4, aprobación explícita del revisor funcional (@JosephBano) en la sesión de trabajo del 2026-10-22; la 0.3 está en `develop` por el PR #38.  
**Plan:** versión 1.1  
**Objetivo:** que un docente complete su hoja de vida con valores de catálogo, certificados y cuenta bancaria; que el supervisor la revise por ítem; que el admin configure requisitos, cargue la nómina y exporte lo aprobado.  
**Áreas:** `src/Backend` y `src/Frontend`  
**Tecnologías:** .NET 10, EF Core con PostgreSQL 17, minimal API en `WebApi`, xUnit; Angular 22, pnpm, cliente OpenAPI generado con NSwag.

## Correspondencia con el spec

Rutas desde la raíz del repositorio. `B` = `src/Backend/src/Istpet.ActualizacionDatos`, `F` = `src/Frontend/src/app`. «Servicio» se refiere a una interfaz en `B.Application/Servicios` con su implementación en `B.Infrastructure/Servicios`; «endpoints» a un archivo nuevo en `B.WebApi/Endpoints/`.

| Requisito o escenario | Decisión de diseño | Archivo | Tarea | Verificación |
|---|---|---|---|---|
| RF-HDV-001 | `ServicioHojaDeVida.GuardarFicha` valida con `ValidadorCatalogos` que cada `*Id` sea un elemento activo del tipo esperado | `B.Application/Servicios/IServicioHojaDeVida.cs`, `B.Infrastructure/Servicios/ValidadorCatalogos.cs` | T-02 | Pruebas de servicio con elemento de otro tipo e inactivo |
| RF-HDV-002 | CRUD de títulos, títulos en curso, capacitaciones y experiencias con id propio | `B.WebApi/Endpoints/HojaDeVidaEndpoints.cs` | T-02 | Pruebas de servicio y de endpoint |
| RF-HDV-003, 004, 005 | Reglas ya en dominio; el servicio traduce `ReglaNegocioException` a error de validación | `B.Domain/HojaDeVida/*.cs` (existentes) | T-02 | Pruebas de dominio existentes + endpoint con 400 |
| RF-HDV-006 | El ítem recibe `archivo_id` de un archivo de la misma persona, ya subido bajo ADR-0006 | `B.Infrastructure/Servicios/ServicioHojaDeVida.cs` | T-02 | Prueba con archivo propio y ajeno |
| RF-HDV-007 | `GET` de documentos personales: tipos que aplican (su tipo y «todos») con indicador de obligatorio y estado | `B.WebApi/Endpoints/DocumentosPersonalesEndpoints.cs` | T-03 | Prueba con persona con y sin tipo |
| RF-HDV-008 | Registrar un documento de un tipo existente reemplaza el anterior, usando la unicidad de `documentos_personales` | `B.Infrastructure/Servicios/ServicioDocumentosPersonales.cs` | T-03, T-06 | Prueba de integración en PostgreSQL |
| RF-HDV-009 | `ValidadorCompletitudEnvio` devuelve la lista de faltantes; `EnviarARevision` la usa y falla con ese detalle | `B.Application/Servicios/IValidadorCompletitudEnvio.cs`, `B.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | T-04 | Pruebas por cada causa de faltante |
| RF-HDV-010 | Todo método de escritura de la hoja de vida llama `Persona.AsegurarEdicionPermitida` antes de cambiar | `B.Infrastructure/Servicios/ServicioHojaDeVida.cs` | T-02, T-03 | Prueba por sección con estado enviado y aprobado |
| RF-HDV-011 | Nuevo valor `TipoDestinoMarca.Item` con `ClaveDestino` estable `tipo:{id}` (por ejemplo `titulo:{guid}`) | `B.Domain/TipoDestinoMarca.cs`, `B.Infrastructure/Servicios/ServicioRevision.cs` | T-07 | Prueba de marca por ítem y lectura del usuario |
| RF-HDV-012 | CRUD de tipos de documento, tipos de funcionario y requisitos, con unicidad de código por institución | `B.WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs` | T-05 | Pruebas de unicidad y aislamiento |
| RF-HDV-013 | `ServicioPersonas` asigna `TipoFuncionarioId` de la misma institución | `B.Infrastructure/Servicios/ServicioPersonas.cs` | T-05 | Prueba con tipo de otra institución |
| RF-HDV-014 | `GET /api/catalogos/{tipo}?padreId=` solo activos, por `orden`; importación CSV para `superadmin` | `B.WebApi/Endpoints/CatalogosEndpoints.cs`, `B.Infrastructure/Servicios/ServicioCatalogos.cs` | T-01 | Pruebas de filtro, idempotencia y padre de otro tipo |
| RF-HDV-015 | Todo acceso pasa por el filtro global por institución; cada servicio nuevo tiene una prueba de aislamiento | `B.Infrastructure/Persistence/AplicacionDbContext.cs` (existente) | T-02, T-03, T-05, T-07, T-10 | Prueba de integración con dos instituciones |
| RF-HDV-016 | La exportación recorre las secciones; solo personas en «aprobado», con hoja «pendientes» (PD-HDV-02); columna `codigo_externo` opcional | `B.Infrastructure/Servicios/ServicioExportacion.cs` (nuevo) | T-08 | Prueba de Excel y `.zip` con una persona aprobada y una en actualización |
| RF-HDV-017 | CRUD de referencias personales y familiares sobre `ReferenciaPersonal`, con tope de cinco por tipo en el servicio | `B.WebApi/Endpoints/HojaDeVidaEndpoints.cs` | T-02 | Pruebas de servicio y de endpoint, incluida la sexta referencia del mismo tipo (rechazada) |
| RF-HDV-018, 019 | Reglas del validador: al menos dos referencias personales y al menos un estudio de cualquier nivel (PD-HDV-09) | `B.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | T-04 | Pruebas con una referencia, con familiares y sin estudio |
| RF-HDV-020 | Perfil en la ficha; foto como `FotoArchivoId` con validación de imagen | `B.Infrastructure/Servicios/ServicioHojaDeVida.cs` | T-02 | Prueba con PDF como foto (rechazada) |
| RF-HDV-021 | Carga con política de nulos y tabla de advertencias | `B.Infrastructure/Servicios/ServicioPersonas.cs`, `B.Application/Modelos/ModelosPersona.cs` | T-09 | Pruebas por columna vacía o inválida |
| RF-HDV-022 | `DivisorNombres` puro en `Application`, con los casos de ADR-0012 | `B.Application/Servicios/DivisorNombres.cs` | T-09 | Pruebas con los cinco casos del ADR |
| RF-HDV-023 | La ficha precargada no cuenta como verificada: el validador no distingue origen | `B.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | T-04, T-09 | Prueba de envío con ficha precargada incompleta |
| RF-HDV-024 | Regla del validador: todo título, capacitación y experiencia con `archivo_id` | `B.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | T-04 | Prueba por tipo de ítem sin archivo |
| RF-HDV-025 | `CuentaBancaria` con número cifrado y últimos cuatro dígitos; enmascarado fuera del dueño | `B.Domain/HojaDeVida/CuentaBancaria.cs`, `B.Infrastructure/Servicios/ServicioCuentaBancaria.cs` | T-10 | Pruebas de cifrado y de máscara |
| RF-HDV-026 | Huella (HMAC) del número de la nómina y estado sin confirmar, coincide o difiere | `B.Infrastructure/Servicios/ServicioCuentaBancaria.cs` | T-10 | Pruebas con confirmación igual y distinta |
| RF-HDV-027 | Vista de estado de cuenta por persona sin número; lectura del número completo auditada | `B.WebApi/Endpoints/CuentaBancariaEndpoints.cs`, `B.Infrastructure/Servicios/ServicioAuditoria.cs` | T-10, T-12 | Prueba de auditoría de lectura |
| Escenario 1 | Pantallas de la hoja de vida del usuario | `F/features/usuario/hoja-de-vida/` | T-11 | E2E-01, E2E-02 |
| Escenario 2 | Revisión por secciones con marca por ítem | `F/features/supervisor/revision/` | T-12 | E2E-05 |
| Escenario 3 | Configuración de requisitos del admin | `F/features/admin/configuracion/` | T-12 | E2E-06 |
| Escenario 4 | Carga de nómina con informe de advertencias | `F/features/admin/nomina/` (existente), `B.WebApi/Endpoints/` | T-09 | E2E-07 |
| PD-HDV-04 (decisión) | `Persona.IniciarNuevaActualizacion` pasa de «aprobado» a «borrador» con campaña abierta; endpoint explícito | `B.Domain/Persona.cs`, `B.WebApi/Endpoints/MisDatosEndpoints.cs` | T-06 | Pruebas de transición y de estados no permitidos |

Cada requisito está cubierto. No hay excepciones. ADR-0012 y ADR-0013 están Vigentes, así que T-09 y T-10 no están bloqueadas.

## Diseño y contratos

**Flujo.** El `usuario` trabaja contra `/api/mis-datos/hoja-de-vida`; cada guardado valida catálogos, comprueba que su actualización esté en borrador o devuelta y persiste con un único `SaveChanges`. El supervisor consulta `/api/revision/{documento}/hoja-de-vida` (solo lectura) y devuelve con marcas por ítem. El admin usa `/api/configuracion/...` y `/api/personas/cargar`. Los catálogos son `GET /api/catalogos/{tipo}` para cualquier rol autenticado.

**Contratos que se fijan primero (T-00 del orden de ejecución).** Antes de repartir tareas, el coordinador publica en un solo cambio las interfaces y los DTO de `B.Application`: `IServicioCatalogos`, `IServicioHojaDeVida`, `IServicioDocumentosPersonales`, `IValidadorCompletitudEnvio`, `IServicioConfiguracionHojaDeVida`, `IServicioExportacion` y los modelos de entrada y salida. Los endpoints se agrupan en un archivo por tarea dentro de `B.WebApi/Endpoints/`; `Program.cs` solo recibe una línea de registro por grupo, escrita por el coordinador, para evitar conflictos en un archivo de más de mil líneas.

| Grupo | Rutas | Roles |
|---|---|---|
| Catálogos | `GET /api/catalogos/{tipo}?padreId=`; `POST /api/catalogos/{tipo}/importar` (CSV) | Cualquier rol; importar solo `superadmin` |
| Hoja de vida del usuario | `GET/PUT /api/mis-datos/hoja-de-vida/ficha`; `GET/POST/PUT/DELETE /api/mis-datos/hoja-de-vida/{seccion}/{id}` con `seccion` = `titulos`, `titulos-en-curso`, `capacitaciones`, `experiencias`, `referencias` | `usuario` |
| Documentos personales | `GET /api/mis-datos/documentos`; `PUT /api/mis-datos/documentos/{tipoDocumentoId}` | `usuario` |
| Inicio de actualización | `POST /api/mis-datos/iniciar-actualizacion` | `usuario` |
| Revisión | `GET /api/revision/{documento}/hoja-de-vida`; marcas por ítem en `POST /api/revision/{documento}/devolver` | `supervisor`, `admin` |
| Configuración | `GET/POST/PUT /api/configuracion/tipos-funcionario`, `/tipos-documento`, `/requisitos`; asignar tipo en `PUT /api/personas/{id}/tipo-funcionario` | `admin` |
| Cuenta bancaria (tras ADR-0013) | `GET/PUT /api/mis-datos/cuenta-bancaria`; `GET /api/revision/{documento}/cuenta-bancaria` (estado, sin número) | `usuario`; `supervisor`, `admin` |

**Errores y permisos.** Una regla de negocio incumplida devuelve 400 con el mensaje de `ReglaNegocioException`; un identificador de otra institución devuelve 404, no 403, para no confirmar su existencia. El envío incompleto devuelve la lista de faltantes con su sección y, si es un ítem, su identificador.

**Estados.** Sin cambios en los estados existentes, salvo la transición nueva «aprobado» → «borrador» de `IniciarNuevaActualizacion` (PD-HDV-04). `EnviarARevision` agrega la comprobación del validador antes de pasar a «enviado».

**Validación en un solo lugar (ADR-0009).** La obligatoriedad vive en `ValidadorCompletitudEnvio`. El dominio solo protege coherencias internas. Los obligatorios de la ficha son los de PD-HDV-01 (spec v0.3).

## ADR aplicables y por redactar

| Decisión | ADR | Estado | Tareas condicionadas |
|---|---|---|---|
| Aislamiento por institución | `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Vigente | T-02, T-03, T-05, T-07, T-10 |
| Archivos de respaldo | `docs/decisiones/ADR-0006-almacenamiento-de-archivos.md` | Vigente | T-02, T-03, T-06 |
| Marcas por campo o archivo | `docs/decisiones/ADR-0008-granularidad-del-rechazo.md` | Vigente | T-07 |
| Hoja de vida estructurada | `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Vigente | Todas |
| Despliegue y secretos | `docs/decisiones/ADR-0011-despliegue-a-produccion.md` | Vigente | T-10 (ubicación de la clave) |
| Carga de nómina, nulos y nombres | `docs/decisiones/ADR-0012-carga-de-nomina-nulos-y-nombres.md` | Vigente (2026-10-22) | T-09 |
| Datos bancarios | `docs/decisiones/ADR-0013-datos-bancarios.md` | Vigente (2026-10-22) | T-10; la parte bancaria de T-09 |
| Campos configurables | `docs/decisiones/ADR-0009-campos-configurables.md` | Propuesto | Ninguna: se respetan sus restricciones, no se cierra |

ADR-0012 y ADR-0013 los cerró quien desarrolla (@JosephBano) el 2026-10-22. La carga de las columnas bancarias (parte de T-09) se hace cuando T-10 entregue la entidad `CuentaBancaria`.

## Mapa de archivos

| Área | Crear o modificar | Responsabilidad | Depende de |
|---|---|---|---|
| Backend | `B.Application/Servicios/I*.cs` y `B.Application/Modelos/ModelosHojaDeVida.cs` | Contratos y DTO | Ninguno (primero) |
| Backend | `B.Infrastructure/Servicios/ServicioCatalogos.cs` y `ValidadorCatalogos.cs` | Consulta, importación y validación de tipo de catálogo | Contratos |
| Backend | `B.Infrastructure/Servicios/ServicioHojaDeVida.cs` | Ficha e ítems, con bloqueo de edición | Contratos, catálogos |
| Backend | `B.Infrastructure/Servicios/ServicioDocumentosPersonales.cs` | Documentos por requisito y reemplazo | Contratos |
| Backend | `B.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | Faltantes al enviar | Ficha, ítems, documentos |
| Backend | `B.Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs` | Tipos y requisitos | Contratos |
| Backend | `B.Infrastructure/Servicios/ServicioExportacion.cs` | Excel y `.zip` por secciones | Ficha, ítems |
| Backend | `B.WebApi/Endpoints/*.cs` y una línea por grupo en `B.WebApi/Program.cs` | Rutas | Servicios |
| Backend | `B.Domain/Persona.cs`, `B.Domain/TipoDestinoMarca.cs` | Transición de estado y destino `Item` | Ninguno |
| Backend | `B.Application/Servicios/DivisorNombres.cs`, `ServicioPersonas.cs`, `ModelosPersona.cs` | Carga de nómina | T-04 |
| Backend | `B.Domain/HojaDeVida/CuentaBancaria.cs`, `ServicioCuentaBancaria.cs` | Cuenta bancaria | T-04 |
| Backend | `src/Backend/tests/*` | Pruebas de dominio, servicio e integración | Su tarea |
| Contrato | `openapi/v1.json` | Se regenera con `pnpm --dir src/Frontend generar:api` | Cada tarea que cambia la API |
| Frontend | `F/api-client/` | Cliente NSwag regenerado | `openapi/v1.json` |
| Frontend | `F/features/usuario/hoja-de-vida/` | Pantallas del usuario | Backend de T-02, T-03, T-04 |
| Frontend | `F/features/supervisor/revision/`, `F/features/admin/configuracion/` | Revisión por secciones y configuración | Backend de T-05, T-07 |

## Datos y migración

- **Migración de T-01:** siembra los grados de primaria y secundaria y el tipo de capacitación «instrucción profesional» (PD-HDV-06) en `elementos_catalogo`, con ids menores de 1000 como el resto de la semilla.
- **Migración de T-10:** tabla `cuentas_bancarias` con `institucion_id` y `persona_id`, y los catálogos `TipoCuenta` y `Banco`.
- **Sin migración:** T-02 a T-09, T-11 y T-12. El esquema de la hoja de vida ya existe (`AgregarHojaDeVida`, `AgregarReferenciasYPerfil`).
- **Una sola tarea por migración y en serie:** T-01 y T-10 no corren en paralelo entre sí ni con otra que toque el `ModelSnapshot`.
- **Compatibilidad:** `personas.datos_personales_json` se mantiene (ADR-0010 dec. 14) hasta que las pantallas nuevas reemplacen las de spec-0002.
- **Punto de confirmación:** cada operación de servicio hace un único `SaveChanges` al final; el envío a revisión confirma estado y validación juntos.

## Orden de ejecución e integración

1. **Contratos (coordinador, un solo PR):** interfaces, DTO y el esqueleto de los archivos de `Endpoints/`. Nada paralelo antes de esto.
2. **Base independiente, en paralelo:**
   - T-01 (catálogos y su migración).
   - T-05 (configuración del admin).
   - T-06 (flujo: transición, archivos reemplazados, subida duplicada).
3. **Hoja de vida (después de T-01 para validar catálogos):** T-02 y T-03 en paralelo; luego T-04 y T-07.
4. **Exportación (T-08)** después de T-02.
5. **Frontend:** T-11 después de T-02, T-03 y T-04; T-12 después de T-05 y T-07.
6. **Después de T-04:** T-09 y T-10 pueden ir en paralelo, cada una en su propio PR. T-10 es la única que toca el `ModelSnapshot` en este tramo.
7. **Cierre:** T-13 ejecuta `test-e2e.md` completo.

Archivos exclusivos por tarea: cada servicio y cada archivo de `Endpoints/` pertenece a una sola tarea. `Program.cs`, `openapi/v1.json`, el cliente generado y el `ModelSnapshot` son de integración: los toca el coordinador al unir, o las tareas en serie.

## Riesgos y decisiones pendientes

| Riesgo o punto abierto | Efecto | Acción y responsable |
|---|---|---|
| Base legal escrita y gestión de la clave de cifrado de ADR-0013 | Sin ellas, la cuenta bancaria no debe ir a producción | @JosephBano (base legal); quien administre el servidor (clave) |
| Carga de trabajo concentrada en @AlexanderMartinez0410 (T-02, T-03, T-04, T-07, T-12) | Retraso de toda la hoja de vida | Repartir T-03 y T-07; el coordinador lo propone en `tasks.md` |
| PD-HDV-01, 06 y 08 por contrastar con el sistema de talento humano | Lista de obligatorios o valores de participación pueden cambiar | @AnthonyPilatasig contrasta con `Profesores.cs` y `CursosProfesores.cs` antes de T-04 |
| Catálogos grandes sin fuente cargada | Selectores vacíos en las pantallas | Responsables de PD-HDV-03; T-01 los importa |
| «Teléfono 2» sin aclarar | La regla por patrón de ADR-0012 puede equivocarse | Preguntar a la institución antes de T-09; @JosephBano |
| Cambio a `Persona` por PD-HDV-04 | Toca la entidad de seguridad | Una sola tarea (T-06) con pruebas de todos los estados; anotar en spec-0001 |
| Una sola persona con acceso al sistema de talento humano para estructura | Falta de contraste | @AnthonyPilatasig |
| `Program.cs` crece | Conflictos de merge | Un archivo por grupo en `Endpoints/` y una línea de registro |

## Comprobación del plan

- [x] Las rutas y tecnologías coinciden con el código actual de `src/Backend` y `src/Frontend` (servicios en `Application/Servicios` e `Infrastructure/Servicios`, endpoints en `WebApi`, pantallas en `features/*`).
- [x] Los ADR vigentes se respetan; ADR-0012 y ADR-0013 están cerrados y sus tareas libres.
- [x] Cada requisito del spec está cubierto, sin excepciones.
- [x] Las tareas tienen dependencias y límites de edición claros (ver `tasks.md`).
- [x] Las pruebas de unidad, integración y E2E verifican comportamientos distintos (ver `test-e2e.md`).
