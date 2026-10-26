# Specs

Una spec describe un cambio **antes** de implementarlo. Cada iniciativa vive en `docs/specs/spec-NNNN/` (número correlativo de cuatro cifras, sin reutilizar) y, al completar el flujo, contiene exactamente cuatro archivos: `spec.md`, `plan.md`, `tasks.md` y `test-e2e.md`. Las plantillas están en [`_plantilla/`](_plantilla/README.md).

El repositorio es un solo monorepo (`src/Backend` y `src/Frontend`): una spec puede cubrir una o ambas áreas, y `plan.md` y `tasks.md` indican la ruta exacta de cada archivo.

## Cómo crear una spec

1. Elegir el siguiente número libre `NNNN`.
2. **Copiar** la carpeta `_plantilla/` a `docs/specs/spec-NNNN/`. La plantilla no se edita nunca.
3. En la copia, empezar solo por `spec.md`. Borrar `README.md` de la copia (es la guía de la plantilla).
4. Los otros tres archivos se crean solo tras la aprobación (ver fases).

## Orden de trabajo

| Fase | Archivo | Resultado necesario para avanzar |
|---|---|---|
| 1. Definir | `spec.md` | Quien revisa lo funcional valida alcance, reglas, escenarios, exclusiones y puntos abiertos. |
| 2. Validar | `spec.md` | La aprobación y la versión quedan registradas dentro del archivo, o se devuelven ajustes. Sin aprobación no se generan los otros tres documentos. |
| 3. Diseñar | `plan.md` | Se fija la solución, archivos, contratos, migraciones, ADR aplicables y riesgos. |
| 4. Descomponer | `tasks.md` | Cada tarea tiene resultado verificable, dependencias, dueño o subagente y forma de integración. |
| 5. Verificar | `test-e2e.md` | Se definen recorridos de punta a punta, datos ficticios, ambiente y evidencias antes de implementar. |
| 6. Implementar | Los cuatro | Se ejecutan las tareas aprobadas, se integran los cambios y se registran los resultados. |

## Frases de trabajo

- **«Crea un spec»**: crear solo `docs/specs/spec-NNNN/spec.md` desde la plantilla. Investigar decisiones y código existentes, separar hechos de supuestos y pedir la revisión funcional. No crear `plan.md`, `tasks.md` ni `test-e2e.md` por anticipado.
- **«Validé el spec»** (o aprobación de una versión concreta): registrar la aprobación en `spec.md` y generar los otros tres archivos en la misma carpeta. Cada requisito y escenario debe aparecer en el plan, en una tarea y en una prueba (o una justificación explícita de por qué no se prueba a ese nivel). Si el alcance cambia después, vuelve a revisión funcional antes de ejecutar tareas dependientes.
- **«Implementa el spec con subagentes»**: tomar `tasks.md` como lista de trabajo. Cada subagente recibe una tarea con objetivo, rutas, contrato de entrada y salida, prueba y criterio de aceptación. Solo se ejecutan en paralelo tareas independientes, con archivos separados. El coordinador revisa los cambios, resuelve la integración y comprueba las pruebas; el mensaje «terminado» de un subagente no es evidencia.

## Relación con los ADR

Un ADR registra una **decisión de arquitectura** y vive en [`docs/decisiones/`](../decisiones/README.md) como `ADR-NNNN-nombre.md`.

- Antes de redactar `spec.md`, buscar ADR en `docs/decisiones/`. Citar en la spec el **ID, estado y ruta** de cada ADR relevante y qué restricción aporta.
- Un ADR en estado **Propuesto** no es una decisión: se cita como punto abierto. Lo cierra quien desarrolla; un agente de IA no cierra por su cuenta un ADR Propuesto.
- Si la spec descubre una decisión de arquitectura nueva, se describe como punto abierto sin escoger opción. El plan identifica qué ADR debe redactarse, y se registra y revisa **antes** de ejecutar las tareas que dependen de él.
- Los documentos aprobados no se editan para hacerlos encajar con una implementación: se registra la contradicción y se solicita decisión.

## Datos de ejemplo

Nunca se escriben datos personales reales. Usar solo ficticios, por ejemplo documento `0000000000` y correo `usuario@ejemplo.test`.

## Specs existentes

| Spec | Título | Estado |
|---|---|---|
| [spec-0001](spec-0001/spec.md) | Fundación del producto | Borrador para revisión funcional |
| [spec-0002](spec-0002/spec.md) | Pantallas del usuario, issue #11 | Aprobado (2026-10-22) |
| [spec-0003](spec-0003/spec.md) | Hoja de vida del personal | Aprobado (v0.4, 2026-10-22); v0.5 en revisión |
| [spec-0004](spec-0004/spec.md) | Tipos institucionales base y clasificación docente, issue #80 | Aprobado (v0.1, 2026-10-26) |
