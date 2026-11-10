# Períodos, calendario y registro sin saldo — Plan de implementación

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md).

**Versión del plan:** 0.1 — 2026-11-10. **Estado:** diseño documental preparado; ejecución futura condicionada a los ADR y datos institucionales indicados.

**Áreas y tecnologías:** .NET 10 / Clean Architecture, EF Core y PostgreSQL, xUnit, Angular 22/pnpm y cliente NSwag existentes. No se seleccionan dependencias nuevas.

## Correspondencia con el spec

Se traza cada requisito/escenario; parcial o diferido significa que su componente B no forma parte de Entrega 1. No se presenta un caso planificado como prueba ejecutada.

| Requisito | Escenarios y pruebas | Solución / disposición | Tarea | Archivo principal |
|---|---|---|---|---|
| RF-VAC-SAL-001 | ESC-VAC-SAL-01 → E2E-SAL-01; ESC-VAC-SAL-03 → E2E-SAL-03 | Modo A: se identifica devengo, el sistema conserva límites, vínculo, institución y versión, separados del rango de disfrute | T-SAL-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |
| RF-VAC-SAL-002 | ESC-VAC-SAL-02 → E2E-SAL-02 | Modo A: se consulta o imprime en Modo A, el sistema muestra saldo no certificado sin cifra restante y no crea créditos por años transcurridos | T-SAL-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |
| RF-VAC-SAL-003 | ESC-VAC-SAL-01 → E2E-SAL-01; ESC-VAC-SAL-02 → E2E-SAL-02; ESC-VAC-SAL-03 → E2E-SAL-03 | La habilitación de Modo B por corte/reglas confirmadas se difiere. A solo debe rechazar o no exponer esa operación. | T-SAL-D01 | `Sin archivo de producción en Entrega 1; decisión diferida documentada en spec.md` |
| RF-VAC-SAL-004 | ESC-VAC-SAL-04 → E2E-SAL-04 | Se acepta respaldo manual/certificado de días, feriados, empalme y retorno en A; el motor automático de cálculo queda diferido mientras no haya regla confirmada. | T-SAL-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |
| RF-VAC-SAL-005 | ESC-VAC-SAL-06 → E2E-SAL-06 | Modo A: se propone un rango efectivo superpuesto, el sistema bloquea la confirmación; ante dos confirmaciones concurrentes solo una puede reservar/afectar las mismas unidades | T-SAL-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |
| RF-VAC-SAL-006 | ESC-VAC-SAL-05 → E2E-SAL-05 | Consumo FIFO, doble bolsa, tramos contables, anticipos y saldo suficiente se difieren íntegramente; no hay ledger ni resumen de saldo en A. | T-SAL-D01 | `Sin archivo de producción en Entrega 1; decisión diferida documentada en spec.md` |
| RF-VAC-SAL-007 | ESC-VAC-SAL-06 → E2E-SAL-06; ESC-VAC-SAL-07 → E2E-SAL-07 | En A se prueba que registrar/verificar documentos no genera débitos. Idempotencia de consumo/reservas cuantificadas se difiere a B. | T-SAL-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |
| RF-VAC-SAL-008 | ESC-VAC-SAL-07 → E2E-SAL-07 | En A se corrigen eventos/documentos conservando historia. Compensaciones de movimientos y devolución de días se difieren a B. | T-SAL-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |
| RF-VAC-SAL-009 | ESC-VAC-SAL-06 → E2E-SAL-06 | Modo A: se consulta calendario, saldos o tramos ajenos, el sistema deniega lectura y escritura sin revelar datos | T-SAL-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` |

## Diseño y contratos

Propuesta condicionada a T-SAL-00: `GET /api/vacaciones/vinculos/{id}/periodos`, `POST /api/vacaciones/periodos`, `POST /api/vacaciones/eventos/validar`, `POST /api/vacaciones/eventos`, `POST /api/vacaciones/eventos/{id}/rectificaciones`. `RegistrarPeriodoSolicitud` exige límites y fuente certificada o ancla/regla confirmada; `GuardarEventoVacacionalSolicitud` incluye período/vínculo, fechas solicitadas/efectivas, días calendario, días efectivos declarados y respaldo, retorno certificado, revisión esperada y motivo. `EventoVacacionalDto` informa modo `ACTA_SIN_SALDO` y estado de certificación; no incluye cero como saldo desconocido.

La identificación de períodos es manual/certificada en A; aniversario/ciclo automático solo se usará si su regla fue efectivamente confirmada, sin devengo. El conteo de longitud del rango calendario no es cálculo de derecho. Feriados/empalme/retorno no tienen política predeterminada: se respalda el resultado del evento y se bloquea emisión si falta. G0 debe fijar estados operativos que bloquean solapes y si afectan vínculos simultáneos; la emisión del acta no inventa una aprobación laboral.

La validación y confirmación del rango deben revalidar conflictos dentro de una escritura consistente; dos eventos concurrentes no pueden reservar el mismo rango activo según la política aprobada. Cancelar/corregir registra motivo y revisión; no crea ni revierte un débito. El PDF ya emitido se corrige por sucesión de versión.

Los contratos descritos son propuestas de diseño para el backlog, no endpoints implementados. Cualquier cambio al alcance funcional aprobado exige revisión; resolver un detalle técnico condicionado no convierte este plan en decisión de un ADR.

Entradas inválidas: 400; sin sesión: 401; sin facultad: 403; recurso ajeno/ausente: 404 sin filtración; conflicto de revisión/intervalo/transición: 409. Se mantiene el contrato uniforme de ADR-0026. Validar pertenencia de todas las referencias en servidor, además del filtro institucional; no confiar en guardias Angular.

## ADR aplicables y por redactar

| Decisión | ADR y estado | Tareas condicionadas |
|---|---|---|
| Reutilizar convenciones vigentes | [ADR-0001](../../decisiones/ADR-0001-clean-architecture-backend.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0003](../../decisiones/ADR-0003-cliente-openapi-generado.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0004](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0026](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) — Vigente | Todas las tareas de implementación |
| Resolver opción antes de tareas dependientes | [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-SAL-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-SAL-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-SAL-00; bloquear tareas que adopten esa opción |

## Mapa de archivos

Las rutas que dicen Crear son propuestas futuras; el milestone solo añade documentos.

| Área | Ruta desde raíz | Responsabilidad |
|---|---|---|
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/PeriodoVacacional.cs` | Crear: límites certificados y etiqueta descriptiva por vínculo |
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/EventoVacacional.cs` | Crear: rango solicitado/efectivo, días declarados, retorno respaldado y revisión |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosPeriodoVacacional.cs` | Crear: período/evento y procedencia; saldo numérico ausente en Modo A |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioPeriodosVacacionales.cs` | Crear: identificar período certificado y validar/registrar evento |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioPeriodosVacacionales.cs` | Crear: fechas, solapes y revisión sin movimientos contables |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/PeriodoVacacionalConfiguracion.cs` | Crear: vínculo/tenant, intervalos y eventos activos |
| WebApi | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/PeriodosVacacionalesEndpoints.cs` | Crear: consulta/registro/validación privada |
| Frontend | `src/Frontend/src/app/features/vacaciones/periodos-vacacionales.component.ts` | Crear: fechas/certificaciones, vista previa y advertencia sin saldo |
| Frontend | `src/Frontend/src/app/features/vacaciones/periodos-vacacionales.component.spec.ts` | Crear: retorno pendiente, solapes y días respaldados |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/PeriodoVacacionalTests.cs` | Crear: límites y unidades de fechas civiles |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/PeriodosVacacionalesTests.cs` | Crear: ausencia de saldo y contrato de validación |
| Integración | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/PeriodosVacacionalesIntegracionTests.cs` | Crear: solape concurrente e independencia por institución |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/AplicacionDbContext.cs` | Modificar en serie: conjuntos, filtros y guardas de inmutabilidad que apruebe ADR |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/` | Generar migración con EF tras ADR; nombre lógico AgregarPeriodosVacacionales. El prefijo temporal lo genera EF; no se inventa una ruta de archivo existente |
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

1. T-SAL-00: registrar decisiones técnicas y datos operativos en E0; no elegir opciones pendientes desde estas tareas.
2. Ejecutar las tareas de servidor del área cuando sus dependencias estén resueltas; regenerar contrato/cliente en ese mismo PR.
3. Ejecutar UI consumiendo contrato fijado y luego integración de rutas/menú.
4. Validar [test-e2e.md](test-e2e.md), registrar resultados reales y abrir PR hacia develop para la implementación posterior.

Secuencia global de backlog: E0 → E1 (marco) → E2 (vínculos) → E3 (períodos/eventos) → E4 (PDF) → E5 (firma/correcciones) → E6 (recorrido integrado). No se ejecuta trabajo en paralelo sobre DbContext, migraciones, Program, registro DI ni cliente generado. El integrador de E6 posee rutas/menú finales; las demás tareas entregan componentes sin editar esos archivos.

## Riesgos y decisiones pendientes

| Riesgo / decisión | Efecto | Acción / responsable |
|---|---|---|
| PD-SAL-02/04/05/06/07/08 | Activación sin datos confirmados produciría una afirmación falsa o permiso indebido | TH/Jurídico/autoridad registra valores y responsables; bloquear operación hasta entonces |
| ADR-0045 Propuesto | La representación técnica no está decidida | Quien desarrolla decide en E0 antes de las tareas dependientes; el cierre de #182 no lo hace Vigente |
| Historia incompleta o mezcla de instituciones | Saldo/identidad incorrectos y fuga de datos | Mantener A sin saldo y probar todas las referencias ajenas; responsable técnico |
| Pérdida de archivo, carrera o reintento | Versión/estado inconsistente | Fallos controlados y recuperación en PostgreSQL/almacén de pruebas; E4/E5/E6 |

## Comprobación del plan

- [x] Rutas existentes contrastadas; archivos futuros identificados como Crear; migraciones futuras sin fecha inventada.
- [x] Cada RF/ESC se traza a tarea y prueba o justificación de diferimiento B.
- [x] ADR nuevos registrados y revisados como Propuestos, con ejecución dependiente bloqueada.
- [x] Contratos OpenAPI/Angular y puntos de edición compartida previstos en la misma tarea/PR que modifique API.
- [x] Solo planificación; ningún caso E2E de producción ejecutado en #182.
