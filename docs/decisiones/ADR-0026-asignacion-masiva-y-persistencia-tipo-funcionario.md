# ADR-0026 — Asignación masiva y persistencia de tipo de funcionario

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

- La asignación de tipo de funcionario persiste de manera íntegra tras recargar la pantalla o iniciar nuevas sesiones.
- Se reduce drásticamente el tiempo y esfuerzo operativo para configurar la nómina: asignar cientos de personas toma menos de 5 acciones del usuario.
- El contrato de la API y el cliente del frontend se mantienen sincronizados y tipados sin accesos por índice no declarados.

## ADR relacionados

- [ADR-0003](ADR-0003-cliente-openapi-generado.md) — Cliente OpenAPI generado en el frontend.
- [ADR-0010](ADR-0010-hoja-de-vida-estructurada.md) — Hoja de vida estructurada y catálogos.
- [ADR-0014](ADR-0014-carga-de-nomina-real.md) — Carga de la nómina real: encabezados, nulos textuales y alias de catálogo.
