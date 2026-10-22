# ADR-0012 — Carga de nómina: columnas, valores nulos y división de nombres

- **Estado:** Propuesto
- **Fecha:** 2026-10-22

## Contexto

El admin carga la lista de personas de su institución (RF-ACC-001). Hoy `POST /personas/cargar` solo recibe `Documento`, `Nombre` y `Correo` (`PersonaCargaItem`). La institución entrega un archivo de nómina con más columnas y con **valores vacíos** en cualquiera de ellas. Las columnas del archivo son:

`Nombre`, `DNI`, `Cargo de Trabajo`, `Nacimiento`, `Edad`, `Estado Civil`, `Estudios`, `Nacionalidad`, `Dirección`, `Ciudad`, `Sangre`, `Fec. Ingreso`, `Teléfono 2`, `tipo_cuenta_banco`, `banco`, `num_cuenta_banco`.

Hechos que condicionan la decisión:

- La columna `Nombre` viene con el orden **apellidos y nombres** (confirmado por quien desarrolla). El modelo de la hoja de vida guarda cuatro campos: primer nombre, segundo nombre, primer apellido y segundo apellido (`FichaPersonal`, ADR-0010).
- Faltan en el archivo: correo, sexo y etnia. El correo es necesario para verificar el acceso (ADR-0007).
- `Persona.Nombre` y `Persona.Correo` ya admiten nulo. `FichaPersonal` guarda todo como opcional y valida la obligatoriedad al enviar (ADR-0009, ADR-0010).
- PD-09 de spec-0001 ya decidió que, dentro de una institución, el documento es único y las listas se deduplican en la ingesta.
- Las columnas bancarias son datos financieros personales. Se necesitan para comprobar que los pagos van a las cuentas correctas; su tratamiento (cifrado, quién las ve, exportación) se decide en **ADR-0013**, no aquí.
- Los datos de la nómina son lo que la institución afirma; la persona todavía no los ha confirmado.

## Opciones

1. **Rechazar toda fila con cualquier columna vacía o inválida.** Es simple, pero deja sin acceso a quien solo tiene un dato faltante y obliga al admin a corregir el archivo para cada caso.
2. **Cargar toda fila con documento válido y dejar en nulo lo que falte o no se pueda interpretar, informando cada caso.** Nada se inventa ni se pierde en silencio. Exige un informe por fila y que la persona complete o corrija lo que quedó vacío.
3. **Rellenar los vacíos con valores por defecto** («Sin dato», fecha ficticia). Descartada: un valor inventado se exporta y se aprueba como si fuera real.

## Decisión

Se propone la **opción 2**. Reglas:

### Qué hace fallar una fila

Solo el documento. Una fila se **rechaza** si el documento está vacío, tiene caracteres que no son dígitos (salvo que la institución use pasaporte; ver «Puntos abiertos») o está repetido dentro del archivo (se conserva la primera aparición). Una persona que ya existe en la institución se **omite** y se cuenta como duplicada (PD-09); la carga no sobrescribe lo que la persona ya editó.

Todo lo demás es opcional: si falta o no se puede interpretar, queda en nulo y se registra una **advertencia** con el número de fila y la columna.

### Tratamiento por columna

| Columna del archivo | Destino | Si viene vacía o no se reconoce |
|---|---|---|
| `DNI` | `Persona.Documento`, siempre como **texto** | Fila rechazada. Si tiene 9 dígitos, se completa con un cero a la izquierda (el cero lo pierde la hoja de cálculo) y se advierte. |
| `Nombre` | `Persona.Nombre` con el texto original y, además, los cuatro campos de `FichaPersonal` (ver «División de nombres») | `Persona.Nombre` y los cuatro campos quedan nulos; advertencia. La fila se carga. |
| `Cargo de Trabajo` | `Persona.TipoFuncionarioId`, buscando por nombre normalizado (sin tildes, sin mayúsculas ni espacios sobrantes) entre los tipos de funcionario de la institución. Mientras exista un solo tipo («Docente»), los requisitos se definen para «todos» y no dependen de esta correspondencia | Sin tipo; advertencia. El informe lista los cargos sin coincidencia para que el admin cree los tipos y los asigne. El texto del cargo no se guarda. |
| `Nacimiento` | `FichaPersonal.FechaNacimiento`; se aceptan `dd/MM/aaaa`, `aaaa-MM-dd` y fecha serial de Excel | Nulo; advertencia. Una fecha futura o anterior a 1900 se trata como no reconocida. |
| `Edad` | **No se importa.** | Se calcula desde la fecha de nacimiento cuando haga falta; guardarla la dejaría desactualizada. |
| `Estado Civil` | `FichaPersonal.EstadoCivilId`, por coincidencia con el nombre o el código del catálogo | Nulo; advertencia. |
| `Sangre` | `FichaPersonal.TipoSangreId`, por coincidencia con el catálogo (por ejemplo `O+`) | Nulo; advertencia. |
| `Nacionalidad` | `FichaPersonal.PaisNacionalidadId`, por coincidencia con el nombre o el gentilicio del país en el catálogo | Nulo; advertencia. |
| `Estudios` | **No se importa.** | Un título necesita grado, institución y registro; un solo valor no alcanza. La persona registra su formación en la hoja de vida. |
| `Dirección` | `FichaPersonal.CallePrincipal`, tal cual | Nulo; si excede el largo permitido, se rechaza el valor, no la fila, y se advierte. |
| `Ciudad` | **No se guarda.** La residencia del modelo es una parroquia del catálogo y la ciudad no la determina. | La persona elige su parroquia. Ver «Puntos abiertos». |
| `Fec. Ingreso` | **No se importa** en esta versión. | El modelo no tiene fecha de ingreso (ADR-0010, decisión 7). Ver «Puntos abiertos». |
| `Teléfono 2` | `FichaPersonal.Celular` si son 10 dígitos y empiezan con `09`; si no, `FichaPersonal.TelefonoConvencional` | Nulo; advertencia. |
| `tipo_cuenta_banco`, `banco`, `num_cuenta_banco` | Cuenta **propuesta** de la persona, con la protección que fije ADR-0013. Hasta que ADR-0013 sea Vigente, la carga **las ignora** y no las guarda. | Sin cuenta propuesta; advertencia. En ningún caso se escriben en registros ni en el informe. |

### División de nombres

`Persona.Nombre` conserva siempre el texto original. Los cuatro campos de `FichaPersonal` se **proponen** a partir de él y la persona los confirma o corrige antes de enviar (son obligatorios, spec-0003).

Algoritmo, con entrada «apellidos y nombres»:

1. Quitar espacios de los extremos y repetidos.
2. Separar por espacios y **unir las partículas** con la palabra que les sigue: `de`, `del`, `la`, `las`, `los`, `y`, `san`, `santa`, `da`, `di`, `van`, `von`. Así `De La Torre` es una sola palabra, y `De Los Angeles` también.
3. Con las palabras resultantes, en orden:

| Palabras | Primer apellido | Segundo apellido | Primer nombre | Segundo nombre | ¿Confirmación? |
|---|---|---|---|---|---|
| 0 | nulo | nulo | nulo | nulo | Sí |
| 1 | 1.ª | nulo | nulo | nulo | Sí |
| 2 | 1.ª | nulo | 2.ª | nulo | Sí |
| 3 | 1.ª | 2.ª | 3.ª | nulo | Sí (podría ser un apellido y dos nombres) |
| 4 | 1.ª | 2.ª | 3.ª | 4.ª | Solo si hubo partículas |
| más de 4 | 1.ª | 2.ª | 3.ª | 4.ª en adelante, unidas | Sí |

4. El texto de cada campo se conserva como vino, sin cambiar mayúsculas ni tildes: no se puede restituir una tilde que el archivo no trae.

Casos de prueba para quien lo implemente (nombres ficticios):

- `PEREZ GOMEZ ANA MARIA` → Pérez, Gómez, Ana, María (sin confirmación).
- `PEREZ GOMEZ ANA` → Pérez, Gómez, Ana, nulo (con confirmación).
- `DE LA TORRE RUIZ LUIS` → `DE LA TORRE`, Ruiz, Luis, nulo (con confirmación).
- `PEREZ ANA` → Pérez, nulo, Ana, nulo (con confirmación).
- `   ` → todos nulos (con confirmación).

### Informe de la carga

La respuesta de la carga sustituye `ResultadoCargaPersonasDto` por un resultado con: filas recibidas, cargadas, rechazadas (con motivo), omitidas por duplicado, y la lista de advertencias (fila, columna, motivo). El informe **no repite datos personales**: identifica la fila por su número y, como máximo, por los últimos cuatro dígitos del documento.

### Los datos cargados son propuestos

Lo cargado se muestra a la persona como valor inicial. No cuenta como verificado: para el envío rigen las mismas reglas de completitud que si lo hubiera escrito ella.

## Consecuencias

- Una nómina incompleta no bloquea accesos; el costo es que más personas llegan con campos por completar y el admin debe revisar el informe de advertencias.
- La carga actual (`PersonaCargaItem`) debe ampliarse con estas columnas. Eso cambia la API: hay que regenerar `openapi/v1.json` y el cliente del frontend en el mismo cambio (`AGENTS.md`).
- El archivo de nómina contiene datos personales reales: **no se guarda en el repositorio**, ni en las pruebas, ni en capturas. Las pruebas usan filas ficticias.
- Los nombres divididos automáticamente se equivocan en los casos ambiguos (tres palabras, apellidos compuestos poco comunes). Por eso son una propuesta y la persona los confirma.
- Se pierden `Estudios`, `Ciudad`, `Fec. Ingreso` y `Edad`; pueden recuperarse si se decide guardarlos. Los datos bancarios se cargan solo cuando ADR-0013 sea Vigente.

## Puntos abiertos

- **Datos bancarios.** Se necesitan (comprobar pagos). Falta cerrar ADR-0013: base legal, cifrado y quién los ve. Hasta entonces, la carga no los importa.
- **Fecha de ingreso.** ¿Se guarda como dato de la persona? Hoy no tiene dónde.
- **Ciudad.** ¿Basta con que la persona elija su parroquia, o se guarda también un texto de ciudad?
- **Pasaportes.** ¿La institución tiene personal sin cédula? Si es así, la regla de «solo dígitos» del documento cambia.
- **Teléfono 2.** El archivo no trae un «Teléfono 1». Confirmar con la institución qué significa y si el teléfono 1 se omitió.
- **Cargo sin tipo de funcionario.** ¿Basta con que el admin cree los tipos y los asigne después, o la carga debe poder crearlos?

## ADR relacionados

- ADR-0004 — Multitenancy: esquema único con `institucion_id`.
- ADR-0007 — Autenticación con cédula, cambio obligatorio y correo.
- ADR-0009 — Campos configurables por institución (Propuesto).
- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0013 — Datos bancarios (Propuesto).
