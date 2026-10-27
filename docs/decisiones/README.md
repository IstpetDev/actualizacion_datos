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
| [ADR-0011](ADR-0011-despliegue-a-produccion.md) | Despliegue automático a producción | Vigente |
| [ADR-0012](ADR-0012-carga-de-nomina-nulos-y-nombres.md) | Carga de nómina: columnas, valores nulos y división de nombres | Vigente |
| [ADR-0013](ADR-0013-datos-bancarios.md) | Datos bancarios del personal | Vigente |
| [ADR-0014](ADR-0014-carga-de-nomina-real.md) | Carga de la nómina real: encabezados, nulos textuales y alias de catálogo | Propuesto |
| [ADR-0015](ADR-0015-despliegue-por-etapas.md) | Despliegue dividido en etapas | Vigente |
| [ADR-0016](ADR-0016-interfaz-de-prueba-de-la-api.md) | Interfaz para probar la API en desarrollo (Scalar) | Propuesto |
| [ADR-0017](ADR-0017-acceso-a-postgres-por-tunel-ssh.md) | Acceso a PostgreSQL de producción por túnel SSH | Vigente |
| [ADR-0018](ADR-0018-la-carga-de-nomina-habilita-el-acceso.md) | La carga de nómina habilita el acceso de las personas | Vigente |
| [ADR-0019](ADR-0019-semillas-de-tipos-institucionales.md) | Semillas de tipos institucionales | Vigente |
| [ADR-0020](ADR-0020-retirada-del-control-docente.md) | Retirada del control de clasificación docente | Vigente |
| [ADR-0021](ADR-0021-carga-de-catalogos-en-produccion.md) | Carga de catálogos en producción | Vigente |
| [ADR-0022](ADR-0022-bancos-e-instituciones-superiores.md) | Bancos e instituciones de educación superior | Vigente |
| [ADR-0023](ADR-0023-habilitar-y-deshabilitar-acceso-de-personas.md) | Habilitación y deshabilitación del acceso de personas por el administrador | Vigente |
| [ADR-0024](ADR-0024-validacion-y-dominios-institucionales.md) | Validación y dominios institucionales | Vigente |
| [ADR-0025](ADR-0025-perfil-profesional-generado.md) | Perfil profesional generado | Vigente |
| [ADR-0026](ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) | Manejo global de errores y contrato uniforme | Vigente |
| [ADR-0027](ADR-0027-asignacion-masiva-y-persistencia-tipo-funcionario.md) | Asignación masiva y persistencia de tipo de funcionario | Vigente |
| [ADR-0028](ADR-0028-secciones-habilitadas-por-institucion.md) | Almacenamiento de las secciones habilitadas por institución | Vigente |
| [ADR-0029](ADR-0029-capacitaciones-obligatorias.md) | Modelo de las capacitaciones obligatorias de la institución | Vigente |
| [ADR-0030](ADR-0030-avisos-versionados-y-aceptacion-de-acceso.md) | Avisos versionados y aceptación como condición de acceso | Vigente |
| [ADR-0031](ADR-0031-auditoria-infraestructura-y-seguridad-en-despliegue.md) | Seguridad en origen, auditoría de infraestructura y verificación de despliegue | Vigente |
| [ADR-0032](ADR-0032-formato-plantillas-hoja-de-vida.md) | Formato de las plantillas globales de hoja de vida | Vigente |
| [ADR-0033](ADR-0033-motor-generacion-pdf.md) | Motor de generación de PDF en .NET | Vigente |
| [ADR-0034](ADR-0034-exencion-superadmin-aviso-proteccion-datos.md) | Exención del aviso institucional de protección de datos para superadmin | Vigente |
| [ADR-0035](ADR-0035-exencion-automatica-y-justificacion-capacitaciones-obligatorias.md) | Exención automática y justificación de nuevo ingreso en capacitaciones obligatorias | Vigente |
