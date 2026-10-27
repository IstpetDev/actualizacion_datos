# Issue #88 — Evidencia de validación

Fecha local: 2026-10-26. Rama `feature/88-validacion-ficha-y-perfil`, destino `develop`. Spec-0007 v0.1 aprobada, ADR-0024/0025 vigentes; nota de RF-HDV-020 en spec-0003. La spec se renumeró al incorporar #86/PR #95 y #90/PR #96, conservando el alcance aprobado y sus cambios. La numeración inicial fue spec-0005, después spec-0006 y finalmente spec-0007.

## Alcance verificado

- Matriz de reglas y exclusiones: [spec-0007](../specs/spec-0007/spec.md). Patrón Unicode de nombres, teléfonos ecuatorianos, código postal, nacimiento desde 1900 y edad mínima de 18 años, límites y controles, horas, porcentajes y coherencias de fechas.
- La API publica metadatos y fechas límite de Ecuador junto con los dominios de la institución autenticada. Las pruebas del frontend usan una copia cuya igualdad con la política de Application comprueba xUnit.
- Guardados y envío reutilizan las reglas; los borradores incompletos válidos siguen permitidos. Los datos anteriores se pueden leer y corregir con mensajes por campo/sección. La nómina no reclasifica teléfonos inválidos ni revela el contenido rechazado en advertencias.
- Dominios editables desde configuración: hasta diez DNS distintos, coincidencia exacta sin mayúsculas, sin comodines/subdominios implícitos. Sin configuración se avisa al admin y se exige formato. Migración PostgreSQL y separación de instituciones comprobadas; cookie y cabecera ajena no permiten configurar otra institución.
- `perfil` está ausente del request y de la pantalla; texto, vacío y nulo enviados por HTTP se rechazan. La columna histórica se conserva, su texto no se devuelve. Revisión, HTML del ZIP y Excel usan conteos actuales de títulos, estudios, cursos y experiencias. HTML escapado, adjuntos sin colisión con el CV y cuenta enmascarada.
- Se conserva la protección de cambios sin guardar de #90. Guardar y Guardar/continuar comparten validación y mantienen el formulario al fallar; el modal permite volver a corregir y bloquea guardar formatos inválidos.
- Respuestas 400 con `errores: Record<string,string[]>`, compatibles con el contrato previsto por #89/PR #94 (todavía abierto durante esta implementación). El manejador añadido se limita a errores de enlace JSON y evita registrar sus excepciones con posibles valores personales.

## Comandos y salida real

`dotnet build src/Backend`:

```text
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

Suite completa, sin filtros y con PostgreSQL/Testcontainers (Docker):

```bash
dotnet test src/Backend -- RunConfiguration.MaxCpuCount=1 xUnit.ParallelizeTestCollections=false xUnit.MaxParallelThreads=1
```

```text
Passed! - Failed: 0, Passed: 102, Skipped: 0, Total: 102 - Domain.Tests
Passed! - Failed: 0, Passed: 112, Skipped: 0, Total: 112 - Application.Tests
Passed! - Failed: 0, Passed: 300, Skipped: 0, Total: 300 - WebApi.Tests
```

Total: **514**. Algunas ejecuciones locales en paralelo terminaron con `Test host process crashed`; no se consideran aprobadas. La ejecución completa serial anterior terminó correctamente y no omite pruebas. No se modificó la configuración de CI para ocultar fallos.

`corepack pnpm --dir src/Frontend test:ci`, después de integrar #90:

```text
Test Files 34 passed (34)
Tests 337 passed (337)
```

`corepack pnpm --dir src/Frontend build`: exit 0, `Application bundle generation complete`. Advertencias de presupuesto CSS en componentes existentes de supervisor, hoja de vida, admin y usuario; no se cambiaron los presupuestos.

`corepack pnpm --dir src/Frontend lint`:

```text
All files pass linting.
```

`corepack pnpm --dir src/Frontend format:check`:

```text
All matched files use Prettier code style!
```

`dotnet format src/Backend --verify-no-changes --no-restore`: exit 0, sin diferencias.

OpenAPI y cliente regenerados mediante la compilación Debug del backend. Una compilación adicional conservó exactamente los SHA-256 de `openapi/v1.json` y `src/Frontend/src/app/api-client/index.ts`; el job del PR debe confirmar el mismo resultado sobre el HEAD final.

## Navegador, API y PostgreSQL reales

```bash
docker build -f src/Backend/Dockerfile -t actualizacion-datos-backend:issue-88 .
PLAYWRIGHT_MODULO=/ruta/temporal/playwright/test NAVEGADOR_PRUEBA=/ruta/temporal/chromium node scripts/verificar-validacion-ficha.mjs
```

Imagen final construida correctamente; Angular en modo producción. El script crea y elimina red y contenedores efímeros, usa PostgreSQL 17 con autenticación trust limitada a esa red y personas inventadas. No accede a la instalación de producción, no lee secretos y no envía correos reales. Playwright se instaló fuera del repositorio; no se añadieron dependencias al producto.

Salida real de la última ejecución, con #90 integrado:

```text
V-06/07: imagen con 17 CSV, Production incompleta rechazada, 2350 elementos, doble carga e inactivo conservado.
V-02: configuración administrativa real, normalización y política del usuario.
V-01/03: mensajes en campo, bloqueo Guardar/Enviar, API 400 y corrección persistida sin perfil.
V-04/05: envío válido desde navegador, revisión con perfil generado, aprobación y exportaciones reales; sin eco de datos inválidos ni errores de página.
```

[Captura de un código postal rechazado con datos ficticios](issue-88/validacion.png). El recorrido prueba formularios y peticiones reales; xUnit comprueba además contenido HTML/Excel, escape, perfil histórico, aislamiento y captura de logs. Las pruebas de componente no se presentan como navegador conectado.

## Cierre

El estado de CI, la ausencia de conflictos, el intento de aprobación, el merge y el cierre de #88 se verifican en GitHub. Esta evidencia registra resultados locales; no sustituye la comprobación del HEAD final del PR. No se publican comentarios adicionales en PR ni issue.
