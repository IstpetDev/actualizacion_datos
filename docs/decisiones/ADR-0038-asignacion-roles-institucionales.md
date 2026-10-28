# ADR-0038 — Asignación de roles institucionales

- **Estado:** Vigente por petición explícita del solicitante de implementar los criterios de #129 (2026-10-28).
- **Fecha:** 2026-10-28

## Contexto

#129 requiere asignar Admin y Supervisor a personas nuevas o existentes, con
alcances diferentes para superadmin y admin. La asignación antigua habilitaba
cuentas existentes sin actualizar su rol.

## Opciones

1. Duplicar cuentas o introducir roles múltiples: contradice la identidad única por documento e institución y amplía el alcance.
2. Mantener un rol por persona y compartir la asignación en el servicio institucional, con autorización y auditoría.

## Decisión

Se mantiene el modelo existente de un rol y se comparte la asignación en
`ServicioInstituciones`, utilizada por endpoints globales, institucionales y el
endpoint previo de administradores. Los globales requieren Superadmin; los
institucionales requieren Admin y obtienen el tenant de la sesión. El servicio
comprueba también el alcance antes de consultar o escribir.

Superadmin asigna Admin o Supervisor; Admin asigna Supervisor a Usuario o
Supervisor de su tenant. Superadmin nunca es un destino modificable. Se conserva
la identidad y el expediente; se habilita el acceso sin cambiar credenciales,
correo verificado ni estado de actualización. Solo las cuentas nuevas reciben
nombre/correo opcionales del formulario.

Cada escritura guarda la persona y su auditoría con el mismo `SaveChangesAsync`;
las lecturas también se auditan. La unicidad existente evita duplicados incluso
ante concurrencia (409). La sesión ya renueva roles desde la base en cada petición.
No se añaden tablas, migraciones ni mecanismos de autenticación.

## Consecuencias

No se puede convertir estas operaciones en una vía para asignar Superadmin ni
para que un admin degrade a otro admin. Las pantallas comparten un formulario,
pero los permisos dependen del servidor. Se prueban cookies reales, cabeceras
contradictorias y persistencia/auditoría en PostgreSQL.

## ADR relacionados

ADR-0004 (aislamiento), ADR-0007 (sesión), ADR-0023 (acceso de personas), ADR-0026
(errores uniformes).
