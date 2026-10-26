# ADR-0019 — Semillas de tipos institucionales

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

El issue #80 pide catálogos iniciales editables por institución. ADR-0010 fija su pertenencia institucional. La lista e instrucciones de spec-0004 v0.1 fueron aprobadas en esta conversación mediante «continua con lo que propones».

## Opciones

1. Crear los tipos manualmente en cada institución: mantiene el trabajo repetitivo.
2. Sembrarlos solo en una migración: deja vacías las instituciones futuras.
3. Completar los existentes por migración e inicializar cada institución al crearla.

## Decisión

Se adopta la opción 3. Lista aprobada:

| Tipo | Código | Nombre | Vencimiento | Orden |
|---|---|---|---|---|
| Funcionario | `DOCENTE` | Docente (`EsDocente = true`) | — | — |
| Funcionario | `ADMINISTRATIVO` | Administrativo (`EsDocente = false`) | — | — |
| Documento | `CEDULA` | Cédula | Sí | 1 |
| Documento | `PAPELETA_VOTACION` | Papeleta de votación | No | 2 |
| Documento | `ANTECEDENTES_PENALES` | Certificado de antecedentes penales | No | 3 |
| Documento | `DECLARACION_JURAMENTADA` | Declaración juramentada | No | 4 |
| Documento | `MECANIZADO_IESS` | Mecanizado del IESS | No | 5 |
| Documento | `CERTIFICADO_MEDICO` | Certificado médico | Sí | 6 |

Las instrucciones son las de la tabla de spec-0004 v0.1. Todos empiezan activos. Los títulos siguen en formación académica; no se crean requisitos automáticamente. Los vencimientos son valores configurables, no una regla normativa.

El alta prepara los tipos junto con institución, administradores y auditoría antes del único `SaveChangesAsync`, que confirma todo de manera atómica. Una función de semilla agrega exclusivamente códigos faltantes dentro de la institución indicada, considerando también entidades pendientes de guardar. La migración usa `INSERT ... ON CONFLICT DO NOTHING` sobre las claves únicas institucionales y conserva su propia copia inmutable de los datos, como las migraciones anteriores. Las pruebas comparan ambos recorridos.

## Consecuencias

El admin puede editar y desactivar lo sembrado. Repetir la semilla no modifica datos existentes ni reactiva tipos. Los órdenes existentes no se renumeran; la sugerencia de nuevas altas toma el máximo, incluidos los inactivos, más uno. Las futuras ampliaciones requieren una decisión y una nueva migración, sin reescribir la actual.

La reversión de esta migración no borra datos: al poder editarse y referenciarse, no se puede distinguir con seguridad una semilla de un dato administrativo. No cambia el esquema ni el contrato público.

## ADR relacionados

- ADR-0004 — Aislamiento institucional.
- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0020 — Retirada del control de clasificación docente.
