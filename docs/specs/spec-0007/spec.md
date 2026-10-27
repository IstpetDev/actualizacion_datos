# Validación de hoja de vida, correo institucional y perfil automático — Spec

**ID:** spec-0007; issue #88

**Versión:** 0.1

**Estado:** Aprobado

**Revisor funcional:** Responsable solicitante de #88

**Fecha:** 2026-10-26

**Áreas afectadas:** `src/Backend`, `src/Frontend`, migración y exportaciones

## Problema y resultado esperado

La ficha acepta formatos inválidos y la base solo limita algunas longitudes. Los dominios institucionales no están configurados y el perfil es texto libre, pese a que el responsable funcional pide generarlo al producir el CV.

Se propone validar el mismo conjunto de reglas en pantalla, guardado y envío; configurar dominios por institución; rechazar perfiles escritos por clientes y generar un resumen determinista en revisión y exportación. El resultado debe permitir corregir datos antiguos con mensajes por campo y conservar el guardado de borradores incompletos.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace | Estado y restricción |
|---|---|---|
| Issue | https://github.com/IstpetDev/actualizacion_datos/issues/88 | Tres partes y matriz de pruebas obligatoria, incluido aislamiento de dominios, rechazo de perfil y envío con datos antiguos. |
| Spec vigente | `docs/specs/spec-0003/spec.md`, v0.4 aprobada | RF-HDV-020 permite escribir perfil; este cambio debe sustituir expresamente esa regla mediante nota y ADR, sin aprobar la v0.5 pendiente. La foto sigue opcional. |
| ADR | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Configuración y consultas aisladas por institución. |
| ADR | ADR-0010, Vigente, `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md` | Secciones, catálogos y edición de hoja de vida. |
| ADR | ADR-0012 y ADR-0013, Vigentes, `docs/decisiones/` | Carga de nómina y tratamiento de cuentas bancarias; conservar cifrado, máscara y permisos. |
| ADR abierto | ADR-0014, Propuesto, `docs/decisiones/ADR-0014-carga-de-nomina-real.md` | La regla 6 coincide con los teléfonos pedidos por #88. Solo se adopta esa regla al aprobar esta spec; no se cierra el ADR ni se implementan sus otras propuestas. |
| ADR abierto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | No se cierra con este cambio. |
| Dependencia anunciada | [Comentario de #89](https://github.com/IstpetDev/actualizacion_datos/issues/88#issuecomment-6426920811), [PR #94](https://github.com/IstpetDev/actualizacion_datos/pull/94) | Propone `MensajeRespuesta.errores`, middleware y `extraerDetalleError`. Al revisar, sigue abierto y con conflictos; no está en `develop`. Sus números spec-0004/ADR-0020 colisionan con #80 y necesitan resolución en su integración. |
| Guardado actual | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioHojaDeVida.cs` | Valida catálogos y archivos propios, pero no estos formatos. |
| Envío actual | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs` | Conserva la obligatoriedad actual; debe agregar motivos de formato sin perder los de presencia. |
| Límites actuales | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/HojaDeVida/` | Longitudes y restricciones de persistencia citadas en el inventario. |
| Exportación actual | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioExportacion.cs` | Hay Excel y ZIP con inventario/respaldos; no se encontró un CV individual generado. |
| Conflicto de pantalla | [Issue #83](https://github.com/IstpetDev/actualizacion_datos/issues/83) | Modifica navegación administrativa; la configuración de dominios debe ser una sección acotada que se pueda conservar al integrarlo. |

No se supone integrado un PR porque un comentario lo anuncie. La numeración se comprobará de nuevo antes de abrir el PR, conforme a la guía de specs; una renumeración documental no cambia esta versión funcional.

## Alcance

**Incluye:** formatos y errores por campo; guardado de ficha, referencias y horas de capacitación; límites de texto existentes en las demás secciones; coherencias numéricas/fechas ya vigentes; configuración institucional de dominios; revisión de datos antiguos al enviar; perfil generado; CV HTML en el ZIP y perfil en Excel y revisión; pruebas completas y cliente regenerado.

**Excluye:** verificar existencia o titularidad de teléfonos/correos/cuentas, enviar correos, validar números de registro contra SENESCYT, agregar validación bancaria por entidad, rediseñar #83, implementar todo ADR-0014, generar texto con IA, crear PDF o cambiar permisos y campos obligatorios de la hoja de vida.

## Reglas funcionales propuestas para aprobación

### Normalización y obligatoriedad

- Normalizar texto a Unicode NFC y recortar espacios exteriores ordinarios; comprobar controles antes de recortar para no ocultarlos. Conservar tildes, ñ, apóstrofes y guiones de los nombres. No eliminar letras de un teléfono ni truncar silenciosamente valores largos.
- Un campo opcional vacío queda vacío; no se hace obligatorio por tener una regla de formato. Se mantienen los obligatorios actuales al enviar: primer nombre y apellido, sexo, nacimiento, país de nacimiento, estado civil, nacionalidad, parroquia de residencia, calle principal, al menos un teléfono y correo institucional.
- Se puede guardar un borrador incompleto con los valores presentes válidos. Guardar se bloquea por formatos inválidos; Enviar también por faltantes. Los campos obligatorios existentes que no estén expuestos deben poder completarse en la pantalla, sin añadir obligatoriedades nuevas.
- Nombres: letras Unicode y marcas de acento, espacios ordinarios, apóstrofes `'` y `’` y guion `-`, con al menos una letra. Sin dígitos, controles u otros símbolos. Cada nombre/apellido de ficha tiene máximo 100 caracteres; el nombre completo de referencia, 300.
- Nacimiento: desde `1900-01-01` y con **18 años cumplidos como mínimo**. La referencia es la fecha actual de Ecuador; los límites concretos comunicados por el backend se usan también en el formulario. Se prueban cumpleaños y años bisiestos. Es una regla funcional propuesta, no una afirmación jurídica.

### Tabla de reglas y casos de frontera

Todos los valores son ficticios o expresiones de prueba. Cada fila exige casos válidos, inválidos, vacío opcional y frontera de longitud/rango cuando corresponda, en backend y frontend.

| Campo | Regla al guardar y enviar | Ejemplo válido | Ejemplo inválido / límite |
|---|---|---|---|
| `celular` | Dígitos ASCII, `^09[0-9]{8}$` | `0900000000` (ficticio) | `090000000`, letras, espacios interiores, `0800000000`, 11 dígitos |
| `telefonoConvencional` | Dígitos ASCII, `^0[2-7][0-9]{7}$` | `020000000` (ficticio) | `090000000`, 8/10 dígitos, signos o letras |
| `codigoPostal` | Entre 1 y 6 dígitos ASCII si está informado; conservar ceros iniciales | `000001`, `1` | `170306ssssss`, 7 dígitos, signos o dígitos Unicode no ASCII |
| Cuatro nombres/apellidos de ficha | Regla Unicode anterior; máximo 100 cada uno; segundo nombre/apellido opcionales | `Persona Ficticia`, `Ficticio-Ñandú`, `O’Ficticio` | `Persona2`, `<Ficticio>`, tabulador, 101 caracteres |
| `fechaNacimiento` | Intervalo de nacimiento propuesto; formato de fecha de calendario | Cumple 18 hoy; `1900-01-01` | Cumple 18 mañana; `1899-12-31`; mañana; fecha inexistente |
| `callePrincipal`, `calleSecundaria` | Máximo 200; sin caracteres de control; sin imponer formato numérico | `Calle ficticia 1` | 201 caracteres, salto de línea, tabulador o NUL |
| `numeroCasa` | Máximo 20; texto sin controles, permite letras y guiones | `S/N`, `A-1` | 21 caracteres o controles |
| `referenciaDomicilio` | Máximo 300; sin controles | `Frente al edificio ficticio` | 301 caracteres o controles |
| `correoInstitucional` | Máximo 200, correo sin nombre visible, espacios o controles, un solo `@`; dominio DNS válido; regla institucional inferior | `persona@institucion-a.ejemplo.test` | `a@b@institucion-a.ejemplo.test`, espacio, dominio ajeno, subdominio no configurado |
| Referencia: `nombresApellidos`, `telefono` | Nombre con regla Unicode y máximo 300; teléfono obligatorio celular o convencional de las dos reglas | `Referencia Ficticia`, `0900000000` | Nombre con dígitos; teléfono con letras, incompleto o prefijo ajeno |
| Capacitación: `numeroHoras` | Si está informado, entero positivo hasta `2147483647`; no aceptar fracciones, texto, cero, negativos ni desbordamiento | `1`, `40` | `0`, `-1`, `1.5`, `horas`, `2147483648` |
| Porcentajes de discapacidad/beca | Enteros de 0 a 100, opcionales según reglas actuales | `0`, `100` | `-1`, `101`, fracción |
| Monto de beca | Decimal no negativo y dentro de la precisión vigente de persistencia; sin nueva obligatoriedad | `0`, `50.25` | Negativo, texto, desbordamiento de precisión |

### Inventario del resto de la hoja de vida

| Campos | Estado observado y tratamiento en este cambio | Lo que no se promete validar |
|---|---|---|
| Título: nombre e institución escrita (300), registro SENESCYT (50) | Hoy presencia/coherencias en dominio y longitudes en EF; agregar límite y rechazo de controles en las dos capas, con mensajes por campo | Existencia o formato oficial del registro, validez real del título |
| Estudio en curso: programa/institución escrita (300) | Mismos límites de texto; conservar catálogo, beca y rangos vigentes | Acreditación o matrícula real |
| Capacitación: evento/organizador (300), lugar (200) | Agregar límites/control de texto y las horas de la tabla; conservar tipo y rango de fechas | Certificación o equivalencia de horas |
| Referencia: título/cargo (200), empresa (300) | Agregar límites y controles; nombre/teléfono con reglas de la tabla | Titularidad del teléfono o relación personal real |
| Experiencia: empleador (300), cargo (200), ciudad (150), funciones (4000) | Agregar límites; textos de una línea sin controles; funciones permite saltos LF normalizados, sin otros controles. Conservar inicio ≤ fin y coherencia «trabaja actualmente» | Verificar empleador, cargo o duración real; nuevas restricciones de edad laboral |
| Fechas de títulos, estudios, cursos y experiencia | Conservar las coherencias actuales de obtención/registro y rangos; errores identifican el campo | No se inventa una nueva política global de fechas futuras, salvo reglas ya vigentes |
| Cuenta: número y banco | Conservar número de 6 a 20 dígitos tras permitir espacios/guiones, cifrado y máscara; banco escrito máximo 200 y sin controles; catálogo/tipo válidos | Cuenta existente, titularidad, longitud o dígito verificador particular de cada banco |
| Carné de discapacidad (30), número de documento personal (100), entidad emisora (150), categoría de licencia (30) | Límites existentes y ausencia de controles, sin convertir textos legítimos a «solo números» | Formatos por entidad emisora o comprobación oficial |
| Catálogos, archivos, documentos y foto | Mantener validación de tipo activo, pertenencia, archivo propio, formatos/tamaño y reglas vigentes | Validez del contenido del respaldo; no cambia la obligatoriedad de datos sensibles |
| `perfil` escrito | Ya no es editable ni aceptado en peticiones; tratamiento específico inferior | No evaluar ni reutilizar el texto libre antiguo |

Los campos de texto hoy limitados solo por EF quedan explícitamente validados antes de persistir. Los tipos enteros/decimales y fechas mal formados enviados directamente a la API deben terminar en 400, no 500. No se amplía el alcance a reglas externas no definidas en esta tabla.

### Correo institucional por institución

1. La configuración pertenece a `Institucion`: lista de dominios permitidos, editable por admin o superadmin en su contexto autorizado. Lectura de la política para la persona de la misma institución. Nunca se toma la institución de un identificador arbitrario enviado por un usuario ordinario.
2. Propuesta: hasta 10 dominios DNS distintos, de máximo 253 caracteres cada uno. El admin puede escribir un `@` inicial que se quita; se normalizan a minúsculas y sin duplicados. No admitir esquemas, rutas, puertos, comodines, espacios, etiquetas inválidas o múltiples `@`. Los subdominios se configuran como dominios independientes, sin herencia implícita.
3. La parte de dominio del correo se compara completa, sin distinguir mayúsculas. `institucion-a.ejemplo.test` no admite `otra-institucion.ejemplo.test`, `sub.institucion-a.ejemplo.test` ni `institucion-a.ejemplo.test.otro.test`, salvo que ese dominio exacto esté configurado. El formato exige una sola `@`.
4. Si la lista está vacía, **se exige formato de correo, pero no un dominio concreto**; el admin ve un aviso visible para configurarlo. No se hace opcional el correo al enviar. No se asigna un dominio por semejanza del nombre de la institución ni se siembra uno real a todos los tenants.
5. La pantalla de la persona muestra los dominios esperados y errores como «Use su correo @institucion-a.ejemplo.test». Si hay varios, se muestran las alternativas. Si falla cargar la política, se informa el fallo y se evita guardar asumiendo una política vacía.
6. Una modificación de dominios no reescribe correos guardados ni cambia estados enviados/aprobados. En la siguiente edición o intento de enviar se muestran los campos incompatibles y se exige corregirlos. La otra institución no resulta afectada.
7. La migración agrega configuración vacía, sin reducir columnas ni truncar datos antiguos. La sección de configuración se incorpora como unidad acotada, conservando el trabajo de #83 y sin tocar asignación de personas de #76.

### Datos cargados y antiguos

- Leer una ficha antigua no falla ni elimina datos. Los valores inválidos aparecen marcados en sus campos, con su motivo; no se bloquea sin explicación ni se exige una nueva importación para corregirlos.
- Guardar ficha exige corregir los formatos presentes en esa ficha. Guardar otro ítem válido no queda bloqueado por un error ajeno; Enviar revisa todo lo persistido con las mismas reglas y devuelve sección, campo/ítem y motivo.
- En cargas nuevas de nómina, los formatos de ficha cubiertos se verifican antes de incorporarlos: un dato no interpretable queda vacío con advertencia de fila/campo, sin eco de su contenido. No rechazar una persona completa únicamente por un dato opcional inválido ni corregir valores por aproximación. En particular, un celular incompleto no pasa a convencional. Se conservan las reglas de documento, duplicados y habilitación de ADR-0012/0018.
- No se hace una migración que convierta o borre masivamente teléfonos, nombres, fechas o correos antiguos. Las longitudes físicas existentes pueden conservarse para permitir la lectura y corrección de datos previos.

### Perfil profesional y CV

1. Retirar el control de perfil de la persona y no incluirlo en el request del cliente. La API rechaza la presencia de `perfil` en un guardado —incluido `null` o vacío— con 400 y error del campo. No basta con quitar el textarea o ignorar el dato al persistir.
2. Generación determinista, sin IA ni servicios externos, a partir del número de títulos, estudios en curso, capacitaciones y experiencias del propio expediente. Ejemplo ficticio: «Trayectoria registrada: 2 títulos académicos, 1 estudio en curso, 3 capacitaciones y 1 experiencia laboral». El texto no afirma competencias, acreditación ni años que no consten y no usa sexo, etnia, discapacidad, edad, contactos o cuenta bancaria.
3. Se calcula al consultar el expediente de revisión y al generar la exportación. Ambos usan la misma regla sobre los datos de esa operación. No se almacena un texto generado que pueda quedar desactualizado ni se permite editarlo.
4. Mostrar «Perfil profesional generado» en la vista del supervisor. Agregar una hoja de vida **HTML autocontenida por persona aprobada dentro del ZIP existente**, con ficha, perfil y secciones del expediente; codificar el texto para HTML y conservar el aislamiento y la máscara bancaria. El Excel incluye la columna de perfil generado. No se implementa PDF ni se abre acceso público a los CV.
5. Conservar temporalmente la columna histórica `fichas_personales.perfil`, **sin usar ni devolver su texto antiguo** y sin aceptar nuevos valores. No hay borrado masivo automático. Se documenta su carácter de dato legado; su eliminación física futura requiere otra decisión explícita.
6. Registrar el cambio respecto de RF-HDV-020 en una nota de spec-0003 y en un ADR antes de las tareas dependientes. No reescribir retroactivamente la aprobación de v0.4 ni aprobar sus otras propuestas pendientes.

### Errores, seguridad y contrato

Respuesta 400 con `mensaje` y `errores: { campo: [motivos] }`, compatible con el contrato de #89; claves de campo estables, no valores recibidos. El frontend muestra los motivos junto a los controles, con asociación accesible, y bloquea Guardar/Enviar mientras corresponda. Los errores de servidor también se asignan al campo; se mantienen avisos de red/campaña.

Los logs de validación no contienen cuerpo, nombres, teléfonos, correos, perfil enviado ni mensajes de excepción que los reproduzcan. Se prueban respuestas y logs con valores ficticios reconocibles. Los dominios esperados son configuración institucional y sí pueden aparecer en el mensaje. Cambian DTO/configuración y exportaciones: regenerar OpenAPI y cliente en el mismo cambio y comprobar el contrato.

## Requisitos verificables

| ID | Comportamiento observable | Fuente |
|---|---|---|
| RF-VAL-001 | Ficha, referencias, horas y límites del inventario se validan en frontend y backend, con la misma matriz y fronteras. Una petición directa inválida no persiste cambios parciales. | Parte 1 |
| RF-VAL-002 | Guardar admite borradores incompletos con formatos presentes válidos; Enviar conserva obligatoriedad y verifica formatos de ficha e ítems persistidos. | Pruebas obligatorias; spec-0003 |
| RF-VAL-003 | Errores por campo en español y bloqueo de botones; API 400 estructurado y logs sin eco de datos personales. | Parte 1; dependencia #89 |
| RF-VAL-004 | Admin/superadmin pueden configurar dominios de su institución; la persona puede leer su política y ambos lados rechazan dominios ajenos. | Parte 2 |
| RF-VAL-005 | Sin dominios se permite un correo de formato válido y se avisa al admin; cambiar política no altera datos/estados históricos y se aplica al siguiente guardado/envío, con motivo. | Decisiones propuestas de parte 2 |
| RF-VAL-006 | Datos antiguos pueden leerse y corregirse; la carga nueva deja valores no interpretables vacíos con advertencia segura y no reclasifica celulares inválidos como fijos. | Parte 1; regla telefónica solicitada |
| RF-VAL-007 | No existe editor de perfil; cualquier presencia del campo en la petición se rechaza. El valor histórico no se muestra ni se exporta. | Parte 3; criterio obligatorio |
| RF-VAL-008 | La misma generación determinista aparece en revisión, CV HTML del ZIP y Excel, por institución y solo con sus datos permitidos. | Parte 3; propuesta de formato de CV |
| RF-VAL-009 | Spec-0003 queda anotada, las decisiones están en ADR, migración y cliente se incluyen, y se integra el contrato de errores sin duplicar #89 ni sobrescribir #83. | Reglas del repo; partes 2 y 3 |
| RF-VAL-010 | Compilaciones, suites completas, Docker donde aplica, lint, formato, contrato y CI del HEAD final pasan antes de intentar aprobación, merge y cierre. | Pruebas obligatorias |

## Escenarios del proceso

1. **Edición válida y borrador:** persona de una campaña abierta guarda valores válidos con opcionales vacíos; al completar los obligatorios y los demás requisitos vigentes puede enviar. Probar ambos estados, sin nuevas obligatoriedades.
2. **Rechazo por campo:** introducir cada caso inválido de la tabla, ver el mensaje y el botón bloqueado; repetir por HTTP y comprobar 400, claves y ausencia de cambios. Corregir y guardar sin recargar. Probar las mismas reglas en referencias y capacitación.
3. **Dominios aislados:** instituciones ficticias A/B con dominios diferentes; el correo de B se rechaza para A y se admite para B. Probar mayúsculas, dos `@`, sufijos y subdominios engañosos, varios dominios, falta de configuración y un usuario que intente cambiar la política ajena.
4. **Datos antiguos y política nueva:** cargar antes de la regla una ficha con celular o correo inválido; leerla, ver errores específicos, corregir y enviar. Cambiar dominios no modifica estados previos ni otra institución. En una carga nueva, comprobar advertencias sin valores y teléfono incompleto vacío.
5. **Perfil manipulado y exportación:** enviar `perfil` con texto, vacío y nulo por API; todos se rechazan. Insertar un perfil histórico ficticio y comprobar que no se usa. El supervisor y el CV/Excel muestran el resumen generado, sin texto histórico ni datos bancarios completos. Verificar HTML con texto escapado y ZIP aislado.

## Criterios de aceptación y pruebas

- [x] RF-VAL-001: casos válidos, inválidos, vacíos opcionales y límites de **cada campo** de la matriz en xUnit y Vitest; conservar reglas del inventario o su exclusión explícita.
- [x] RF-VAL-002/006: guardado y envío válidos siguen funcionando; antiguos inválidos tienen mensajes y camino de corrección; importación no introduce formatos rechazados silenciosamente.
- [x] RF-VAL-003: mensajes asociados a campos y botones bloqueados; peticiones directas 400 con motivos; captura de logs sin eco de los valores ficticios.
- [x] RF-VAL-004/005: migración de dominios y pruebas de permisos, aislamiento A/B, configuración vacía, cambio posterior, mayúsculas, un único `@` y coincidencia exacta.
- [x] RF-VAL-007/008: rechazo explícito de perfil por HTTP, retirada del editor, legado no expuesto y generación coincidente en revisión, HTML del ZIP y Excel.
- [x] RF-VAL-009: ADR y nota de RF-HDV-020 antes de implementar; integración del contrato #89 resuelta; ninguna regla ni permiso de GitHub modificado.
- [ ] RF-VAL-010: `dotnet build src/Backend`, `dotnet test src/Backend`, `corepack pnpm --dir src/Frontend test:ci`, compilación frontend, lint, format:check y formato .NET; pruebas PostgreSQL para migración y aislamiento; OpenAPI/cliente regenerados y job correcto.
- [x] Recorrido de navegador con API real, personas ficticias y capturas: corregir formato, dominio esperado y envío válido; revisión y descarga con perfil generado.
- [ ] PR hacia `develop`, sin conflictos y CI del HEAD final correcto; intentar aprobación, integrar y verificar #88 cerrado, sin comentarios adicionales.

## Puntos que requieren decisión

| ID | Propuesta para aprobar | Impacto |
|---|---|---|
| PD-VAL-01 | Mínimo 18 años, desde 1900; opcionales siguen opcionales y se mantiene borrador incompleto | Fija fronteras y evita bloquear guardado por presencia |
| PD-VAL-02 | Dominios por institución, lista vacía sin restricción de dominio y con aviso; aplicar nueva política en la siguiente edición/envío sin alterar estados | Requiere ADR y migración de configuración |
| PD-VAL-03 | Resumen determinista calculado en revisión/exportación; CV HTML en ZIP y columna en Excel; perfil histórico conservado pero ignorado | Sustituye RF-HDV-020 y requiere ADR |
| PD-VAL-04 | Matriz e inventario completos, saneamiento tolerante con advertencias en carga nueva y corrección explícita de antiguos | Define alcance exacto y tratamiento de datos existentes |
| PD-VAL-05 | Reutilizar el contrato de #94 cuando esté integrado; resolver sus conflictos/numeración sin sobrescribir #80 y mantener sección de dominios acotada respecto a #83 | Dependencia técnica que el plan debe concretar antes de editar archivos comunes |

## Revisión funcional

**Versión revisada:** 0.1.

**Decisión:** Aprobada; PD-VAL-01 a PD-VAL-05 aceptados.

**Aprobó:** Responsable solicitante en esta conversación.

**Fecha y evidencia:** 2026-10-26; respuesta «si, continua» después de presentar y solicitar aprobación de spec-0007 v0.1.

**Ajustes solicitados:** Ninguno.

Solo tras aprobar esta versión se crean `plan.md`, `tasks.md` y `test-e2e.md`, se registran los ADR correspondientes y se implementa. La aprobación del merge y cierre ya está autorizada por la solicitud del usuario, condicionada a completar y probar todo el alcance.

**Renumeración documental:** aprobada originalmente como spec-0005 v0.1; renumerada a spec-0007 después de integrarse los PR #95 y #96, que ocuparon los números 0005 y 0006. Se conserva el alcance y la aprobación funcional. Los ADR correspondientes pasan de 0023/0024 a 0024/0025.
