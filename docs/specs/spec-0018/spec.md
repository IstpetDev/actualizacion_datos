# Conservar parroquia al guardar la ficha personal — Spec

**ID:** spec-0018; issue #140  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante en issue #140  
**Fecha:** 2026-10-28  
**Áreas:** `src/Frontend`, `src/Backend`

## Problema y resultado esperado

Al seleccionar provincia, cantón y parroquia, la parroquia debe conservarse y persistir desde el primer intento de guardado sin quedar vacía. Al cambiar provincia o cantón, una selección previa de parroquia que ya no corresponda debe invalidarse de forma visible y evitar guardados vacíos sin aviso.

## Alcance y requisitos verificables

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-PAR-001 | Conservar parroquia al guardar y recargar desde el primer intento. | Seleccionar provincia, cantón y parroquia, guardar y recargar conserva las tres selecciones en el primer intento y subsecuentes. No borra la selección por recarga ni por sincronización asíncrona. |
| RF-PAR-002 | Invalidación visible al cambiar provincia o cantón. | Cambiar provincia o cantón invalida de forma visible una parroquia que ya no corresponda, mostrando error accesible en vez de persistir un valor vacío en silencio. |
| RF-PAR-003 | Persistencia y verificación en backend. | El backend persiste y retorna `ParroquiaResidenciaId` correctamente en la ficha personal y rechaza catálogos inválidos. |
| RF-PAR-004 | Cobertura de pruebas focalizadas. | Pruebas unitarias de frontend (`ficha-personal.component.spec.ts`) y backend (`HojaDeVidaTests.cs`) cubren la sincronización, persistencia e invalidación con datos ficticios. |

## Datos de prueba

Ubicaciones y nombres estrictamente ficticios (p. ej. Pichincha / Quito / Iñaquito ficticios con identificadores numéricos de prueba).
