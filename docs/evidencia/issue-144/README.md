# Evidencia — Issue #144

Fecha: 2026-10-28. Rama: `fix/144-observaciones-devolucion`.

## Investigación y corrección

La API ya conserva observaciones generales y marcas por ronda. El fallo estaba en
la presentación: la marca de ficha era una señal estática, la cabecera elegía la
primera ronda de una respuesta ascendente y el expediente por secciones no recibía
las observaciones.

- La ficha calcula su marca reactivamente cuando llega la consulta asíncrona.
- La cabecera elige la última ronda y las tarjetas de registro eligen la marca
  más reciente que les corresponde. Se reconocen las claves y alias existentes
  de campos, archivos e ítems.
- Persona y supervisor tienen un historial completo, ordenado desde la última
  devolución, con contexto legible, autor, fecha, ronda y estado del expediente.
  Las marcas de ficha, secciones, ítems y archivos también aparecen junto a su
  contexto en la vista detallada del supervisor. Los registros ya eliminados
  conservan la clave original en el historial.
- Guardar correcciones y reenviar no oculta el historial. Si falla su consulta,
  se informa el error y no se sustituye un historial ya cargado por una lista vacía.
- Después de devolver, el supervisor conserva abierto el expediente actualizado;
  las acciones de aprobación y devolución quedan deshabilitadas hasta otro envío.
  Cambiar de expediente cancela la consulta anterior para evitar mezclar datos.

Se respeta [ADR-0008](../../decisiones/ADR-0008-granularidad-del-rechazo.md):
la devolución afecta al expediente completo. El modelo no define una resolución
individual de marcas; se distinguen «Última devolución» y «Devolución anterior»
y se muestra explícitamente el estado actual del expediente, sin inventar estados
por marca ni borrar rondas anteriores al aprobar.

No cambia el contrato de API ni el esquema de persistencia. La compilación con
NSwag no produce diferencias en OpenAPI o cliente. No se generó una spec, según
la indicación del solicitante de que su equipo se encarga de ella.

## Verificación local

Validación final después de integrar `origin/develop`, incluida la restricción
reciente del PDF del usuario (#145), sin conflictos:

- `NG_BUILD_MAX_WORKERS=2 pnpm --dir src/Frontend test:ci`: **43 archivos y 504
  pruebas aprobadas**, 0 fallidas. JSDOM informa cinco avisos de navegación no
  implementada; no son fallos. La ejecución inicial con más trabajadores agotó
  recursos; las ejecuciones posteriores limitadas finalizaron correctamente.
- `dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter
  'FullyQualifiedName~HojaDeVidaTests'`: **112 pruebas aprobadas**, 0 fallidas.
  Incluye la nueva regresión HTTP con dos rondas: cada una contiene una indicación
  general, una marca de ficha y una de título. Verifica identidad, texto, autor,
  fecha y marcas para persona y supervisor tras guardar, reenviar y aprobar.
  Usa la base SQLite y la autenticación de pruebas de la fábrica existente.
- `dotnet build src/Backend --no-restore`: compilación correcta, 0 advertencias
  y 0 errores. La ejecución HTTP final también recompila el backend integrado.
- `pnpm --dir src/Frontend build`: compilación de producción correcta. Conserva
  la advertencia de estilos del panel admin: 9,11 kB frente al umbral de 6 kB.
- `pnpm --dir src/Frontend lint`: `All files pass linting.`
- `pnpm --dir src/Frontend format:check`: `All matched files use Prettier code style!`
- `dotnet format src/Backend --no-restore --verify-no-changes --include
  src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/ObservacionesDevolucionTests.cs`:
  sin diferencias.
- `git diff --check`: sin errores.

## Navegador y capturas

Chromium sobre la compilación de producción, con API simulada y datos ficticios.
Se verificó la carga asíncrona, la selección de la última indicación general,
cuatro marcas en dos rondas con metadatos, guardado sin perder historial y recarga
como Enviado. El supervisor ve las marcas dentro de ficha y título y conserva
el expediente Devuelto abierto con las acciones deshabilitadas. Sin errores
JavaScript.

- [Persona: historial de ambas rondas](persona-historial.png).
- [Supervisor: observaciones junto al título](supervisor-titulo.png).
- [Supervisor: observaciones de ficha](supervisor-ficha.png).

Las capturas verifican presentación con respuestas simuladas; la regresión HTTP
verifica el flujo y la persistencia en SQLite. No representan una validación en
PostgreSQL ni en producción. La coordinación de revisión con datos ficticios de
#147 conserva su alcance independiente.
