# Plan — Conservar parroquia al guardar la ficha personal

Spec: `spec.md`, v0.1 (Issue #140).

1. Corregir la sincronización de residencia en `FichaPersonalComponent`: conservar la selección existente sin limpiar listas hijas si la parroquia y cantón actuales ya están cargados; evitar descarte accidental durante la recarga asíncrona (RF-PAR-001).
2. Marcar e invalidar de forma visible la selección de parroquia cuando el usuario cambia provincia o cantón, alertando que debe elegir una parroquia válida y evitando guardar vacío sin aviso (RF-PAR-002).
3. Añadir pruebas en backend (`HojaDeVidaTests.cs`) que aseguren la persistencia de `ParroquiaResidenciaId` al actualizar y consultar (RF-PAR-003).
4. Añadir pruebas en frontend (`ficha-personal.component.spec.ts`) para reproducir y verificar: selección completa con guardado en primer intento, invalidación visible al cambiar cantón/provincia y persistencia (RF-PAR-004).
5. Ejecutar pruebas locales selectivas de backend y frontend para verificar antes de cualquier commit.
