# ADR-0042 — Búsqueda tolerante en selectores de catálogos y campo de correo personal en ficha

- **Estado:** Vigente por pedido explícito #164
- **Fecha:** 2026-10-29

## Contexto

En el flujo de llenado y revisión de la ficha personal y la hoja de vida institucional se identificaron dos necesidades principales (issue #164):
1. **Búsqueda en selectores de catálogos extensos:** Varios catálogos esenciales (países, provincias, cantones, parroquias, instituciones de educación superior/universidades, bancos, etc.) contienen cientos de opciones. Los usuarios y supervisores requerían un filtrado en tiempo real ágil y tolerante, que no fallara por diferencias entre mayúsculas y minúsculas ni por el uso o ausencia de acentos diacríticos (tildes, diéresis como en "Perú", "Cañar", "Sucumbíos", "Guayas").
2. **Correo personal del funcionario:** Aunque la ficha y la autenticación gestionan el correo institucional (restringido a los dominios autorizados de la institución según ADR-0024), las áreas de talento humano y supervisión requieren recolectar y almacenar explícitamente el correo personal alternativo del funcionario con fines de contacto y expediente. Dicho campo debe persistirse en la base de datos, reflejarse en el formulario de la ficha con validación de formato de correo estándar (sin restringir el dominio a la institución), exponerse en la vista de expediente de supervisión y reflejarse en las exportaciones (HTML, PDF y Excel).

## Opciones

### Para la búsqueda en selectores
1. **Librería externa de componentes UI pesada (ng-select / Angular Material):**
   - *Ventajas:* Trae selectores con buscador prediseñados.
   - *Desventajas:* Introduce dependencias complejas incompatibles con la arquitectura ligera de standalone components en Angular 22, rompería pruebas unitarias existentes y generaría sobrecarga en bundle.
2. **Utilidad centralizada de normalización y filtrado en tiempo real sobre los controles nativos existentes:**
   - *Ventajas:* Descompone caracteres Unicode mediante `normalize('NFD')`, remueve marcas de combinación diacrítica (`[\u0300-\u036f]`) y pasa a minúsculas. Permite incorporar cajas de búsqueda en tiempo real que preservan la opción actualmente seleccionada en el `<select>` y mantienen intactos los identificadores, contratos y accesibilidad web.
   - *Desventajas:* Requiere conectar los signals de filtrado a cada grupo de catálogo seleccionado.

### Para el correo personal
1. **Sobrescribir el campo de correo de la cuenta o guardarlo solo en un JSON no tipado:**
   - *Ventajas:* No requiere migración ni columnas en base de datos.
   - *Desventajas:* Rompe el principio de datos estructurados (ADR-0010), imposibilita validaciones automáticas y consultas tipadas en exportaciones.
2. **Columna dedicada `correo_personal` en la entidad `FichaPersonal` y su DTO correspondiente:**
   - *Ventajas:* Totalmente tipado, validado con `PatronCorreo` en la política de validación centralizada (ADR-0024) pero sin exigir dominios institucionales (`Tipo: "correo_personal"`), persistido limpiamente en la tabla `fichas_personales` y disponible para visualización en expediente y exportaciones (PDF, HTML y Excel).

## Decisión

1. **Búsqueda tolerante e insensible a acentos:** Se implementa la utilidad `filtro-busqueda.util.ts` (`normalizarParaBusqueda`, `coincideBusqueda` y `filtrarCatalogo`) que despoja tildes y diacríticos y convierte a minúsculas. Se integran campos de búsqueda en tiempo real sobre los catálogos principales (países, provincias, cantones, parroquias, universidades y bancos) preservando la opción seleccionada. Asimismo, se actualizan los buscadores del panel de administración y supervisión para beneficiarse de esta normalización.
2. **Campo Correo Personal:**
   - Se agrega la propiedad `CorreoPersonal` a `DatosFichaPersonal`, la entidad de dominio `FichaPersonal`, la configuración EF Core (`correo_personal` con longitud 200) y la migración correspondiente.
   - Se incluye en `GuardarFichaPersonalRequest`, `FichaPersonalDto` y `DatosPersonalesDocumento`.
   - Se añade la regla de validación en backend (`ValidacionHojaDeVida`) y frontend (`ValidacionHojaDeVidaService`) bajo el tipo `correo_personal`, validando formato de email pero permitiendo cualquier dominio.
   - Se muestra en el formulario de Ficha Personal, en la pestaña de Ficha del expediente del supervisor y en las exportaciones (reporte Excel, CV en HTML y PDF institucional).

## Consecuencias

- **Positivas:** Los usuarios encuentran opciones en catálogos de cientos de elementos escribiendo con o sin tildes de forma instantánea. Se captura el correo personal de forma estructurada, segura y validada sin afectar el correo institucional de autenticación.
- **Riesgos mitigados:** Al preservar el `<select>` nativo con sus identificadores y nombres, no se rompe la compatibilidad con las pruebas unitarias y de integración existentes.

## ADR relacionados

- [ADR-0010](ADR-0010-hoja-de-vida-estructurada.md) — Hoja de vida estructurada y catálogos.
- [ADR-0024](ADR-0024-validacion-y-dominios-institucionales.md) — Validación y dominios institucionales.
- [ADR-0033](ADR-0033-motor-generacion-pdf.md) — Motor de generación de PDF en .NET.
