# ADR-0028 — Almacenamiento de las secciones habilitadas por institución

- **Estado:** Vigente
- **Fecha:** 2026-10-27

## Contexto

La spec-0010 (aprobada, v0.2) pide un interruptor abierta/cerrada para cada una de las siete secciones de la hoja de vida, **por institución**, que el `admin` cambia (el `superadmin` puede por la API). Hechos relevantes:

- Las secciones son fijas y viven en el código: ficha, formación académica, referencias, experiencia laboral, capacitaciones, documentos personales y cuenta bancaria. Hoy no existe el concepto de sección abierta o cerrada.
- Las escrituras de cada sección pasan por servicios distintos (`ServicioHojaDeVida`, `ServicioDocumentosPersonales`, `ServicioCuentaBancaria`, archivos) y ya comparten una protección en el dominio (`Persona.AsegurarEdicionPermitida`).
- La completitud del envío son reglas independientes (`IReglaCompletitudEnvio`).
- El interruptor no puede cambiar el comportamiento de las instituciones existentes al desplegar (RF-SEC-013): quedan con todo abierto.
- La ficha personal nunca se cierra (RF-SEC-009).
- ADR-0009 (campos configurables) sigue Propuesto y no se cierra aquí. ADR-0004 exige aislamiento por institución.

Este ADR decide **solo dónde y cómo se guarda el estado** y quién lo consulta en el backend. Las reglas funcionales están en la spec-0010.

## Opciones

1. **Tabla `secciones_institucion` (una fila por institución y sección).** Una fila solo existe cuando el `admin` cambió algo; la **ausencia de fila significa abierta**.
   - Ventajas: no exige migrar datos para que las instituciones existentes sigan igual; guarda quién y cuándo cambió; se consulta con un solo filtro por institución; agregar una sección futura no cambia el esquema.
   - Desventajas: una tabla nueva y una consulta más en cada escritura (se acota con una sola lectura por solicitud).

2. **Columnas booleanas en `instituciones` (una por sección).**
   - Ventajas: un solo lugar y sin tabla nueva.
   - Desventajas: cada sección nueva exige migración; no guarda quién y cuándo; mezcla configuración con datos de la institución.

3. **Un campo JSON de configuración en `instituciones`.**
   - Ventajas: flexible, sin tabla nueva.
   - Desventajas: sin integridad ni consultas simples; difícil de auditar y de probar; invita a convertirlo en la configuración genérica de ADR-0009 sin haberlo decidido.

4. **Ligarlo a la campaña.** Descartada por el solicitante: el interruptor es por institución, no por campaña.

## Decisión

Se adopta la **opción 1**, por indicación expresa de quien desarrolla (2026-10-27, conversación del issue #92). Es la única que conserva el comportamiento actual sin migrar datos, deja rastro de quién abrió o cerró y no ata el esquema a la lista de secciones.

El diseño parte de estas pautas, a precisar en el plan:

- Una enumeración `SeccionHojaDeVida` en el dominio con las siete secciones y una entidad `SeccionInstitucion : EntidadInstitucional` (institución, sección, `Habilitada`, fecha y actor del último cambio).
- Un servicio de aplicación `IServicioSecciones` que responde «¿está abierta la sección S para la institución I?» con una lectura por solicitud. Lo consultan los servicios de escritura, la completitud del envío y la lectura de la hoja de vida.
- La ficha se trata como siempre abierta en el dominio, aunque exista una fila.
- Cada cambio se registra en la auditoría sin contenido personal.

Las tareas T-01 a T-06 y T-08 de la spec-0010, antes bloqueadas por este ADR, quedan liberadas.

## Consecuencias

- Una migración con una tabla nueva y sin datos; el despliegue no cambia el comportamiento actual; el costo es una consulta por solicitud de escritura, que se mantiene en una sola lectura.
- **Riesgo:** olvidar consultar el interruptor en una ruta de escritura nueva dejaría la sección cerrada escribible por la API. Se mitiga con pruebas que recorren todas las rutas de escritura de las secciones y con una sola puerta de entrada (`IServicioSecciones`).
- **Descartadas:** la 2 acopla el esquema a las secciones y la 3 difumina la frontera con ADR-0009.

## ADR relacionados

- ADR-0004 — Multitenencia con esquema único.
- ADR-0009 — Campos configurables por institución (Propuesto; no se cierra).
- ADR-0010 — Hoja de vida estructurada y catálogos.
- ADR-0029 — Capacitaciones obligatorias (su exigencia depende de este interruptor).
