# Validación y perfil automático — Verificación

Spec v0.1 aprobada. Ambiente local aislado, PostgreSQL efímero y API real para el recorrido de navegador; xUnit y Vitest para matrices. No se accede a producción ni se usan secretos o datos personales reales.

| Caso | Requisitos | Resultado esperado |
|---|---|---|
| V-01 | RF-VAL-001/003 | Cada campo de la matriz: válido, inválido, vacío opcional y fronteras en backend/frontend; 400 con campo y motivo; sin cambios ni eco en logs |
| V-02 | RF-VAL-004/005 | Dominios A/B, sin configurar, múltiples, mayúsculas, subdominios, dos arrobas, permisos y cabecera de otro tenant; aislamiento |
| V-03 | RF-VAL-002/006 | Leer y corregir ficha antigua, guardar borrador válido y enviar expediente completo; nuevos datos de nómina inválidos quedan vacíos con advertencia segura |
| V-04 | RF-VAL-007/008 | Enviar perfil no vacío, vacío y nulo: rechazo. Legado ignorado; mismo resumen en revisión, Excel y HTML del ZIP; HTML escapado y cuenta enmascarada |
| V-05 | RF-VAL-001 a 008 | Navegador con API real: mensajes y botones, corrección de formato/dominio y envío válido; exportación y revisión verificables |
| V-06 | RF-VAL-009/010 | Migración PostgreSQL, contrato regenerado, suites completas, compilaciones, lint/formato, checks finales y cierre |

Datos ficticios: nombres «Persona Ficticia», celular `0900000000`, convencional `020000000`, correo `persona@institucion-a.ejemplo.test`, cuenta `0000000000`. Fechas límite derivadas de un reloj de pruebas. Los datos anteriores de #80 que usaban teléfonos inválidos se corrigen en fixtures; no se relajan reglas para pasar pruebas.

Resultados pendientes; registrar en `docs/evidencia/issue-88.md` con versión de código, comandos, salidas y límites de simulación. Las pruebas de componente no se presentan como conexión real.
