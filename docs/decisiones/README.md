# Decisiones de arquitectura (ADR)

Cada decisión de arquitectura se registra en un ADR (Architecture Decision Record): un documento corto que explica el contexto, las opciones, la decisión y sus consecuencias.

## Cuándo se escribe un ADR

- Siempre que se tome una decisión de arquitectura nueva o se cambie una existente.
- **Antes** de ejecutar las tareas que dependen de esa decisión.
- No hace falta para detalles locales que se corrigen fácilmente (nombres internos, formato de un archivo).

## Cómo se escribe

1. Copiar [ADR-0000-plantilla.md](ADR-0000-plantilla.md) a `ADR-NNNN-nombre-en-minusculas.md`.
2. Usar el siguiente número correlativo, de cuatro cifras. Los números no se reutilizan.
3. Completar todos los campos: Estado, Fecha, Contexto, Opciones, Decisión, Consecuencias y ADR relacionados.
4. Añadir el ADR al índice de este archivo en el mismo PR.

## Estados

| Estado | Significado |
|---|---|
| Propuesto | Hay contexto y opciones, pero la decisión no está cerrada. La cierra quien desarrolla; un agente de IA no cierra por su cuenta un ADR "Propuesto". |
| Vigente | Decisión tomada y en uso. |
| Reemplazado | Sustituido por otro ADR. Se conserva como historia. |

## Cómo se reemplaza un ADR

No se borra ni se reescribe un ADR vigente. Se escribe un ADR nuevo que explique el cambio, se marca el anterior como "Reemplazado por ADR-NNNN" y se enlazan ambos en "ADR relacionados".

## Índice

| ADR | Título | Estado |
|---|---|---|
| [ADR-0000](ADR-0000-plantilla.md) | Plantilla (no es una decisión) | n/a |
| [ADR-0001](ADR-0001-clean-architecture-backend.md) | Clean Architecture en el backend | Vigente |
| [ADR-0002](ADR-0002-monorepo-y-ramas.md) | Monorepo y ramas `main` / `develop` | Vigente |
| [ADR-0003](ADR-0003-cliente-openapi-generado.md) | Cliente OpenAPI generado en el frontend | Vigente |
| [ADR-0004](ADR-0004-multitenancia-esquema-unico.md) | Multitenancy: esquema único con `institucion_id` | Vigente |
| [ADR-0005](ADR-0005-ci-por-niveles.md) | CI por niveles y filtro por rutas | Vigente |
| [ADR-0006](ADR-0006-almacenamiento-de-archivos.md) | Almacenamiento de archivos | Vigente |
| [ADR-0007](ADR-0007-autenticacion-con-cedula.md) | Autenticación con cédula, cambio obligatorio y correo | Vigente |
| [ADR-0008](ADR-0008-granularidad-del-rechazo.md) | Granularidad del rechazo | Vigente |
| [ADR-0009](ADR-0009-campos-configurables.md) | Campos configurables por institución | Propuesto |
| [ADR-0010](ADR-0010-hoja-de-vida-estructurada.md) | Hoja de vida estructurada y catálogos | Vigente |
| [ADR-0011](ADR-0011-carga-de-nomina-nulos-y-nombres.md) | Carga de nómina: columnas, valores nulos y división de nombres | Propuesto |
| [ADR-0012](ADR-0012-datos-bancarios.md) | Datos bancarios del personal | Propuesto |

<!-- prueba del ci: este comentario se puede borrar -->
