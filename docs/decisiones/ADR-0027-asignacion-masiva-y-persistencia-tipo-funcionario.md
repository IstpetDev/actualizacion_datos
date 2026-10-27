# ADR-0027 — Asignación masiva y persistencia de tipo de funcionario

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

En el panel de administración (Configuración de requisitos → «4. Asignación a Personas»), al asignar un tipo de funcionario a una persona, la selección no persistía al recargar la página. La causa técnica era que `PersonaDto` en el backend no exponía `TipoFuncionarioId`, obligando al frontend a simular la propiedad en memoria en un objeto fuertemente tipado. Además, con instituciones de cientos de personas (p. ej. ~500), asignar el tipo uno a uno en una tabla sin paginación, sin búsqueda y sin filtros resultaba inoperable (issues #76 y #77).

## Opciones

1. **Persistencia individual con selección múltiple y endpoint masivo:** Exponer `TipoFuncionarioId` en `PersonaDto`, quitar accesos dinámicos en frontend, incorporar búsqueda/filtros/paginación, y proveer un endpoint `POST /api/personas/asignar-tipo-masivo` que permita aplicar un tipo a una lista de IDs de personas seleccionadas o a todas las personas sin tipo de la institución.
2. **Asignación únicamente persona a persona sin endpoint masivo:** Corregir solo la persistencia en `PersonaDto` y forzar al admin a realizar una petición PUT por cada persona. Desventaja: inviable para volúmenes medianos o grandes de personal.
3. **Mapeo automático estricto solo vía nómina:** Requerir siempre que la nómina incluya el cargo mapeado. Desventaja: no resuelve asignaciones manuales, personas cargadas previamente o casos excepcionales sin cargo exacto.

## Decisión

Se adopta la opción 1:

1. **Contrato de PersonaDto:** Se añade el campo `TipoFuncionarioId` a `PersonaDto` en `ModelosPersona.cs`, mapeándolo en `ServicioPersonas.ListarPersonasAsync` y `ServicioInstituciones.MapearPersona`.
2. **Endpoint de asignación masiva:** Se crea `POST /api/personas/asignar-tipo-masivo` respaldado por `IServicioConfiguracionHojaDeVida.AsignarTipoFuncionarioMasivoAsync`. Valida que el tipo de funcionario pertenezca a la institución y esté activo. Permite procesar una lista de IDs de personas o todas las personas sin tipo asignado (`SoloSinTipo = true`).
3. **Frontend responsivo y accesible:**
   - La tabla de asignación soporta búsqueda por documento/nombre y filtro por estado (todas / sin tipo / con tipo).
   - Se incorpora paginación configurable para manejar listas grandes fluidamente.
   - Casillas de selección múltiple y botón «Asignar a seleccionadas», más botón «Asignar a todas las personas sin tipo» con confirmación.
   - Resumen superior con contadores en tiempo real («N personas registradas, X asignadas, Y sin tipo») y resaltado visual para personas sin tipo.
4. **Regeneración del contrato OpenAPI:** Se actualiza `openapi/v1.json` y el cliente TypeScript en el mismo cambio.

## Consecuencias

- El tipo de funcionario asignado a cada persona persiste de forma inmediata y se refleja tras recargar o cerrar sesión.
- El administrador puede clasificar la nómina completa en pocos clics (menos de 5 acciones para cientos de personas).
- El contrato queda fuertemente tipado en frontend sin recurrir a accesos por índice no tipados.

## ADR relacionados

- [ADR-0004](ADR-0004-multitenancia-esquema-unico.md) — Multitenancy: esquema único con `institucion_id`.
- [ADR-0010](ADR-0010-hoja-de-vida-estructurada.md) — Hoja de vida estructurada y catálogos.
- [ADR-0019](ADR-0019-semillas-de-tipos-institucionales.md) — Semillas de tipos institucionales.
