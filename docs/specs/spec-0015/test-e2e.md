# Verificación — Issue #125

Ambiente: pruebas Angular con Vitest y Testcontainers PostgreSQL 17 con migraciones reales. Solo datos ficticios: documento `0000000000`, nombres «Persona Ficticia», correo `persona@ejemplo.test`.

1. Cargar ficha con parroquia; comprobar provincia, cantón, parroquia y listas. Guardar, recrear vista y guardar otra vez: la parroquia no cambia (RF-PER-001).
2. Cambiar provincia/cantón mientras llega una carga previa y descartar cambios: no se reinstalan padres antiguos (RF-PER-001).
3. Elegir discapacidad, porcentaje y carné; guardar y recargar. Quitar discapacidad y comprobar limpieza de dependientes (RF-PER-002).
4. Guardar los cuatro nombres y todos los campos; leer ficha y persona desde contextos nuevos y comprobar normalización y persistencia. Repetir el guardado y comprobar una sola ficha (RF-PER-003, 005).
5. Guardar con nombres máximos válidos, rechazar un catálogo o porcentaje inválido y comprobar que ambas tablas conservan lo anterior; otra institución no ve ni modifica esos datos (RF-PER-003, 005).
6. Guardar con éxito y provocar un error: aviso accesible, sin éxito antiguo, conservando cambios pendientes (RF-PER-004).

Resultados reales: `../../evidencia/issue-125/README.md`. Las pruebas de componente y de servicio no sustituyen una validación manual en producción (#130).
