# Fundación del producto — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.1  
**Plan:** `docs/superpowers/plans/2026-10-20-fundacion-repositorio.md`  
**Responsable de ejecución:** @AlexanderMartinez0410  
**Ambiente:** local con WebApplicationFactory (.NET 10 en memoria) y Angular 22 Vitest (`develop`), sobre commit `9d1f80b` / rama `test/14-pruebas-e2e-spec-0001`.

## Preparación

Las pruebas se ejecutan contra la API de .NET 10 y la suite de componentes Angular, empleando exclusivamente datos ficticios y aislados (documentos `1700000001`, `1700000098`, `1700000099`, correos `docente1@ejemplo.test`, `supervisor@ejemplo.test`). No se utilizan credenciales ni datos personales reales.

El almacenamiento de archivos opera sobre el directorio aislado en disco `almacen_archivos/` gestionado por `AlmacenArchivosDisco`. Las notificaciones por correo operan con el servicio en memoria y registro de tokens criptográficos `IServicioAutenticacion`.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| WebApi .NET 10 | `src/Backend` con SQLite in-memory y WebApplicationFactory | Base limpia inicializada con `db.Database.EnsureCreated()` |
| Angular 22 | `src/Frontend` con Vitest en modo CI (`pnpm test:ci`) | 17 archivos de especificación, 108 pruebas pasando |
| Almacén de archivos | `IAlmacenArchivos` en disco por institución (`ADR-0006`) | Estructura temporal por institución y persona |
| Aislamiento de esquemas | `ContextoInstitucion` y filtro multitenant (`ADR-0004`) | Filtrado automático por `institucion_id` en consultas EF Core |

---

## Matriz de cobertura

| Caso | Requisito y escenario del spec | Suite / Tarea | Tipo de recorrido | Evidencia esperada |
|---|---|---|---|---|
| **E2E-01** | RF-ACC-002, RF-ACC-003, RF-ACC-005, RF-CAM-002, RF-DAT-001, RF-FLU-001, RF-DAT-002; **Escenario 1** | `Spec0001E2ETests.cs` / `AutenticacionTests.cs` / Frontend | Recorrido principal de usuario, entradas inválidas y permisos | Login inicial exige cambio; bloqueo antes de cambiar; validación de clave; verificación de correo; borrador editable; archivo subido; consentimiento obligatorio; envío exitoso; bloqueo posterior |
| **E2E-02** | RF-FLU-002, RF-FLU-003, RF-FLU-004, RF-FLU-006, RF-MUL-003; **Escenario 2** | `Spec0001E2ETests.cs` / `FlujoRevisionTests.cs` | Recorrido de supervisor y ciclo de vida de devolución | Lista de pendientes visible solo para su institución; rechazo sin observación prohibido; devolución con marcas; usuario corrige y reenvía; aprobación final |
| **E2E-03** | RF-EXP-001, RF-EXP-002, RF-EXP-003, RF-EXP-004, RF-DAT-004, RF-DAT-005; **Escenario 3** | `Spec0001E2ETests.cs` / `ExportacionesTests.cs` | Permisos, generación documental y auditoría | Usuario y supervisor reciben 403; admin genera Excel y ZIP estructurado (`INDICE.md` y archivos); aislamiento de institución B; auditoría sin contraseñas |
| **E2E-04** | RF-MUL-001, RF-MUL-002, RF-ACC-001, RF-MUL-004, RF-ACC-004; **Escenario 4** | `Spec0001E2ETests.cs` / `CampanasPersonasIntegracionTests.cs` | Operación multitenant y administración | Superadmin crea instituciones y asigna admins; admin carga nómina; deduplicación de DNI; 401 sin revelar existencia; habilitación de acceso; auditoría transversal |
| **E2E-05** | RF-CAM-001, RF-CAM-003, RF-CAM-004, RF-FLU-005 | `Spec0001E2ETests.cs` / `SegundaCampanaYArchivosTests.cs` | Límites temporales y persistencia | Fecha fin menor a inicio rechazada; fuera de campaña solo lectura y 403 al editar/subir; borrador conservado al vencer; versión única aprobada sin historial |

### Cobertura complementaria por pruebas de componentes y dominio
- **RF-DAT-003 (Descarga segura de archivos):** Verificado en `ArchivosTests.cs` (rutas autenticadas y verificación de rol/institución, ruta pública inexistente).
- **RF-ACC-004 (Protección contra fuerza bruta y mensaje genérico):** Verificado en `AutenticacionTests.cs` (bloqueo temporal tras 5 intentos fallidos y mensajes idénticos para cédula inexistente o deshabilitada).
- **RF-MUL-003 (Aislamiento de base de datos):** Verificado adicionalmente en `FiltroInstitucionIntegracionTests.cs` (PostgreSQL 17 con Testcontainers).

---

## E2E-01 — Primer ingreso y actualización completa

**Precondición:** Institución «Instituto Ficticio Central» creada; persona ficticia `1700000001` registrada con contraseña inicial igual a su documento; campaña de actualización activa.  
**Datos:** Documento `1700000001`, contraseña temporal `1700000001`, nueva contraseña `ClaveSegura2026!`, correo ficticio `docente1@ejemplo.test`, PDF ficticio `%PDF-1.4 documento ficticio`.  
**Pasos:**
1. Iniciar sesión con documento `1700000001` y clave inicial `1700000001` en `/api/auth/login`.
2. Verificar que la respuesta devuelve `debeCambiarContrasena: true` y que cualquier intento de acceder a rutas de negocio (p. ej. `/api/campanas`) es bloqueado con HTTP 403 Forbidden (RF-ACC-002).
3. Intentar cambiar la contraseña usando el mismo valor del documento o una clave menor a 8 caracteres en `/api/auth/cambiar-clave`; verificar rechazo con HTTP 400 Bad Request (RF-ACC-003).
4. Establecer una nueva contraseña segura (`ClaveSegura2026!`) y verificar respuesta HTTP 200 OK (RF-ACC-003).
5. Solicitar envío y verificación de código de confirmación al correo `docente1@ejemplo.test` en `/api/auth/enviar-codigo-correo` (RF-ACC-005).
6. Guardar borrador de datos de contacto mediante `PUT /api/mis-datos` (RF-CAM-002).
7. Subir archivo PDF de respaldo asociado a la cédula mediante `POST /api/archivos/subir?claveDestino=cedula` (RF-CAM-002, RF-DAT-003).
8. Intentar enviar a revisión mediante `POST /api/mis-datos/enviar` sin haber aceptado el consentimiento; verificar rechazo con HTTP 400 Bad Request (RF-DAT-001).
9. Registrar la aceptación explícita del tratamiento de datos mediante `POST /api/mis-datos/aceptar-tratamiento` y comprobar registro de fecha UTC (RF-DAT-001).
10. Enviar la actualización a revisión mediante `POST /api/mis-datos/enviar`; verificar estado `Enviado` (RF-FLU-001).
11. Intentar modificar datos personales o subir archivos adicionales tras el envío; verificar bloqueo con HTTP 400 Bad Request (RF-FLU-001).
12. Como otro usuario `1700000002`, intentar consultar los datos de `1700000001`; verificar rechazo con HTTP 403 Forbidden (RF-DAT-002).

**Resultado esperado:** El usuario inicial es forzado a cambiar su clave, verifica su correo, completa su borrador, adjunta archivos, acepta el consentimiento y envía a revisión; tras el envío la edición queda estrictamente bloqueada y sus datos aislados de otros usuarios.  
**Resultado obtenido:** Aprobado en `Spec0001E2ETests.E2E_01_Escenario_1_Primer_ingreso_actualizacion_y_bloqueo_al_enviar`.  
**Evidencia:** Ejecución de prueba unitaria y de integración en .NET 10; respuesta HTTP 200/400/403 en cada aserción.  
**Fecha y ejecutor:** 2026-10-22; @AlexanderMartinez0410.  
**Incidencia:** Ninguna.

---

## E2E-02 — Revisión, devolución con observaciones y aprobación

**Precondición:** Actualización de datos de `1700000001` en estado `Enviado`; supervisor de la misma institución `1700000098`; supervisor de otra institución B `1700000097`; campaña activa.  
**Datos:** Observación general «Favor corregir el número de teléfono celular.», marca en campo «telefono».  
**Pasos:**
1. Supervisor A consulta expedientes en `/api/revision/pendientes`; verifica que el expediente de `1700000001` está listado (RF-FLU-002, RF-FLU-006).
2. Supervisor B de otra institución consulta `/api/revision/pendientes`; verifica que el expediente de `1700000001` no es visible (RF-FLU-006, RF-MUL-003).
3. Supervisor A intenta devolver la actualización sin indicar texto de observación en `/api/revision/1700000001/devolver`; verificar rechazo con HTTP 400 Bad Request (RF-FLU-003).
4. Supervisor A envía devolución con observación general y marca en campo «telefono»; el estado pasa a `Devuelto` (RF-FLU-003).
5. El usuario `1700000001` consulta `/api/mis-datos/observaciones`; comprueba que se visualiza la observación y marcas de la ronda 1 (RF-FLU-003).
6. El usuario corrige su número de teléfono en `/api/mis-datos` y vuelve a enviar a revisión con `POST /api/mis-datos/enviar`; el estado pasa a `Enviado` (RF-FLU-004).
7. Supervisor A aprueba el expediente corregido mediante `POST /api/revision/1700000001/aprobar`; el estado de la persona pasa a `Aprobado` (RF-FLU-002).

**Resultado esperado:** Devolución controlada con motivo obligatorio, marcas visibles para el usuario, corrección permitida en estado Devuelto y aprobación satisfactoria.  
**Resultado obtenido:** Aprobado en `Spec0001E2ETests.E2E_02_Escenario_2_Revision_devolucion_con_observaciones_y_aprobacion`.  
**Evidencia:** Ejecución xUnit; transiciones de estado `Enviado -> Devuelto -> Enviado -> Aprobado` verificadas.  
**Fecha y ejecutor:** 2026-10-22; @AlexanderMartinez0410.  
**Incidencia:** Ninguna.

---

## E2E-03 — Exportación Excel y ZIP, permisos y auditoría

**Precondición:** Institución A con docente `1700000001` en estado `Aprobado` y archivo `cedula_juan.pdf` en disco; institución B con docente `1700000090` en estado `Aprobado`.  
**Datos:** Rol `Admin` (`1700000099`), rol `Supervisor` (`1700000098`), rol `Usuario` (`1700000001`).  
**Pasos:**
1. Usuario y supervisor intentan solicitar `/api/exportaciones/excel` y `/api/exportaciones/zip`; verificar que ambos reciben HTTP 403 Forbidden (RF-EXP-003).
2. Admin de institución A solicita `/api/exportaciones/excel`; verificar HTTP 200 OK con tipo MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y bytes de libro generados (RF-EXP-001).
3. Admin de institución A solicita `/api/exportaciones/zip`; verificar HTTP 200 OK con tipo MIME `application/zip` (RF-EXP-002).
4. Abrir el archivo `.zip` en memoria y comprobar la presencia del archivo índice en Markdown `instituto_tecnologico_central_YYYYMMDD_HHMMSS_datos/INDICE.md` y la carpeta de la persona aprobada (RF-EXP-002).
5. Comprobar que el `.zip` no contiene carpetas, archivos ni menciones al docente de la institución B `1700000090` (RF-EXP-004).
6. Consultar la tabla de auditoría y comprobar que se registraron los eventos `ExportacionExcel` y `ExportacionZip`, sin presencia de contraseñas ni hashes sensibles (RF-DAT-004, RF-DAT-005).

**Resultado esperado:** Solo el administrador puede exportar; el paquete ZIP y el libro Excel se generan con la estructura reglamentaria, respetando el aislamiento estricto por institución y auditando las operaciones sin exponer datos confidenciales.  
**Resultado obtenido:** Aprobado en `Spec0001E2ETests.E2E_03_Escenario_3_Exportacion_Excel_y_Zip_permisos_y_auditoria`.  
**Evidencia:** Descompresión en memoria de `ZipArchive` y verificación de entradas; aserción de registros de auditoría en base de datos.  
**Fecha y ejecutor:** 2026-10-22; @AlexanderMartinez0410.  
**Incidencia:** Ninguna.

---

## E2E-04 — Alta de institución, carga de personas y multitenancy

**Precondición:** Rol `Superadmin`.  
**Datos:** Institución «Instituto Tecnológico Nacional», administrador `1700000099`, nómina con personas `1710000001` y `1710000002`, fila duplicada intencional con `1710000001`.  
**Pasos:**
1. Superadmin crea una nueva institución mediante `POST /api/instituciones` asignando a su administrador inicial (RF-MUL-001).
2. Admin de la institución carga nómina mediante `POST /api/personas/cargar` conteniendo 3 registros (2 personas únicas y 1 duplicado en el mismo envío); verificar que la respuesta indica `totalRecibidos: 3`, `totalCargados: 2`, `totalRechazados: 1` (RF-ACC-001, ADR-0012).
3. Admin envía una segunda carga con una persona que ya existía previamente en la institución; verificar que se omite automáticamente indicando `totalDuplicadosOmitidos: 1` e idempotencia sin sobreescritura (PD-09).
4. Intentar autenticación con un documento inexistente `9999999999`; verificar HTTP 401 Unauthorized con mensaje genérico («Credenciales incorrectas o usuario no habilitado») que no revela su existencia (RF-ACC-004).
5. Intentar login con la persona recién cargada `1710000001` antes de ser habilitada; verificar rechazo con HTTP 401 Unauthorized (RF-ACC-004, RF-MUL-002).
6. Superadmin habilita el acceso de la persona mediante `POST /api/instituciones/{id}/habilitar-personas` (RF-MUL-002).
7. La persona habilitada inicia sesión con su documento; verificar acceso concedido con `debeCambiarContrasena: true` (RF-MUL-002, RF-ACC-002).
8. Verificar que las operaciones transversales del superadmin quedaron registradas en la auditoría con los eventos `CREAR_INSTITUCION` y `HABILITAR_PERSONAS` (RF-MUL-004).

**Resultado esperado:** Creación multitenant limpia, ingesta de nómina deduplicada, protección contra sondeo de credenciales, habilitación de accesos por superadmin y auditoría de eventos.  
**Resultado obtenido:** Aprobado en `Spec0001E2ETests.E2E_04_Escenario_4_Alta_de_institucion_carga_de_nomina_y_aislamiento_multitenant`.  
**Evidencia:** Ejecución xUnit; respuestas de API y registros de auditoría verificados.  
**Fecha y ejecutor:** 2026-10-22; @AlexanderMartinez0410.  
**Incidencia:** Ninguna.

---

## E2E-05 — Reglas de campaña, fechas inválidas y conservación de borrador

**Precondición:** Rol `Admin` de institución «Instituto Campanas»; usuario con borrador registrado.  
**Datos:** Fechas de campaña inválidas (fecha fin anterior a fecha inicio), campaña expirada.  
**Pasos:**
1. Admin intenta registrar campaña con fecha fin anterior a inicio mediante `POST /api/campanas`; verificar rechazo con HTTP 400 Bad Request (RF-CAM-001).
2. Sin campaña activa en la institución (o con campaña vencida), el usuario consulta sus datos; verificar que la interfaz y la API muestran la información en solo lectura (`puedeEditar: false`) (RF-CAM-003).
3. Intentar guardar datos mediante `PUT /api/mis-datos` o subir archivos mediante `POST /api/archivos/subir` fuera de campaña; verificar que la API responde HTTP 403 Forbidden (RF-CAM-003).
4. Comprobar que tras el vencimiento de la fecha fin de una campaña, un borrador existente no es enviado automáticamente y se preserva íntegro en estado `Borrador` (RF-CAM-004).

**Resultado esperado:** Validación temporal estricta de campañas, bloqueo de modificaciones en periodos cerrados y protección del borrador del usuario sin envíos automáticos no consentidos.  
**Resultado obtenido:** Aprobado en `Spec0001E2ETests.E2E_05_Reglas_de_campana_fechas_invalida_y_conservacion_de_borrador`.  
**Evidencia:** Ejecución xUnit y validación de respuestas HTTP 400 y 403.  
**Fecha y ejecutor:** 2026-10-22; @AlexanderMartinez0410.  
**Incidencia:** Ninguna.

---

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| **E2E-01** | Aprobado | `Spec0001E2ETests.E2E_01_Escenario_1_Primer_ingreso_actualizacion_y_bloqueo_al_enviar` | Ninguna |
| **E2E-02** | Aprobado | `Spec0001E2ETests.E2E_02_Escenario_2_Revision_devolucion_con_observaciones_y_aprobacion` | Ninguna |
| **E2E-03** | Aprobado | `Spec0001E2ETests.E2E_03_Escenario_3_Exportacion_Excel_y_Zip_permisos_y_auditoria` | Ninguna |
| **E2E-04** | Aprobado | `Spec0001E2ETests.E2E_04_Escenario_4_Alta_de_institucion_carga_de_nomina_y_aislamiento_multitenant` | Ninguna |
| **E2E-05** | Aprobado | `Spec0001E2ETests.E2E_05_Reglas_de_campana_fechas_invalida_y_conservacion_de_borrador` | Ninguna |

**Fecha de cierre:** 2026-10-22  
**Dictamen final:** Todos los recorridos E2E (E2E-01 a E2E-05) han sido ejecutados y superados satisfactoriamente. Todos los requisitos funcionales de `spec-0001` (RF-ACC-001 a RF-MUL-004) cuentan con cobertura verificada y reproducible en la suite de pruebas automatizadas del proyecto (319 pruebas de backend y 108 pruebas de frontend en verde). Se cumple la totalidad de los criterios de aceptación y se declara apto el cierre del milestone **v1**.
