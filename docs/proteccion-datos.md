# Publicación de avisos de protección de datos

El acceso de los roles institucionales (`Usuario`, `Supervisor`, `Admin`) requiere un aviso vigente aplicable a la institución y rol de la cuenta. Sin aviso, esas cuentas pueden resolver el cambio obligatorio de contraseña y cerrar sesión, pero no consultar ni modificar datos de negocio. El rol global `Superadmin` está exento del aviso institucional para poder aprovisionar y administrar instituciones desde el arranque de la plataforma ([ADR-0034](decisiones/ADR-0034-exencion-superadmin-aviso-proteccion-datos.md)). La aceptación se registra individualmente; publicar nunca acepta por una persona.

## Autorización y primera carga

La institución entrega el contenido íntegro del aviso, su declaración de aceptación, finalidades, base jurídica, responsable, canal de derechos, vigencia, destinatarios y referencia verificable de su autorización. La publicación de la ley no sustituye ese aviso. El equipo técnico no completa esos datos jurídicos ni importa aceptaciones de otro sistema.

El operador autorizado prepara un JSON fuera del repositorio. Este ejemplo es una **plantilla ficticia no publicable**: la confirmación permanece en `false` y el comando la rechaza. El operador reemplaza todos los campos por el contenido autorizado y confirma su aprobación solo después de comprobarla.

```json
{
  "institucionId": "00000000-0000-0000-0000-000000000001",
  "version": "version-ficticia-no-publicable",
  "titulo": "Aviso ficticio: sustituir por el título autorizado",
  "responsable": "Institución Ficticia: sustituir por el responsable autorizado",
  "contenido": "PLANTILLA FICTICIA. Sustituir por el contenido íntegro autorizado por la institución.",
  "declaracionAceptacion": "Sustituir por la declaración explícita autorizada",
  "fuenteOficial": "https://institucion.ejemplo.test/aviso-autorizado",
  "evidenciaAprobacion": "Sustituir por la referencia de autorización institucional",
  "rolesDestinatarios": ["Usuario", "Supervisor", "Admin"],
  "vigenteDesdeUtc": "2026-10-27T00:00:00Z",
  "vigenteHastaUtc": null,
  "aprobacionInstitucionalConfirmada": false
}
```

Con la configuración del entorno ya provisionada por el procedimiento de despliegue, ejecutar el binario publicado:

```bash
dotnet Istpet.ActualizacionDatos.WebApi.dll --publicar-aviso /ruta/aviso-autorizado.json
```

No agregar configuración real ni cadenas de conexión al comando, a la documentación o al repositorio. El comando usa la configuración existente de la aplicación, aplica las migraciones y publica de forma transaccional. La institución debe existir. El contenido se almacena en esta base PostgreSQL; no se descarga de la fuente oficial durante cada login ni se conecta a SIGAFI.

Antes de habilitar el uso, comprobar que todas las instituciones y roles en servicio tengan aviso autorizado. La publicación inicial se hace fuera de la API para evitar una excepción de acceso de administradores sin aceptación. No existe un aviso real ni ficticio sembrado por la migración.

## Nueva versión

Usar un identificador de versión nuevo para la misma institución. No cambiar el contenido de una versión publicada. El inicio debe ser posterior al de la versión sustituida; no se admiten fechas sin zona UTC, vigencia invertida, una versión repetida o una publicación ya vencida.

Los roles son los del producto. Se admiten grupos disjuntos de destinatarios; una sustitución debe cubrir el grupo completo que solapa. Si hace falta reorganizar grupos, preparar una publicación coherente de todas sus categorías mediante un cambio revisado; no alterar tablas manualmente. La aplicación bloquea si encuentra más de un aviso aplicable.

La publicación cierra la vigencia anterior en el inicio de la nueva y conserva su texto y las aceptaciones. Las personas pendientes reciben el nuevo aviso en su siguiente operación protegida, incluso con una sesión abierta. Las escrituras se coordinan mediante un bloqueo de la institución en PostgreSQL; un reintento de aceptación conserva la fecha original y no duplica evidencia.

Una versión nueva durante la edición obliga a volver al aviso y descarta cambios locales no guardados; el servidor no los guarda automáticamente. El expediente persistido, su estado y archivos permanecen conservados.

## Comprobación

Con una cuenta ficticia del ambiente de prueba, autenticar, cambiar la contraseña si corresponde, consultar `GET /api/proteccion-datos/aviso` y confirmar que título, versión, contenido, declaración y vigencia coinciden con lo autorizado. El contenido se presenta como texto, sin ejecutar HTML. La fuente oficial es una referencia adicional; lo aceptado es el contenido versionado conservado en la aplicación.

`POST /api/mis-datos/aceptar-tratamiento` recibe exclusivamente `avisoId` y `acepta: true`. No recibe una identidad para aceptar por terceros. Una petición sin versión, con confirmación falsa, documento arbitrario o aviso ajeno no registra aceptación. Repetir la misma aceptación devuelve su fecha inicial.

Probar consulta/guardado/subida/descarga/envío mediante API antes y después de aceptar. Sin aceptación vigente, el código es `ACEPTACION_PROTECCION_DATOS_PENDIENTE`; sin aviso aplicable, su lectura devuelve `AVISO_PROTECCION_DATOS_NO_DISPONIBLE`. Fallos de lectura o persistencia mantienen el acceso restringido. Rechazar cierra sesión; no genera evidencia. Ver [spec-0011](specs/spec-0011/spec.md), [ADR-0030](decisiones/ADR-0030-avisos-versionados-y-aceptacion-de-acceso.md), [ADR-0034](decisiones/ADR-0034-exencion-superadmin-aviso-proteccion-datos.md) y su matriz de pruebas.

La institución conserva la responsabilidad de autorizar el contenido específico y definir sus reglas de conservación y retiro. No se acredita esa autorización con el estado del código o con una prueba ficticia.
