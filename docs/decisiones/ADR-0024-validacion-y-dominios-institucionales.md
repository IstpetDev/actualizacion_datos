# ADR-0024 — Validación y dominios institucionales

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

Spec-0007 v0.1 aprobada mediante «si, continua» define formatos, dominios, borradores y corrección de antiguos. El contrato de errores de #94 sigue en un PR ajeno abierto; se debe mantener compatibilidad sin copiar su middleware global.

## Opciones

1. Mantener reglas independientes en cada componente y servicio: facilita discrepancias.
2. Declarar reglas de campos en Application, validarlas allí y entregarlas como metadatos al cliente, con la política de su institución.

## Decisión

Opción 2. Un validador de Application contiene longitudes, patrones y rangos. Backend valida antes de modificar y al enviar; Angular aplica los mismos metadatos a los campos y presenta errores. La comprobación de completitud conserva su lista de obligatorios. La fecha máxima de nacimiento corresponde a 18 años cumplidos según la fecha de Ecuador y se entrega al cliente para evitar diferencias de reloj.

La configuración vive en Institucion como lista JSON de dominios normalizados, almacenada en una columna de texto con valor inicial `[]`. Hasta diez dominios DNS, sin comodines ni subdominios implícitos. Una lista vacía conserva la validación de formato y avisa al admin. El cambio no reescribe correos ni estados; aplica al siguiente guardado/envío. El contexto autenticado determina la institución, sin confiar en cabeceras suministradas por el cliente.

El contrato `MensajeRespuesta` es compatible con #94: mensaje, codigo, errores por campo y traceId. Los errores nuevos se manejan de manera acotada por los endpoints y el enlace de JSON; no se crea otro manejador global de errores de negocio. Al integrarse #94 se conserva su contrato y sus helpers. Las validaciones no registran datos recibidos ni mensajes que los reproduzcan.

La migración no reduce longitudes antiguas. La carga nueva deja valores de ficha inválidos vacíos con advertencias de fila/campo, sin su contenido; leer antiguos sigue permitido y su formato se revisa antes de enviar. No se cierra ADR-0014 ni se implementan sus otras propuestas.

## Consecuencias

Cambian DTO y cliente generado en el mismo PR. Se conserva el borrador incompleto con valores válidos y la corrección explícita del legado. Se necesita probar campos, fronteras, permisos, cabeceras suplantadas y aislamiento entre instituciones, además de logs sin eco de valores.

## ADR relacionados

- ADR-0004 — Aislamiento institucional.
- ADR-0010 — Hoja de vida.
- ADR-0014 — Propuesto; solo regla telefónica pedida por #88.
- ADR-0025 — Perfil automático y exportación.
