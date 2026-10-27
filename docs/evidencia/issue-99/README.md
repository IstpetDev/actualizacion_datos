# Issue #99 — Evidencia de implementación

Fecha: 2026-10-27. Rama: `feature/99-aceptacion-proteccion-datos`. Base integrada: `8f16ce1` de `develop`. Diseño: [spec-0011 v0.2](../../specs/spec-0011/spec.md) y [ADR-0030](../../decisiones/ADR-0030-avisos-versionados-y-aceptacion-de-acceso.md). Los números se ajustaron para conservar los documentos de otros cambios ya integrados.

## Resultado técnico

La API exige sesión autenticada y aceptación vigente por institución antes de las operaciones de negocio, con prioridad del cambio obligatorio de contraseña. La aceptación es propia, explícita, versionada e idempotente; una publicación nueva restringe también cookies existentes. Las cabeceras no crean identidad ni cambian la institución. Login y sesión no entregan documento, nombre o correo mientras el acceso está restringido.

El endpoint anterior exige versión y confirmación explícita; el envío comprueba la evidencia vigente y el correo verificado, sin generar otra aceptación. La migración conserva los indicadores históricos sin convertirlos en autorización y mantiene expedientes/archivos. La publicación operativa coordina escrituras en PostgreSQL y requiere contenido y autorización institucionales; ver [procedimiento](../../proteccion-datos.md).

Se revisaron `TerminosService`, `TerminosController` y las tres entidades de Mi_ISTPET en `dev_jb`, commit `4517511220d89c808a5a20a7abc6d88a8848e904`, sin copiar código, dependencias o texto legal, ni consultar su base. La solución usa identidad, roles, aislamiento y PostgreSQL propios.

## Verificación local ejecutada

| Comando o comprobación | Resultado real |
|---|---|
| `dotnet build src/Backend --nologo -v:q` | Correcto; 0 advertencias, 0 errores. Generación de OpenAPI y cliente incluida; configuración de prueba sin conexión operativa. |
| `dotnet test src/Backend --no-build --nologo -v:minimal` | 553 aprobadas: Domain 102, Application 112, WebApi 339; 0 fallidas y 0 omitidas. Incluye integración con PostgreSQL efímero. |
| `dotnet format src/Backend --verify-no-changes --no-restore --verbosity quiet` | Correcto, salida 0. |
| `corepack pnpm --dir src/Frontend build` | Correcto. Cinco advertencias de presupuesto CSS en componentes existentes de la base integrada; ninguna en la pantalla nueva. |
| `corepack pnpm --dir src/Frontend test:ci` | 365 pruebas aprobadas en 36 archivos. |
| `corepack pnpm --dir src/Frontend lint` | Todos los archivos pasan lint. |
| `corepack pnpm --dir src/Frontend format:check` | Todos los archivos coinciden con Prettier. |
| `bash .github/scripts/pruebas/validar-rama.test.sh` | 55 casos correctos. |
| `git diff --check`, revisión de conflictos y enlaces documentales | Correctos; sin conflictos pendientes. |

Una ejecución conjunta de .NET con otras herramientas abortó por cierre inesperado del host de pruebas; no se confirmó la causa. La repetición completa aislada terminó con los 553 casos aprobados indicados arriba. No se cuenta la ejecución abortada como verificación satisfactoria.

## Cobertura relevante

`ProteccionDatosTests` usa cookies, contexto institucional y servicio reales con SQLite; no usa la política simulada de las pruebas anteriores. Verifica cuatro roles, prioridad de clave, rechazo, ausencia/vencimiento/ambigüedad, fallos de lectura y escritura, idempotencia y fecha UTC, sesiones posteriores, versiones nuevas con cookie abierta, mismo documento en instituciones distintas, suplantación por cabeceras, rutas directas/archivos/revisión/exportación, legado y envío válido sin duplicados. La aceptación no sustituye el correo verificado ni habilita una cuenta revocada.

`ProteccionDatosIntegracionTests` aplica las migraciones sobre PostgreSQL real en un contenedor efímero, conserva el legado, verifica claves foráneas compuestas y unicidad, tres aceptaciones concurrentes desde contextos separados, nueva publicación, bloqueo de versión obsoleta, aislamiento y protección de la historia contra modificaciones desde EF. Los avisos y autorizaciones de esas pruebas son expresamente ficticios.

Las suites anteriores aíslan la política nueva con `FabricaPruebas`, un doble exclusivo del proyecto de tests. Esa fábrica no se despliega ni constituye evidencia de seguridad de spec-0011. Las pruebas nuevas de seguridad usan el flujo real. Angular comprueba casilla explícita, errores, respuesta perdida, recarga de versión, guards, mensajes tipados del cliente generado y errores Blob, navegación obligatoria y retiro de datos del estado local.

## Comprobación visual

Chromium verificó teclado, casilla inicialmente desmarcada, botón deshabilitado antes de decidir, cambio de versión con nueva decisión, continuación solo después de confirmar la sesión, ausencia de desborde a 390 px y cierre sin aceptación ante un aviso no disponible. El navegador usó respuestas HTTP simuladas y contenido ficticio; estas capturas no acreditan un aviso legal real ni una integración de navegador con PostgreSQL.

- [Aviso pendiente en escritorio](aviso-pendiente-escritorio.png).
- [Aviso pendiente en móvil](aviso-pendiente-movil.png).
- [Aviso no disponible, reintento y salida](aviso-no-disponible.png).

## Aprobación institucional y cierre

El solicitante confirmó en esta sesión el 2026-10-27 que el rector de la institución aprobó el aviso mediante un documento físico firmado que conserva bajo su custodia, y ordenó continuar hasta cerrar #99. Se registra esa declaración como la confirmación institucional recibida y como fuente del aviso aprobado en PD-PDP-01 de la spec. El agente no recibió ni examinó el original; no se inventan su número, fecha de firma, disposiciones o contenido, y no se publica una copia, firma o dato personal en el repositorio.

La aprobación funcional ya registrada y esta confirmación institucional habilitan el cierre de la entrega de código. El operador debe tomar del documento autorizado el contenido y los datos de vigencia para publicarlos mediante el procedimiento operativo; esa configuración de despliegue no se ejecutó en esta tarea. El sistema mantiene el bloqueo cuando todavía no se ha provisionado un aviso y no se publica un sustituto ficticio.

La ejecución de CI [40532753603](https://github.com/IstpetDev/actualizacion_datos/actions/runs/40532753603) finalizó correctamente para el código `0d5e2f572b7bd13c9b188822058a659b52a065d7`: política, backend, frontend, Gitleaks, cliente OpenAPI y `ci-ok` en verde. Integración, imágenes Docker y workflows se omitieron según la política de rutas/destino del repositorio; PostgreSQL se verificó localmente. La actualización documental de aprobación se verifica también sobre su HEAD final antes de integrar el PR #106 y cerrar #99.
