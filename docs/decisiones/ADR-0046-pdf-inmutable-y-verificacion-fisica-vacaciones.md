# ADR-0046 — PDF inmutable y verificación física de actas de vacaciones

- **Estado:** Vigente
- **Fecha:** 2026-11-10
- **Cerrado:** 2026-11-10, por @bryancito1090 (quien desarrolla) en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) para el alcance Modo A.

## Contexto

[#186](https://github.com/IstpetDev/actualizacion_datos/issues/186) exige PDF imprimible, versiones, corrección y rastro de verificación física. [spec-0025 v0.2](../specs/spec-0025/spec.md) define los estados `BORRADOR`, `EMITIDA_PDF`, `FIRMA_FISICA_VERIFICADA`, `OBSERVADA`, `ANULADA` y la creación de versión sucesora enlazada para sustituir contenido emitido.

ADR-0006 y ADR-0039 eliminan archivos sustituidos o retirados de la hoja de vida: aplicar esa regla al acta perdería la versión impresa que las partes pudieron firmar. ADR-0033 selecciona `QuestPDF` para generar documentos en .NET. Un hash SHA-256 verifica integridad de bytes, pero no es firma electrónica.

## Opciones

1. Guardar bytes privados del PDF en el almacén existente, con instantánea/metadatos por versión, conservar anuladas y comprobar hash. Evaluar reutilizar motor vigente. Añadir auditoría y verificaciones sin sobrescribir hechos. Requiere excepción explícita y acotada a la eliminación de ADR-0006.
2. PDF/metadatos por versión en PostgreSQL con acceso privado y auditoría. Facilita consistencia archivo/registro, aumenta volumen/respaldos y cambia almacenamiento; requiere decisión frente a ADR-0006.
3. Regenerar al descargar desde instantánea y dependencias congeladas. Reduce almacenamiento, pero dificulta garantizar idénticos bytes entre versiones de motor/fuentes; solo sería admisible demostrando esa propiedad y recuperación íntegra.

Sobrescribir un PDF emitido o borrar el anterior al corregir incumple #182/#186. Ninguna opción incluye firma electrónica ni URL pública.

## Decisión

Se adopta la **Opción 1 (reutilizar `QuestPDF` e `IAlmacenArchivos` con persistencia inmutable por versión y excepción expresa de retención frente a ADR-0006/ADR-0039)**:

1. **Motor y almacenamiento privado:** `GeneradorPdfActaVacaciones` implementa `IServicioGeneracionPdfActaVacaciones` reutilizando `QuestPDF` (ADR-0033) sin nuevas dependencias. Los bytes generados se persisten una sola vez al emitir la versión a través de `IAlmacenArchivos` (ADR-0006) bajo ruta privada por institución y se registra su hash `SHA-256` en `VersionActaVacaciones`. Toda descarga o reimpresión sirve exactamente los bytes almacenados y verifica el hash, sin regenerar ni alterar el PDF.
2. **Excepción acotada a ADR-0006 y ADR-0039 (conservación histórica permanente):** A diferencia de los adjuntos reemplazables de la hoja de vida, los archivos PDF de actas emitidas (`EMITIDA_PDF`, `FIRMA_FISICA_VERIFICADA`, `OBSERVADA`, `ANULADA`) y los archivos de evidencia de verificación física **jamás se sobrescriben ni se eliminan físicamente** al observarse, anularse o sustituirse por una versión sucesora (`v2`, `v3`, ...), conservándose durante toda la vigencia legal del expediente laboral institucional.
3. **Numeración correlativa anual por institución:** El número oficial del acta sigue un correlativo único por institución y año con versión explícita (`v1`, `v2`, ...). Los números emitidos o anulados no se reutilizan; los borradores y los intentos fallidos previos a publicar la emisión no consumen número activo.
4. **Firmas requeridas, método y respaldo de verificación:** El PDF emitido incluye doble bloque de firma manuscrita en blanco (Representante autorizado de TH/Institución a la izquierda y Persona trabajadora titular a la derecha). Para pasar a `FIRMA_FISICA_VERIFICADA`, un verificador con facultad activa en la institución (distinto de la persona trabajadora titular) debe registrar inspección física de la versión impresa, fecha de inspección, método, observaciones y **al menos un respaldo trazable**:
   - Archivo digital privado (`PDF`, `JPG` o `PNG`, máx. 10 MB, validado por extensión y firma de bytes según ADR-0006);
   - Referencia física verificable de custodia en archivo institucional (código de expediente/carpeta/tomo); o
   - Excepción motivada expresamente autorizada con referencia del responsable.
   El indicador `firma_verificada = true` se deriva exclusivamente del estado vigente `FIRMA_FISICA_VERIFICADA`.
5. **Consistencia, concurrencia y recuperación:** Para emitir una versión, primero se escriben y comprueban los bytes del PDF y su hash SHA-256 en `IAlmacenArchivos` y luego se confirma la transacción en PostgreSQL; si falla la persistencia en base de datos, se compensa eliminando únicamente el archivo temporal no publicado para no dejar emisiones parciales. Todas las transiciones exigen revisión esperada (`409` ante carrera) y clave de reintento idempotente. Las copias de seguridad coordinan PostgreSQL y el volumen de archivos conforme a ADR-0006.

## Consecuencias

- Las tareas `T-ACT-01`, `T-ACT-02` y `T-ACT-03` ([#193](https://github.com/IstpetDev/actualizacion_datos/issues/193), [#194](https://github.com/IstpetDev/actualizacion_datos/issues/194) y [#195](https://github.com/IstpetDev/actualizacion_datos/issues/195)) quedan desbloqueadas con contratos congelados en [spec-0025/plan.md](../specs/spec-0025/plan.md).
- Se preserva la integridad forense de cada versión emitida y su correspondencia exacta con el papel firmado, comunicando anulaciones o sustituciones en la interfaz y en los metadatos sin mutar los bytes del PDF histórico.
- Los procesos de limpieza de archivos de borradores de hoja de vida excluyen expresamente las rutas/registros de actas de vacaciones y sus evidencias.

## ADR relacionados

- [ADR-0004 — Vigente, multitenencia](ADR-0004-multitenancia-esquema-unico.md).
- [ADR-0006 — Vigente, archivos](ADR-0006-almacenamiento-de-archivos.md); se establece excepción explícita de no eliminación para actas de vacaciones y sus evidencias.
- [ADR-0033 — Vigente, motor PDF](ADR-0033-motor-generacion-pdf.md).
- [ADR-0039 — Vigente, retiro de adjuntos de hoja de vida](ADR-0039-retiro-auditado-de-adjuntos-por-supervisor.md); no aplicable a actas emitidas ni a sus respaldos históricos.
- [ADR-0045 — Vigente, separación del efecto contable y Modo A](ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md).

## Revisión documental para #187 y cierre en #189

Revisado inicialmente el 2026-11-10 para #187 y cerrado como **Vigente** el 2026-11-10 en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) ([evidencia E0](../evidencia/issue-189/README.md)) por decisión expresa de quien desarrolla para Entrega 1 en Modo A.
