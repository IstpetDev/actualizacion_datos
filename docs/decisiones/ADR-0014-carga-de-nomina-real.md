# ADR-0014 — Carga de la nómina real: encabezados, nulos textuales y alias de catálogo

- **Estado:** Propuesto
- **Fecha:** 2026-10-22

## Contexto

ADR-0012 (Vigente) fijó cómo cargar la nómina a partir de la **lista de columnas** que describió quien desarrolla. El 2026-10-22 se revisó el **archivo real** de personal que entrega la institución. Se leyeron solo encabezados, conteos y valores de catálogo; no se copió ningún dato personal y el archivo no está en el repositorio (ADR-0012, consecuencias). El archivo real difiere de lo supuesto:

| Hecho observado | ADR-0012 suponía | Efecto si no se ajusta |
|---|---|---|
| Fila 1 con el nombre de la institución; encabezados en la **fila 2**; primera columna «N°» | Encabezados en la fila 1 | La carga no encuentra las columnas y rechaza todo |
| **Sin** `tipo_cuenta_banco`, `banco` ni `num_cuenta_banco` (13 columnas más «N°») | 16 columnas, tres bancarias | 109 advertencias inútiles, una por fila |
| Texto literal `NULL` en `Estudios` (3), `Nacionalidad` (2) y `Sangre` (2) | Celda vacía | `NULL` no coincide con nada y genera una advertencia «no reconocido» en vez de «vacío» |
| Sangre escrita `O +`, `A +`, `AB -` (con espacio) | `O+` | ~105 advertencias falsas y la sangre de casi todos queda en nulo |
| Estado civil `Union Libre` | Catálogo «Unión de hecho» (`UNION_HECHO`) | 3 advertencias y datos perdidos |
| Nacionalidad: ~10 variantes con errores (`Ecuatorina`, `Eciatoriana`…), `Ecuatoriano`, `Ecuador`, una fecha (`35419`) en esa columna | Coincidencia con nombre o gentilicio del catálogo | El catálogo `Pais` no tiene gentilicios: **ninguna** coincide |
| Un celular de 9 dígitos que empieza con `09` | Si no son 10 dígitos con `09`, va a teléfono convencional | Un celular incompleto se guarda como teléfono fijo |
| 109 cédulas de 10 dígitos como texto; una repetida; fechas como serial de Excel | Igual | Sin cambios |

## Opciones

1. **Pedir a la institución que corrija el archivo.** No depende de código, pero se repetirá en cada carga y retrasa el acceso de las personas.
2. **Ajustar la lectura de la carga y agregar alias de catálogo.** La carga tolera el formato real; las variantes conocidas se resuelven con una tabla de alias que el admin o el superadmin mantienen. Lo que no se reconoce sigue quedando en nulo con advertencia (ADR-0012).
3. **Coincidencia aproximada automática** (distancia de edición). Resuelve errores de tipeo sin mantener alias, pero puede asignar valores equivocados sin que nadie lo note (por ejemplo, un país por otro) y eso se exportaría como dato real.

## Decisión

Se **propone la opción 2**. Queda en Propuesto hasta que quien desarrolla la cierre.

| # | Regla | Por qué |
|---|---|---|
| 1 | La carga busca la fila de encabezados entre las primeras 10 filas: la primera que contenga `DNI`. Las filas anteriores y la columna «N°» se ignoran. | El archivo real trae un título; buscar el encabezado es más estable que fijar un número de fila. |
| 2 | Una celda con `NULL`, `N/A` o `-` (sin distinguir mayúsculas y quitando espacios) se trata como **vacía**: nulo con advertencia «vacío», no «no reconocido». | El informe distingue lo que falta de lo que está mal escrito. |
| 3 | Antes de buscar en el catálogo, el valor se normaliza: sin tildes, en mayúsculas, sin espacios repetidos; en la sangre se eliminan **todos** los espacios (`O +` → `O+`). | Coincidencia exacta tras normalizar, sin adivinar. |
| 4 | Nueva tabla compartida `alias_elementos_catalogo` (`elemento_id`, `alias_normalizado`, único por tipo de catálogo). La carga busca primero por código o nombre y luego por alias. Semilla inicial: `UNION LIBRE` → «Unión de hecho»; `ECUATORIANA`, `ECUATORIANO`, `ECUADOR` → Ecuador; `VENEZOLANA`, `VENEZOLANO` → Venezuela. | Los gentilicios y las variantes locales no son el nombre oficial del catálogo. Una tabla aparte no altera las listas oficiales (ADR-0010 dec. 5). |
| 5 | Los errores de tipeo **no** se resuelven solos: quedan en nulo con advertencia y el informe los agrupa por valor («`Ecuatorina`: 2 filas») para que el admin agregue el alias y vuelva a cargar. | Evita asignaciones silenciosas equivocadas (opción 3); el admin decide una vez por variante, no por persona. |
| 6 | `Teléfono 2`: 10 dígitos con `09` → celular; 9 dígitos con `0[2-7]` → convencional; **cualquier otro caso → nulo con advertencia**. | Un celular incompleto no es un teléfono fijo. |
| 7 | Si el archivo **no tiene** las columnas bancarias, no se advierte por fila; el informe lo dice una sola vez. Si las tiene, rige ADR-0012 y ADR-0013. | El archivo real no las trae; la cuenta la registra la persona (estado `sin-nomina` de #45). |
| 8 | Un número en una columna de texto (p. ej. `35419` en `Nacionalidad`) se trata como «no reconocido». | No se interpreta como fecha fuera de su columna. |

Lo demás de ADR-0012 sigue vigente (rechazo por documento, división de nombres, informe sin datos personales, columnas que no se importan).

## Consecuencias

- Una migración nueva (`alias_elementos_catalogo`) y su semilla. La importación de catálogos (#48) puede ampliarse después para importar alias.
- El informe de carga gana una sección «valores no reconocidos agrupados»; cambia el contrato de T-09 (#44) y hay que regenerar `openapi/v1.json` y el cliente.
- Las pruebas usan filas ficticias que reproducen cada caso (título en la fila 1, `NULL`, `O +`, `Union Libre`, variantes de nacionalidad, teléfono de 9 dígitos, sin columnas bancarias); nunca el archivo real.
- Si el revisor funcional decide incluir al personal no docente (PD-HDV-20), la columna `Cargo de Trabajo` necesita la misma normalización y alias para asignar el tipo de funcionario (hoy hay 16 variantes de cargo, con errores de tipeo y género).

## ADR relacionados

- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0012 — Carga de nómina: columnas, valores nulos y división de nombres (este ADR lo complementa con reglas del archivo real; no lo reemplaza).
- ADR-0013 — Datos bancarios del personal.
