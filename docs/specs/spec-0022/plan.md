# Marco y régimen — Plan de implementación

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md).

**Versión del plan:** 0.1 — 2026-11-10. **Estado:** diseño documental preparado; ejecución futura condicionada a los ADR y datos institucionales indicados.

**Áreas y tecnologías:** .NET 10 / Clean Architecture, EF Core y PostgreSQL, xUnit, Angular 22/pnpm y cliente NSwag existentes. No se seleccionan dependencias nuevas.

## Correspondencia con el spec

Se traza cada requisito/escenario; parcial o diferido significa que su componente B no forma parte de Entrega 1. No se presenta un caso planificado como prueba ejecutada.

| Requisito | Escenarios y pruebas | Solución / disposición | Tarea | Archivo principal |
|---|---|---|---|---|
| RF-VAC-MAR-001 | ESC-VAC-MAR-02 → E2E-MAR-02 | Modo A: consulta/prepara/descarga un acta o su evidencia, el sistema limita persona, vínculo, período y documento a ese ámbito y facultad, también ante identificadores ajenos | T-MAR-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |
| RF-VAC-MAR-002 | ESC-VAC-MAR-01 → E2E-MAR-01 | Modo A: se solicita cálculo automático, el sistema lo bloquea con lista de datos pendientes, sin valores de respaldo implícitos | T-MAR-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |
| RF-VAC-MAR-003 | ESC-VAC-MAR-03 → E2E-MAR-03 | La parametrización de fórmulas de cálculo y cambios retroactivos de saldo se difiere; sí se conserva la revisión de fuente/plantilla usada por el acta. | T-MAR-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |
| RF-VAC-MAR-004 | ESC-VAC-MAR-04 → E2E-MAR-04 | Modo A: se emite, descarga o recibe un adjunto, el sistema conserva firma pendiente hasta que un verificador autorizado registra revisión física conforme a spec-0025 | T-MAR-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |
| RF-VAC-MAR-005 | ESC-VAC-MAR-04 → E2E-MAR-04 | Modo A: se intenta registrarla como vacaciones, el sistema rechaza esa operación en Entrega 1 | T-MAR-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |
| RF-VAC-MAR-006 | ESC-VAC-MAR-01 → E2E-MAR-01 | Modo A: se consulta saldo o acta, el sistema usa el modo explícito de spec-0024 y no convierte ausencia de datos en saldo cero ni en derecho acumulado | T-MAR-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |
| RF-VAC-MAR-007 | ESC-VAC-MAR-02 → E2E-MAR-02 | Modo A: intenta emitir, certificar o verificar, el sistema deniega la operación aunque su rol técnico sea admin o supervisor | T-MAR-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` |

## Diseño y contratos

Propuesta condicionada a T-MAR-00: `GET /api/vacaciones/marco` devuelve modo `ACTA_SIN_SALDO`, referencias de régimen/fuente/versión, facultades efectivas y bloqueos de la institución de sesión. `PUT /api/vacaciones/marco` registra una revisión confirmada únicamente con facultad explícita y respaldo; no recibe ni acepta valores por defecto de días. DTOs previstos: `MarcoVacacionalDto` y `GuardarMarcoVacacionalSolicitud`. El cuerpo no selecciona una institución ajena; una ruta global, si se aprueba, exige alcance y facultad adicional. No se crean roles técnicos TH nuevos por inferencia.

La selección de régimen y las delegaciones concretas son datos que deben registrar sus responsables, no semillas. Una institución sin ellos conserva borradores y deniega emisión/verificación. El servidor valida facultad en cada petición, incluso para superadmin; la UI solo informa el resultado. Cambiar base legal/vigencia crea revisión y no modifica un documento emitido. Modo B no tiene ruta de habilitación en esta entrega.

Los contratos descritos son propuestas de diseño para el backlog, no endpoints implementados. Cualquier cambio al alcance funcional aprobado exige revisión; resolver un detalle técnico condicionado no convierte este plan en decisión de un ADR.

Entradas inválidas: 400; sin sesión: 401; sin facultad: 403; recurso ajeno/ausente: 404 sin filtración; conflicto de revisión/intervalo/transición: 409. Se mantiene el contrato uniforme de ADR-0026. Validar pertenencia de todas las referencias en servidor, además del filtro institucional; no confiar en guardias Angular.

## ADR aplicables y por redactar

| Decisión | ADR y estado | Tareas condicionadas |
|---|---|---|
| Reutilizar convenciones vigentes | [ADR-0001](../../decisiones/ADR-0001-clean-architecture-backend.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0003](../../decisiones/ADR-0003-cliente-openapi-generado.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0004](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0026](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) — Vigente | Todas las tareas de implementación |
| Resolver opción antes de tareas dependientes | [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-MAR-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-MAR-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-MAR-00; bloquear tareas que adopten esa opción |

## Mapa de archivos

Las rutas que dicen Crear son propuestas futuras; el milestone solo añade documentos.

| Área | Ruta desde raíz | Responsabilidad |
|---|---|---|
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/MarcoVacacional.cs` | Crear: referencia institucional de régimen, fuente, vigencia y estado de confirmación; sin fórmulas legales |
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/FacultadVacacional.cs` | Crear: delegación explícita por institución/persona/operación, según decisión de activación |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosMarcoVacacional.cs` | Crear: entrada/salida y validación del estado de habilitación |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioMarcoVacacional.cs` | Crear: contrato de consulta y confirmación autorizada |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioMarcoVacacional.cs` | Crear: autorización, fuentes y vigencias; ninguna regla automática de saldo |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/MarcoVacacionalConfiguracion.cs` | Crear: relaciones y unicidad institucional |
| WebApi | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/MarcoVacacionalEndpoints.cs` | Crear: operaciones HTTP privadas y permisos de servidor |
| Frontend | `src/Frontend/src/app/features/vacaciones/marco-vacacional.component.ts` | Crear: estado pendiente/confirmado y facultades; sin selector para activar Modo B |
| Frontend | `src/Frontend/src/app/features/vacaciones/marco-vacacional.component.spec.ts` | Crear: errores, bloqueo y lectura de estado |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/MarcoVacacionalTests.cs` | Crear: 401/403/404/409, delegación y regla desconocida |
| Integración | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/MarcoVacacionalIntegracionTests.cs` | Crear: persistencia por tenant y cambio concurrente |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/AplicacionDbContext.cs` | Modificar en serie: conjuntos, filtros y guardas de inmutabilidad que apruebe ADR |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/` | Generar migración con EF tras ADR; nombre lógico AgregarMarcoVacacional. El prefijo temporal lo genera EF; no se inventa una ruta de archivo existente |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/AplicacionDbContextModelSnapshot.cs` | Actualizar solo mediante la migración del área |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/RegistroDeInfraestructura.cs` | Registrar interfaz/servicio después del contrato |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Program.cs` | Mapear endpoints al finalizar tarea de servidor |
| Integración compartida | `openapi/v1.json` | Regenerar en la misma tarea/PR que modifique API |
| Integración compartida | `src/Frontend/src/app/api-client/` | Regenerar con NSwag; nunca editar cliente a mano |
| Integración compartida | `src/Frontend/src/app/app.routes.ts` | Integración final secuencial de rutas autorizadas |
| Integración compartida | `src/Frontend/src/app/layout/main-layout/main-layout.component.html` | Integración final secuencial de navegación visible según facultades |

## Datos y migración

Migraciones aditivas por institución/vínculo; no cambiar semántica de Persona ni rellenar fechas ausentes. Validar relaciones del mismo tenant, índices/unicidad y revisión de concurrencia según ADR resuelto. No importar ledger, generar años de crédito, corte ni saldos. Las nuevas filas existentes inicialmente quedan pendientes de certificación; no se siembran regímenes ni permisos operativos. Migración vacía de datos personales e instalación con módulo deshabilitado hasta configuración confirmada.

Cada comando autorizado guarda cambio de estado e historia de auditoría de forma consistente; en emisión coordina también el archivo privado según ADR-0046. Recuperar fallo con reintento identificable, conservar original y no publicar datos parciales. Para revertir un despliegue primero deshabilitar operaciones; no borrar documentos/certificaciones para forzar rollback. Respaldo y restauración coordinan base/volumen, verificación de hashes y acceso posterior. Política final de retención sigue bloqueada por datos de activación no aportados.

## Orden de ejecución e integración

1. T-MAR-00: registrar decisiones técnicas y datos operativos en E0; no elegir opciones pendientes desde estas tareas.
2. Ejecutar las tareas de servidor del área cuando sus dependencias estén resueltas; regenerar contrato/cliente en ese mismo PR.
3. Ejecutar UI consumiendo contrato fijado y luego integración de rutas/menú.
4. Validar [test-e2e.md](test-e2e.md), registrar resultados reales y abrir PR hacia develop para la implementación posterior.

Secuencia global de backlog: E0 → E1 (marco) → E2 (vínculos) → E3 (períodos/eventos) → E4 (PDF) → E5 (firma/correcciones) → E6 (recorrido integrado). No se ejecuta trabajo en paralelo sobre DbContext, migraciones, Program, registro DI ni cliente generado. El integrador de E6 posee rutas/menú finales; las demás tareas entregan componentes sin editar esos archivos.

## Riesgos y decisiones pendientes

| Riesgo / decisión | Efecto | Acción / responsable |
|---|---|---|
| PD-MAR-01/02/03/04/06 | Activación sin datos confirmados produciría una afirmación falsa o permiso indebido | TH/Jurídico/autoridad registra valores y responsables; bloquear operación hasta entonces |
| ADR-0044 Propuesto | La representación técnica no está decidida | Quien desarrolla decide en E0 antes de las tareas dependientes; el cierre de #182 no lo hace Vigente |
| Historia incompleta o mezcla de instituciones | Saldo/identidad incorrectos y fuga de datos | Mantener A sin saldo y probar todas las referencias ajenas; responsable técnico |
| Pérdida de archivo, carrera o reintento | Versión/estado inconsistente | Fallos controlados y recuperación en PostgreSQL/almacén de pruebas; E4/E5/E6 |

## Comprobación del plan

- [x] Rutas existentes contrastadas; archivos futuros identificados como Crear; migraciones futuras sin fecha inventada.
- [x] Cada RF/ESC se traza a tarea y prueba o justificación de diferimiento B.
- [x] ADR nuevos registrados y revisados como Propuestos, con ejecución dependiente bloqueada.
- [x] Contratos OpenAPI/Angular y puntos de edición compartida previstos en la misma tarea/PR que modifique API.
- [x] Solo planificación; ningún caso E2E de producción ejecutado en #182.
