# Documento de hoja de vida desde plantillas globales — Pruebas de punta a punta

**Spec aprobado:** `spec.md` versión 0.1 (2026-10-27)  
**Plan:** `plan.md` versión 0.1  
**Responsable de ejecución:** Alexander Martínez  
**Ambiente:** local con Docker (API, PostgreSQL y frontend)

## Preparación

Datos ficticios únicamente (documento `0000000000`, correo `usuario@ejemplo.test`, nombres evidentes como «Persona Ficticia Uno»). Logos y portadas: imágenes neutras generadas para la prueba. **Nunca** las imágenes del formato de referencia.

| Dependencia | Configuración verificable | Estado previo |
|---|---|---|
| `superadmin` | Cuenta de pruebas | Plantilla inicial `clasico` publicada como predeterminada |
| Institución A | Un `admin`, un `supervisor`, tres personas (una aprobada completa, una sin foto, una en borrador) | Campaña abierta |
| Institución B | Un `admin` y una persona aprobada | Misma plantilla, otra marca |

## Matriz de cobertura

| Caso | Requisito y escenario | Tarea | Tipo | Evidencia esperada |
|---|---|---|---|---|
| E2E-01 | RF-PLA-001, 002, 005, 015; escenario 1 | T-06, T-10 | éxito y error | Publicar crea la versión 1; campo fuera del catálogo y `admin` publicando se rechazan |
| E2E-02 | RF-PLA-003, 004, 014, 018; escenario 2 | T-05, T-10 | éxito y error | Marca de A no cambia B; archivo inválido rechazado; sin configuración se usa la predeterminada |
| E2E-03 | RF-PLA-006 a 011, 016, 017; escenario 3 | T-02, T-07, T-08 | éxito y límite | PDF con marca de A, perfil generado, sin foto con marcador, sección vacía omitida, `<script>` literal; auditado |
| E2E-04 | RF-PLA-012; escenario 4 | T-08, T-11 | éxito | Vista previa con «Vista previa, no oficial» en cada página; aprobada sin marca |
| E2E-05 | RF-PLA-013; escenario 5 | T-09 | éxito y error | `.zip` con un PDF por persona aprobada y ninguno de no aprobadas |
| E2E-06 | RF-PLA-019; escenario 6 | T-05, T-06 | límite | Versión 2 publicada no cambia A hasta que su `admin` la acepta |
| E2E-07 | PD-PLA-16 | T-03, T-09 | rendimiento | Documento en menos de 2 s y menos de 5 MB; 100 personas en menos de 60 s |
| E2E-08 | Revisión manual | T-03, T-12 | revisión | Un PDF ficticio revisado a mano: portada, páginas, orden y legibilidad |

Cada caso se redacta con precondición, pasos, resultado esperado y obtenido, evidencia, fecha y ejecutor antes de ejecutarse.

## Resultado global

| Caso | Aprobado / Fallido / Bloqueado | Evidencia | Incidencia |
|---|---|---|---|
| E2E-01 a E2E-08 | Pendiente | Pendiente | Ninguna |
