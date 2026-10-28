# Retiro auditado de adjuntos por supervisor con eliminación física — Spec

**ID:** spec-0019; issue #139  
**Versión:** 0.1  
**Estado:** Alcance autorizado por el solicitante en issue #139 (Opción B: eliminación física)  
**Fecha:** 2026-10-28  
**Áreas:** `src/Backend`, `src/Frontend`

## Problema y resultado esperado

El supervisor debe poder retirar del expediente cualquier archivo adjunto incorrecto o ilegible solicitando una justificación obligatoria, registrando la auditoría inmutable del acto y eliminando físicamente el archivo del disco (volumen Docker o ruta local) para ahorrar espacio. En la interfaz del supervisor y del usuario, el adjunto deja de presentarse como vigente.

## Alcance y requisitos verificables

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RF-RET-001 | Retiro auditado con motivo obligatorio. | El supervisor selecciona retirar un adjunto de un expediente e ingresa obligatoriamente un motivo (no vacío). Sin motivo no se confirma la acción. |
| RF-RET-002 | Registro inmutable de auditoría. | Se registra en `Auditorias` el actor (supervisor), fecha UTC, institución, persona, metadatos del archivo (ID, nombre original, hash SHA-256) y el motivo del retiro. |
| RF-RET-003 | Eliminación física en disco y desvinculación. | Se desvincula la referencia del archivo en la sección correspondiente (ficha, documento, título, capacitación, etc.), se remueve de `archivos_adjuntos` y se borra físicamente el archivo `.bin` en disco mediante `IAlmacenArchivos.EliminarAsync`. |
| RF-RET-004 | Trazabilidad y visibilidad en consola. | Se emite mensaje informativo en consola del backend indicando la ruta física del archivo guardado o eliminado (para visibilidad en Docker y local). |
| RF-RET-005 | Interfaz de supervisor y usuario. | En el dashboard de supervisor, cada adjunto tiene opción de retiro que despliega modal con confirmación y motivo obligatorio. Al confirmarse, el expediente actualiza su listado inmediatamente. |
| RF-RET-006 | Cobertura de pruebas focalizadas. | Pruebas unitarias de backend (`ArchivosTests.cs`) y frontend cubren el rechazo sin motivo, la validación de pertenencia institucional, el registro de auditoría y la eliminación en disco con datos ficticios. |

## Datos de prueba

Identificadores GUID y nombres de archivo estrictamente ficticios (p. ej. `doc-prueba-139.pdf`, `foto-prueba.png`, `persona-ficticia-139`).
