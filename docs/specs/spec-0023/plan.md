# Vínculos laborales e historia — Plan de implementación

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md).

**Versión del plan:** 0.1 — 2026-11-10. **Estado:** diseño documental preparado; ejecución futura condicionada a los ADR y datos institucionales indicados.

**Áreas y tecnologías:** .NET 10 / Clean Architecture, EF Core y PostgreSQL, xUnit, Angular 22/pnpm y cliente NSwag existentes. No se seleccionan dependencias nuevas.

## Correspondencia con el spec

Se traza cada requisito/escenario; parcial o diferido significa que su componente B no forma parte de Entrega 1. No se presenta un caso planificado como prueba ejecutada.

| Requisito | Escenarios y pruebas | Solución / disposición | Tarea | Archivo principal |
|---|---|---|---|---|
| RF-VAC-VIN-001 | ESC-VAC-VIN-03 → E2E-VIN-03 | Modo A: TH registra contratos/episodios, el sistema conserva referencias y fechas independientes y rechaza asociaciones entre ámbitos | T-VIN-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |
| RF-VAC-VIN-002 | ESC-VAC-VIN-01 → E2E-VIN-01 | Modo A: TH consulta el vínculo, el sistema muestra cada valor/fuente y su inconsistencia; no asigna fecha efectiva sin certificación | T-VIN-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |
| RF-VAC-VIN-003 | ESC-VAC-VIN-01 → E2E-VIN-01 | Modo A: TH confirma fecha y continuidad, el sistema registra fuente, actor, fecha, motivo y versión; una carga de nómina no la sustituye | T-VIN-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |
| RF-VAC-VIN-004 | ESC-VAC-VIN-02 → E2E-VIN-02; ESC-VAC-VIN-03 → E2E-VIN-03 | Modo A: se revisa antigüedad/cargo, el sistema pide resolución del episodio y selección respaldada ante ambigüedad; no duplica derecho ni reinicia por un simple cambio | T-VIN-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |
| RF-VAC-VIN-005 | ESC-VAC-VIN-04 → E2E-VIN-04 | Modo A: se solicita saldo, el sistema conserva desconocido, prohíbe reconstrucción por antigüedad y permite solo el alcance de Modo A aprobado | T-VIN-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |
| RF-VAC-VIN-006 | ESC-VAC-VIN-05 → E2E-VIN-05 | Corte desglosado, apertura nativa, habilitación de FIFO y créditos de saldo pertenecen a Modo B. Se documenta el requisito y escenario, sin endpoint, migración ni issue de implementación en A. | T-VIN-D01 | `Sin archivo de producción en Entrega 1; decisión diferida documentada en spec.md` |
| RF-VAC-VIN-007 | ESC-VAC-VIN-06 → E2E-VIN-06 | Modo A: se corrige, el sistema conserva la versión anterior, audita el cambio y señala documentos afectados sin sobrescribirlos | T-VIN-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |
| RF-VAC-VIN-008 | ESC-VAC-VIN-06 → E2E-VIN-06 | Modo A: intenta certificar fecha o corte, el sistema lo deniega sin cambios ni acceso al respaldo ajeno | T-VIN-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` |

## Diseño y contratos

Propuesta condicionada a T-VIN-00: `GET/POST /api/vacaciones/vinculos`, `GET /api/vacaciones/vinculos/{id}`, `POST /api/vacaciones/vinculos/{id}/certificaciones`. Entradas previstas: `GuardarVinculoLaboralSolicitud` con referencias y fechas informadas; `CertificarIngresoSolicitud` con fecha efectiva, fuente, episodio, cargo seleccionado, responsable autenticado y referencia de respaldo. Salida `VinculoLaboralDto` distingue fecha informada/certificada, discrepancias e historial. La versión esperada controla rectificación concurrente. Un identificador de persona o respaldo de otro tenant se rechaza antes de asociarlo.

La carga inicial puede leer `Persona.FechaIngresoInstitucion` como dato administrativo opcional; no lo convierte en antigüedad certificada ni altera su uso actual para capacitaciones. Sin fuente no usa hoy, mínimo ni máximo. Certificar ingreso no certifica saldo. Contratos múltiples requieren clasificación explícita; el cargo del acta queda en instantánea. La certificación de corte/saldo y su endpoint no se implementan en A.

Los contratos descritos son propuestas de diseño para el backlog, no endpoints implementados. Cualquier cambio al alcance funcional aprobado exige revisión; resolver un detalle técnico condicionado no convierte este plan en decisión de un ADR.

Entradas inválidas: 400; sin sesión: 401; sin facultad: 403; recurso ajeno/ausente: 404 sin filtración; conflicto de revisión/intervalo/transición: 409. Se mantiene el contrato uniforme de ADR-0026. Validar pertenencia de todas las referencias en servidor, además del filtro institucional; no confiar en guardias Angular.

## ADR aplicables y por redactar

| Decisión | ADR y estado | Tareas condicionadas |
|---|---|---|
| Reutilizar convenciones vigentes | [ADR-0001](../../decisiones/ADR-0001-clean-architecture-backend.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0003](../../decisiones/ADR-0003-cliente-openapi-generado.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0004](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0026](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) — Vigente | Todas las tareas de implementación |
| Resolver opción antes de tareas dependientes | [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-VIN-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-VIN-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-VIN-00; bloquear tareas que adopten esa opción |

## Mapa de archivos

Las rutas que dicen Crear son propuestas futuras; el milestone solo añade documentos.

| Área | Ruta desde raíz | Responsabilidad |
|---|---|---|
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VinculoLaboral.cs` | Crear: episodios y referencias de la persona institucional |
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/CertificacionIngreso.cs` | Crear: fecha/fuente/cargo/continuidad certificados e historial de rectificación |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosVinculoLaboral.cs` | Crear: valores informados distintos de certificados, versiones y conflictos |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioVinculosLaborales.cs` | Crear: carga de referencias, contraste y certificación autorizada |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioVinculosLaborales.cs` | Crear: fuente administrativa inicial sin certificación ni saldo inferidos |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/VinculoLaboralConfiguracion.cs` | Crear: relaciones y restricciones de ámbito institucional |
| WebApi | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/VinculosLaboralesEndpoints.cs` | Crear: consulta/registro y certificación por facultad |
| Frontend | `src/Frontend/src/app/features/vacaciones/vinculos-laborales.component.ts` | Crear: fuentes, discrepancias, cargo y certificación |
| Frontend | `src/Frontend/src/app/features/vacaciones/vinculos-laborales.component.spec.ts` | Crear: sin fecha, múltiples fuentes y respuesta denegada |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/VinculoLaboralTests.cs` | Crear: intervalos, episodios y ausencia de fecha sustituta |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/VinculosLaboralesTests.cs` | Crear: contrato HTTP y autorización |
| Integración | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/VinculosLaboralesIntegracionTests.cs` | Crear: aislamiento, historia y rectificación persistida |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/AplicacionDbContext.cs` | Modificar en serie: conjuntos, filtros y guardas de inmutabilidad que apruebe ADR |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/` | Generar migración con EF tras ADR; nombre lógico AgregarVinculosVacacionales. El prefijo temporal lo genera EF; no se inventa una ruta de archivo existente |
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

1. T-VIN-00: registrar decisiones técnicas y datos operativos en E0; no elegir opciones pendientes desde estas tareas.
2. Ejecutar las tareas de servidor del área cuando sus dependencias estén resueltas; regenerar contrato/cliente en ese mismo PR.
3. Ejecutar UI consumiendo contrato fijado y luego integración de rutas/menú.
4. Validar [test-e2e.md](test-e2e.md), registrar resultados reales y abrir PR hacia develop para la implementación posterior.

Secuencia global de backlog: E0 → E1 (marco) → E2 (vínculos) → E3 (períodos/eventos) → E4 (PDF) → E5 (firma/correcciones) → E6 (recorrido integrado). No se ejecuta trabajo en paralelo sobre DbContext, migraciones, Program, registro DI ni cliente generado. El integrador de E6 posee rutas/menú finales; las demás tareas entregan componentes sin editar esos archivos.

## Riesgos y decisiones pendientes

| Riesgo / decisión | Efecto | Acción / responsable |
|---|---|---|
| PD-VIN-01/02/03/05/06/07 | Activación sin datos confirmados produciría una afirmación falsa o permiso indebido | TH/Jurídico/autoridad registra valores y responsables; bloquear operación hasta entonces |
| ADR-0045 Propuesto | La representación técnica no está decidida | Quien desarrolla decide en E0 antes de las tareas dependientes; el cierre de #182 no lo hace Vigente |
| Historia incompleta o mezcla de instituciones | Saldo/identidad incorrectos y fuga de datos | Mantener A sin saldo y probar todas las referencias ajenas; responsable técnico |
| Pérdida de archivo, carrera o reintento | Versión/estado inconsistente | Fallos controlados y recuperación en PostgreSQL/almacén de pruebas; E4/E5/E6 |

## Comprobación del plan

- [x] Rutas existentes contrastadas; archivos futuros identificados como Crear; migraciones futuras sin fecha inventada.
- [x] Cada RF/ESC se traza a tarea y prueba o justificación de diferimiento B.
- [x] ADR nuevos registrados y revisados como Propuestos, con ejecución dependiente bloqueada.
- [x] Contratos OpenAPI/Angular y puntos de edición compartida previstos en la misma tarea/PR que modifique API.
- [x] Solo planificación; ningún caso E2E de producción ejecutado en #182.
