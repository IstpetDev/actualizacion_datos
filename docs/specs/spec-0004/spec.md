# Tipos institucionales base y clasificación docente — Spec

**ID:** spec-0004; issue #80 (unifica #81)

**Versión:** 0.2 (ampliación aprobada; conserva la v0.1)

**Estado:** v0.2 aprobada

**Revisor funcional:** Responsable funcional del issue #80

**Fecha:** 2026-10-26

**Áreas afectadas:** `src/Backend` y `src/Frontend`

## Problema y resultado esperado

La v0.2 incorpora todos los comentarios funcionales publicados en #80 hasta el 2026-10-26: catálogos globales en producción, bancos, formación académica completa e institutos superiores. Las secciones siguientes hasta «Ampliación v0.2» conservan el alcance aprobado de v0.1. Sus restricciones de API se amplían únicamente para permitir la carga operativa por línea de comandos y la comprobación de arranque definidas en v0.2; no se propone cambiar contratos HTTP.

Una institución nueva no tiene tipos de funcionario ni de documento. El admin debe crearlos antes de configurar los requisitos. Además, «Aplica rol docente» sugiere un efecto que no existe y el formulario de documentos vuelve a proponer orden 1 después de cada alta.

La versión aprobada entrega catálogos institucionales iniciales editables, retira el control docente de la pantalla y sugiere un orden libre al crear documentos. La aprobación funcional de la lista y de la retirada del control consta al final del documento.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Issue | https://github.com/IstpetDev/actualizacion_datos/issues/80 | Semilla por institución e idempotente; decisión funcional de la lista y del campo docente; corrección del orden. Etiqueta `decision` ya presente. |
| Spec previa | `docs/specs/spec-0003/spec.md`, v0.4 aprobada; v0.5 en revisión | Configuración institucional de documentos y requisitos; cinco documentos acordados en el escenario 3. Las propuestas de la v0.5 no se consideran aprobadas. |
| ADR vigente | ADR-0004, Vigente, `docs/decisiones/ADR-0004-multitenancia-esquema-unico.md` | Aislamiento por institución. |
| ADR vigente | ADR-0010, Vigente, `docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md`, decisiones 6 y 7 | Tipos institucionales y requisitos por tipo de funcionario o para todos. |
| ADR abierto | ADR-0009, Propuesto, `docs/decisiones/ADR-0009-campos-configurables.md` | No se cierra ni se resuelve con este cambio. |
| Alta institucional | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioInstituciones.cs`, `CrearInstitucionAsync` | Actualmente guarda institución, administradores y auditoría sin estos catálogos. |
| Semilla existente | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/20261022172301_AgregarSemillasAcademicasYCapacitacion.cs` | Precedente de datos iniciales versionados; son catálogos compartidos, distintos de los tipos institucionales. |
| Pantalla | `src/Frontend/src/app/features/admin/configuracion/configuracion-requisitos.component.ts` | Muestra el control y la clasificación docente; reinicia el orden en 1. |

## Alcance

**Incluye:** nuevas instituciones y completar tipos faltantes en instituciones existentes; conservar personalizaciones; orden sugerido; retirada del control y de la columna docente de la pantalla de configuración.

**Excluye:** sembrar requisitos, imponer documentos obligatorios, modificar permisos o secciones de hoja de vida, asignar automáticamente tipos a personas y cambiar contratos públicos de la API. Los títulos académicos siguen en su sección existente y no se duplican como documento personal.

## Configuración funcional aprobada

Tipos de funcionario activos: `DOCENTE` («Docente», `EsDocente = true`) y `ADMINISTRATIVO` («Administrativo», `EsDocente = false`).

Tipos de documento activos, con estos valores iniciales configurables:

| Orden | Código | Nombre | Instrucción por defecto | Exige vencimiento |
|---|---|---|---|---|
| 1 | `CEDULA` | Cédula | Adjunte una copia legible de ambos lados de su cédula. | Sí |
| 2 | `PAPELETA_VOTACION` | Papeleta de votación | Adjunte una copia legible de su papeleta de votación. | No |
| 3 | `ANTECEDENTES_PENALES` | Certificado de antecedentes penales | Adjunte su certificado de antecedentes penales. | No |
| 4 | `DECLARACION_JURAMENTADA` | Declaración juramentada | Adjunte su declaración juramentada notariada. | No |
| 5 | `MECANIZADO_IESS` | Mecanizado del IESS | Adjunte el mecanizado del IESS correspondiente a su historia laboral. | No |
| 6 | `CERTIFICADO_MEDICO` | Certificado médico | Adjunte su certificado médico e indique su fecha de vencimiento. | Sí |

Estas marcas son una propuesta de configuración funcional, no una interpretación normativa. El admin puede ajustarlas. Crear el catálogo no crea requisitos ni exige su carga a las personas.

Para la parte 2 se propone la **opción B en la interfaz**: retirar el check «Aplica rol docente» y la columna de clasificación docente. Conservar el atributo persistido y la API por compatibilidad y para la semilla solicitada en el issue; editar o desactivar un tipo existente debe preservar su valor. Crear un tipo desde la pantalla usa el valor por defecto `false`. No se añade ninguna regla basada en `EsDocente`.

## Requisitos verificables

| ID | Condición y comportamiento observable | Fuente |
|---|---|---|
| RF-TIP-001 | Al crear una institución mediante el flujo existente, quedan guardados sus dos tipos de funcionario y seis tipos de documento base, con los valores aprobados. Si el alta falla, no queda una institución parcialmente inicializada. | Issue #80, parte 1 |
| RF-TIP-002 | Repetir la semilla no duplica códigos dentro de una institución. Solo agrega los faltantes; no sobrescribe nombres, instrucciones, vencimientos, órdenes, clasificación docente ni estados existentes, incluidos los inactivos. | Issue #80, parte 1 |
| RF-TIP-003 | Instituciones existentes reciben solo los tipos faltantes. Los catálogos de dos instituciones son independientes y el admin conserva la edición y desactivación actuales. | Issue #80; ADR-0004 |
| RF-TIP-004 | Al abrir o reiniciar el formulario para un documento nuevo, se propone `máximo(0, órdenes de todos los documentos cargados) + 1`, incluidos los inactivos. Con lista vacía propone 1; tras crear se recalcula con la lista actualizada. El admin puede modificar la sugerencia y editar mantiene el orden guardado. | Issue #80, «Aprovechar para corregir» |
| RF-TIP-005 | La pantalla deja de mostrar el check y la columna docente. Editar o desactivar un tipo no cambia su atributo `EsDocente`. No cambian permisos, requisitos, exportación ni secciones. | Issue #80, parte 2; propuesta B para aprobación |
| RF-TIP-006 | La lista base y el tratamiento del atributo docente quedan documentados en ADR antes de las tareas dependientes, sin cerrar ADR propuestos por iniciativa del agente. | Issue #80, ambas partes; AGENTS.md |

## Escenarios del proceso

### Escenario 1 — Institución nueva

- **Actor y precondición:** superadmin autorizado; institución aún inexistente.
- **Disparador:** alta institucional mediante el flujo actual.
- **Secuencia:** se crea la institución; su admin abre la configuración y ve los dos tipos de funcionario y los seis documentos.
- **Resultado:** valores iniciales de la lista aprobada; ningún requisito creado automáticamente.
- **Error:** si el alta falla, no se conserva una institución con semilla parcial.

### Escenario 2 — Repetición y personalización

- **Actor y precondición:** admin de una institución inicializada; otra institución independiente.
- **Secuencia:** cambia una instrucción, desactiva un tipo y se vuelve a ejecutar la semilla; en una institución existente con catálogo parcial se agregan los faltantes.
- **Resultado:** no hay duplicados, no se revierte ninguna personalización ni se reactiva un tipo; la otra institución no cambia.

### Escenario 3 — Altas consecutivas y edición

- **Actor y precondición:** admin; documentos con órdenes 1, 4 y 7, incluido uno inactivo.
- **Secuencia:** abre el formulario y recibe 8; crea el documento y recibe 9 para el siguiente. Edita el documento de orden 4 y conserva 4. Con catálogo vacío recibe 1.
- **Resultado:** se evita volver a proponer 1 después de cada creación; no se renumeran datos existentes ni se obliga a usar la sugerencia.

### Escenario 4 — Tipos de funcionario

- **Actor y precondición:** admin; tipo `DOCENTE` con atributo interno verdadero.
- **Secuencia:** abre la configuración, edita el nombre y desactiva el tipo.
- **Resultado:** no aparecen el check ni la columna docente; el atributo conserva `true` y no adquiere efectos de negocio.

## Datos, seguridad e integraciones

Solo se crean datos de configuración institucional, sin datos personales ni servicios externos. Se conservan permisos, aislamiento y auditoría del flujo actual. Las pruebas usarán instituciones y personas ficticias. La API conserva sus contratos; si la aprobación exige cambiarlos, se regenerarán OpenAPI y el cliente en el mismo cambio.

## Criterios de aceptación

- [x] RF-TIP-001: una institución nueva contiene los tipos aprobados, con instrucciones y vencimientos correctos.
- [x] RF-TIP-002 y 003: doble ejecución, catálogo parcial, personalización, desactivación y aislamiento verificados.
- [x] RF-TIP-004: orden sugerido verificado al cargar, crear, reiniciar y editar, con lista vacía y tipos inactivos.
- [x] RF-TIP-005: pantalla sin el control ni columna docente; ediciones preservan el dato interno.
- [x] RF-TIP-006: decisiones en ADR; issue conserva etiqueta `decision`.
- [ ] Compilación y pruebas de backend y frontend ejecutadas; salida real registrada; checks del HEAD final correctos y PR sin conflictos antes de integrar y cerrar #80.

## Puntos que requieren decisión

| ID | Decisión pendiente | Impacto | Quién decide |
|---|---|---|---|
| PD-TIP-01 | Aprobar o ajustar la lista exacta, instrucciones, vencimientos y ausencia de requisitos automáticos de esta propuesta. | Define la semilla y su ADR. | Responsable funcional |
| PD-TIP-02 | Aprobar la opción B en la interfaz conservando el atributo y la API, o solicitar una alternativa. | Define la pantalla y su ADR; la opción A requeriría concretar la regla de negocio. | Responsable funcional |

## Revisión funcional de v0.1

**Versión revisada:** 0.1

**Decisión:** Aprobado; PD-TIP-01 y PD-TIP-02 resueltos con la propuesta de esta versión

**Aprobó:** Responsable solicitante del issue #80 en esta conversación

**Fecha y evidencia de aprobación:** 2026-10-26; respuesta «continua con lo que propones» tras presentar la versión 0.1 y sus decisiones

**Ajustes solicitados:** Ninguno

La aprobación explícita registrada habilita `plan.md`, `tasks.md`, `test-e2e.md` y la implementación. Los ADR-0019 y ADR-0020 registran las decisiones correspondientes sin cerrar ADR propuestos anteriores.

## Ampliación v0.2 — Catálogos completos en producción

### Problema confirmado y resultado esperado

El cargador de CSV existente se ejecuta solo en Development. La imagen del backend no contiene `data/catalogos/` y la etapa de migración termina antes de la carga de desarrollo. Una instalación de producción conserva únicamente las semillas cortas de las migraciones. Faltan opciones de ficha personal, formación académica y estudios en curso. `Banco` tampoco tiene un CSV versionado.

La v0.2 debe permitir desplegar desde una base vacía con todos los catálogos necesarios, sin importaciones manuales por API, sin descargas durante el arranque y sin declarar lista una aplicación que tenga catálogos obligatorios vacíos. También debe conservar las instituciones y los datos existentes al repetir el proceso.

### Fuentes adicionales y su estado

| Fuente | Enlace o ruta | Hecho o restricción |
|---|---|---|
| Ampliación funcional de #80 | [Catálogos en producción](https://github.com/IstpetDev/actualizacion_datos/issues/80#issuecomment-6426093825) | Carga idempotente, bancos, comprobación de catálogos obligatorios y ficha personal en un entorno limpio. |
| Aporte sobre formación | [Instrucción formal](https://github.com/IstpetDev/actualizacion_datos/issues/80#issuecomment-6426145365) | Cargar niveles, grados, universidades, campos UNESCO y becas; probar un título completo de tercer nivel. |
| Aporte sobre IES | [Universidades e institutos](https://github.com/IstpetDev/actualizacion_datos/issues/80#issuecomment-6426168385) | Conservar las 64 universidades, agregar institutos con fuente oficial, decidir catálogo compartido y mantener alternativa para otras instituciones. |
| Datos disponibles | `data/catalogos/README.md` y `data/catalogos/fuentes.json` | Quince CSV trazables ya versionados; 2106 elementos totales después de las importaciones actuales, incluidos los 29 de migraciones. No contienen datos de personas. |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioCatalogos.cs` | Importación por código, ids estables, transacción por archivo, protección de semillas y conservación de inactivos y filas ausentes. |
| Comportamiento existente | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/CargaCatalogosDesarrollo.cs` | La opción de carga automática se ignora en Production. |
| ADR vigente | ADR-0013, Vigente, `docs/decisiones/ADR-0013-datos-bancarios.md`, decisión 2 | Banco es catálogo compartido con fuente Superintendencia de Bancos; admite nombre escrito si no está en el catálogo. No se cambia el tratamiento del número de cuenta. |
| Fuente primaria consultada el 2026-10-26 | [Catastro público de la Superintendencia de Bancos](https://www.superbancos.gob.ec/bancos/catastro-publico/) | Publica tres grupos de entidades: bancos privados nacionales, privados extranjeros y públicos. No se consultan representantes, clientes ni cuentas. |
| Fuentes primarias consultadas el 2026-10-26 | CES: [institutos públicos](https://www.ces.gob.ec/?page_id=1543) y [particulares](https://www.ces.gob.ec/?page_id=5058) | Listados con código y denominación de la IES; permiten preparar el CSV adicional sin inventar códigos institucionales. |
| Autorización de ampliar | Esta conversación, 2026-10-26 | «prepara spect ampliada pero cumple con todo lo que pedia el issue y cierra el pr y el issue cuando ya este todo listo». Autoriza preparar v0.2; su versión concreta queda pendiente de revisión funcional. |

Las causas se confirman en el código y los archivos versionados. No se ha accedido a producción ni se afirma haber inspeccionado sus datos. Los catálogos oficiales describen organizaciones y clasificaciones públicas; las personas de prueba siguen siendo ficticias.

### Alcance adicional

**Incluye:** empaquetado de los CSV en la distribución e imagen del backend; carga explícita posterior a las migraciones como parte del despliegue; comprobación de arranque; bancos e institutos superiores; manifiesto con trazabilidad y hashes; pruebas sobre instalación limpia y repetición.

**Conserva íntegramente:** RF-TIP-001 a 006, lista de tipos base, instrucciones, vencimientos, retirada del control docente y corrección del orden de v0.1.

**Excluye:** datos personales de producción, credenciales reales, acceso o despliegue al servidor real, reglas de GitHub, cambios de permisos, sincronización en línea con fuentes oficiales, equivalencias con talento humano, una lista mundial de universidades y el manejo uniforme de errores, que pertenece a #89. No se crean nuevos tipos de catálogo ni nuevas reglas de completitud de la hoja de vida.

### Propuestas funcionales concretas para aprobar

1. **Distribución y despliegue.** Los CSV versionados son la fuente de la carga. Se incluyen en la distribución e imagen del backend sin duplicar su mantenimiento. El despliegue ejecuta una operación explícita `--cargar-catalogos` después de las migraciones y antes de iniciar la aplicación; un fallo detiene el despliegue con salida distinta de cero. El comando no requiere iniciar sesión ni exponer un endpoint nuevo. El diseño del empaquetado y de la etapa se fija en un ADR antes de implementarlo.
2. **Orden y repetición.** Se reutiliza el importador existente. País precede a provincia y a todas las IES; provincia a cantón y este a parroquia; nivel a grado; campo amplio a específico y este a detallado. Repetir la misma versión no crea duplicados ni cambia ids; tampoco reactiva inactivos ni elimina entradas ausentes. Se conserva la transacción por CSV: si falla un archivo posterior, el despliegue falla y la repetición puede completar la carga; no se exige revertir los archivos anteriores del lote.
3. **Bancos.** Crear `Banco.csv` con las denominaciones de los tres grupos publicados en el catastro de la Superintendencia. Usar códigos técnicos estables claramente identificados como propios de este catálogo; `codigo_externo` solo recibe un identificador si la fuente lo publica de forma verificable. No inventar RUC ni equivalencias. La cuenta bancaria conserva el ingreso de otro banco por nombre, incluido uno que no figure en la instantánea. No se amplía este trabajo al catastro de cooperativas de la SEPS.
4. **Institutos e IES extranjeras.** Crear `InstitutosSuperiores.csv` a partir de los listados públicos y particulares del CES, con el mismo formato CSV. Importarlo dentro del tipo existente `Universidad`, conservando las 64 entradas de `Universidad.csv`, sin colisiones ni renumeración. Usar el código oficial de IES, padre país `218` y `codigo_externo` oficial. El catálogo puede incluir institutos, conservatorios y demás IES de esos listados; no se interpreta como certificación de vigencia de sus programas o de títulos. Mantener «Otra institución» para universidades extranjeras y organizaciones no incluidas, sin inventar una lista de instituciones frecuentes.
5. **Trazabilidad.** Registrar fuente, fecha de extracción, transformación, cantidad de filas y SHA-256 del recurso consultado y de cada CSV nuevo en `fuentes.json` y en el README. Resolver duplicados solo por código oficial y documentar cualquier diferencia; no por parecido del nombre. No se publican los HTML o documentos fuente completos ni datos de personas.
6. **Comprobación de disponibilidad.** Al terminar la carga y al arrancar en Production, comprobar que los 21 tipos actuales de catálogo tienen al menos un elemento activo. Comprobar también que existe Ecuador `218` y que hay opciones activas relacionadas para sus provincias, cantones, parroquias e IES, y para nivel/grado y campos UNESCO. Ante ausencia o fallo de consulta, registrar el problema sin información sensible y rechazar el arranque antes de servir tráfico. La señalización requerida es esta comprobación de arranque; no se propone modificar la respuesta normal de `/health` ni añadir consultas periódicas. El comando de migración por sí solo sigue pudiendo ejecutarse antes de cargar los datos.
7. **Instalación limpia verificable.** Probar la imagen o distribución de producción, no solo el cargador de desarrollo. Desde PostgreSQL efímero vacío, migrar, cargar los CSV, arrancar y autenticar personas ficticias. Verificar consultas reales de catálogo y los formularios Angular contra esa API; guardar un título completo de tercer nivel con IES del catálogo y otro con «Otra institución». Las capturas con respuestas simuladas de v0.1 no sustituyen estos recorridos.

### Catálogos que deben quedar disponibles

| Área | Tipos existentes cubiertos |
|---|---|
| Ficha personal | `EstadoCivil`, `Sexo`, `TipoSangre`, `Etnia`, `NacionalidadIndigena`, `Discapacidad`, `Pais`, `Provincia`, `Canton`, `Parroquia` |
| Formación académica | `NivelAcademico`, `GradoAcademico`, `CampoAmplioUnesco`, `CampoEspecificoUnesco`, `CampoDetalladoUnesco`, `Universidad` (también institutos) |
| Estudios en curso y capacitación | `TipoBeca`, `FinanciamientoBeca`, `TipoCapacitacion` |
| Cuenta bancaria | `TipoCuentaBancaria`, `Banco` |

Las cinco listas cortas que no requieren CSV (`EstadoCivil`, `TipoSangre`, `TipoCapacitacion`, `Sexo`, `TipoCuentaBancaria`) siguen procediendo de migraciones. `NivelAcademico` y `GradoAcademico` mantienen sus semillas y reciben también sus CSV completos. Se cargan los quince archivos actuales más `Banco.csv` e `InstitutosSuperiores.csv`, en total diecisiete archivos y dieciséis tipos importados; `Universidad` recibe dos archivos.

### Requisitos adicionales verificables

| ID | Condición y resultado observable | Fuente |
|---|---|---|
| RF-CAT-001 | La distribución y la imagen de producción contienen los diecisiete CSV y su manifiesto, con los hashes documentados; el arranque y la carga no descargan datos externos. | Comentario de catálogos, punto 1 |
| RF-CAT-002 | Con una base vacía, el despliegue migra y ejecuta la carga explícita antes de servir la aplicación. El comando acaba con código 0 y resumen por catálogo cuando tiene éxito; un archivo ausente o inválido da código distinto de cero y evita avanzar. | Comentario de catálogos, punto 1 |
| RF-CAT-003 | Dos cargas consecutivas de los mismos archivos dejan los mismos ids y códigos, sin duplicados, reactivaciones ni eliminaciones implícitas. Un fallo no deja filas parciales del archivo que falló; una repetición puede completar el lote. | Comentario de catálogos; importador existente |
| RF-CAT-004 | El catálogo `Banco` contiene las entidades de la instantánea oficial de los tres grupos de la Superintendencia, con trazabilidad completa. La opción de banco escrito sigue funcionando. | Comentario de catálogos, punto 2; ADR-0013 |
| RF-CAT-005 | `Universidad` conserva las 64 universidades y agrega las IES de los listados CES elegidos, con códigos oficiales únicos y padre Ecuador. Se conserva «Otra institución» y no se introducen equivalencias con talento humano. | Comentario de universidades, propuestas 1 a 4 |
| RF-CAT-006 | En Production, la aplicación no inicia si falta un tipo con elementos activos o una de las relaciones necesarias para los formularios; el registro identifica tipos o relaciones faltantes sin datos de personas ni secretos. Migrar sin cargar sigue siendo posible. | Comentario de catálogos, punto 4; dependencia País → IES |
| RF-CAT-007 | En instalación limpia, el formulario ofrece país y etnia; al elegir una provincia, un cantón y una parroquia, las opciones pertenecen al padre seleccionado. | Comentario de catálogos, punto 5 |
| RF-CAT-008 | En instalación limpia, formación ofrece los niveles superiores, sus grados, universidades e institutos y los tres campos UNESCO. Se guarda y recupera un título de tercer nivel con IES del catálogo y otro con institución escrita. | Comentarios de formación y universidades |
| RF-CAT-009 | En instalación limpia, estudios en curso ofrece tipos de beca y financiamiento; capacitación conserva sus opciones; cuenta bancaria ofrece bancos y tipos de cuenta. | Comentarios de catálogos y formación |
| RF-CAT-010 | Los nuevos CSV y el empaquetado tienen fuentes, hashes, límites de cobertura y decisiones registrados. Las decisiones de arquitectura se registran en ADR antes de ejecutar tareas dependientes. | Regla del repo; comentarios de #80 |

### Escenarios adicionales

**Escenario 5 — Primer despliegue de producción.** Con una base PostgreSQL vacía y una imagen nueva, ejecutar migraciones y carga de catálogos, iniciar Production y comprobar `/health`. Todos los tipos y sus relaciones están disponibles por los endpoints autenticados. No se usan montajes locales de desarrollo ni importaciones manuales por API. Si la carga falla, el proceso de despliegue no inicia la aplicación nueva.

**Escenario 6 — Reinicio y recuperación.** Repetir la carga dos veces y reiniciar; conservar ids, filas preexistentes y estados inactivos. Probar archivo faltante, CSV inválido y dependencia de padre no satisfecha: salida de error, archivo fallido sin filas parciales y recuperación por repetición. Probar base con un catálogo obligatorio vacío: Production rechaza el arranque e identifica el faltante.

**Escenario 7 — Ficha personal con catálogos reales.** Sobre la instalación limpia, una persona ficticia entra durante una campaña abierta. Los selects muestran países y etnias; seleccionar Ecuador y recorrer provincia → cantón → parroquia devuelve únicamente opciones relacionadas. Se guardan y se recuperan esos identificadores. Solo la persona es ficticia; los valores de catálogo proceden de los CSV públicos.

**Escenario 8 — Formación completa e instituciones.** En la misma instalación, seleccionar nivel de tercer nivel y grado compatible, una IES de las 64 originales y los campos UNESCO dependientes; completar el título con texto y respaldo ficticios y guardar. Repetir con un instituto del CES y con «Otra institución» extranjera escrita, conservando el nombre tras recargar. Comprobar también beca/financiamiento en estudios en curso y opciones de capacitación. El error genérico de guardado se corrige en #89, no en esta spec.

**Escenario 9 — Banco del catálogo y banco escrito.** Consultar el catálogo cargado y seleccionar un banco. Guardar y recuperar una cuenta exclusivamente ficticia respetando su enmascaramiento. Repetir con un nombre de banco ficticio escrito para comprobar la alternativa prevista por ADR-0013. No se usan números de cuenta reales ni claves de cifrado de producción.

### Criterios de aceptación de v0.2

- [x] Se mantienen todos los criterios RF-TIP-001 a 006 de v0.1 y sus pruebas.
- [x] RF-CAT-001 y 002: artefacto de producción con datos, migración y carga en entorno limpio, sin descargas al arrancar.
- [x] RF-CAT-003: doble ejecución, ids estables, inactivos conservados, errores y recuperación verificados en PostgreSQL.
- [x] RF-CAT-004 y 005: bancos e institutos con fuente oficial y hashes; 64 universidades conservadas y alternativas de texto verificadas.
- [x] RF-CAT-006: arranque Production rechazado ante catálogo o relación obligatoria ausente; error operativo identificable sin información sensible.
- [x] RF-CAT-007 a 009: formularios contra API y PostgreSQL reales en entorno limpio; ficha, tercer nivel, IES, instituto, otra institución, becas y bancos comprobados.
- [x] RF-CAT-010: decisiones en ADR y trazabilidad completa; sin datos personales reales, secretos ni cambios de reglas de GitHub.
- [x] Compilaciones, pruebas, formato, lint, imagen Docker y validación de workflows afectados aprobados; OpenAPI y cliente regenerados si cambia algún contrato.
- [ ] PR #91 actualizado al alcance final, sin conflictos y con los checks aplicables correctos sobre su HEAD final. Intentar aprobación, integrar a `develop` y verificar PR integrado e issue #80 cerrado por completado, sin comentarios adicionales.

### Decisiones pendientes de aprobación de v0.2

| ID | Propuesta que debe validarse | Impacto |
|---|---|---|
| PD-CAT-01 | CSV incluidos en la distribución, carga explícita posterior a migraciones y comprobación estricta de arranque Production. | Necesita ADR operativo antes de cambiar empaquetado y despliegue. |
| PD-CAT-02 | Bancos de los tres grupos del catastro SB; códigos técnicos propios si no hay código oficial y alternativa de texto conservada. | Fija cobertura y evita inventar equivalencias. |
| PD-CAT-03 | Institutos de los listados CES público/particular dentro de `Universidad`, sin enum nuevo; extranjero por «Otra institución». | Necesita ADR que documente el alcance del catálogo existente. |
| PD-CAT-04 | Transacción por CSV y recuperación por repetición del lote; fallo de despliegue y de arranque ante incompletitud. | Evita prometer atomicidad global que el importador actual no ofrece. |

### Revisión funcional de v0.2

**Versión revisada:** 0.2.

**Decisión:** Aprobada; PD-CAT-01 a PD-CAT-04 resueltos con las propuestas de esta versión.

**Aprobó:** Responsable solicitante en esta conversación.

**Fecha y evidencia:** 2026-10-26; respuesta explícita «Aprobar la spec v0.2 e implementar todo su alcance» a la revisión funcional de esta versión.

**Ajustes solicitados:** Ninguno.

La aprobación habilita actualizar `plan.md`, `tasks.md` y `test-e2e.md`, registrar los ADR e implementar la ampliación. El PR #91 permanece en borrador y #80 abierto hasta completar todo el alcance aprobado.
