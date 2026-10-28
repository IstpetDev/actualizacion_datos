# Plan — Persistencia de ficha personal

Spec: `spec.md`, v0.1, alcance autorizado en la solicitud de #125.

1. Reconstruir residencia usando los catálogos existentes y `padreId`. Cancelar cargas anteriores cuando cambia la residencia o se destruye el componente; permitir reintentar fallos sin borrar el identificador guardado (RF-PER-001).
2. Agregar selector de discapacidad con catálogo existente y limpiar dependientes al quitarlo. Mostrar señales existentes de éxito y error; limpiar éxito al iniciar otro guardado (RF-PER-002, 004).
3. Aplicar ADR-0037: sincronizar nombre normalizado dentro del mismo guardado y ampliar su columna mediante migración EF Core (RF-PER-003).
4. Añadir pruebas Angular, dominio y PostgreSQL real con migraciones, contextos independientes, campos completos, segundo guardado y errores sin cambios parciales (RF-PER-005).
5. Compilar y ejecutar suites completas, lint y formato. Registrar evidencia, crear PR a develop y esperar CI antes de aprobar, integrar y cerrar #125.

No se cambia el contrato HTTP ni se añaden dependencias. La consulta geográfica existente permite filtrar por padre pero no por id: para reconstruir padres se reutilizan los catálogos globales de parroquias y cantones en caché.
