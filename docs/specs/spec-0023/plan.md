# Vínculos laborales e historia — Plan de implementación

**Spec aprobado:** [spec.md](spec.md) v0.2, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md) y [decisiones E0 de #189](../../evidencia/issue-189/README.md).

**Versión del plan:** 1.0 — 2026-11-10. **Estado:** contratos congelados y puertas E0/ADR-0045 resueltas; listo para implementar `T-VIN-01` y `T-VIN-02` en [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191) con acoplamiento progresivo hacia [#196](https://github.com/IstpetDev/actualizacion_datos/issues/196).

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

Contrato congelado tras `T-VIN-00` (#189): `GET/POST /api/vacaciones/vinculos`, `GET /api/vacaciones/vinculos/{id}`, `POST /api/vacaciones/vinculos/{id}/certificaciones`. Entradas congeladas: `GuardarVinculoLaboralSolicitud` con referencias y fechas informadas; `CertificarIngresoSolicitud` con fecha efectiva, fuente (`CONTRATO`, `HISTORIAL_IESS` o `CERTIFICACION_TH`), episodio, cargo seleccionado, responsable autenticado y referencia de respaldo en custodia. Salida `VinculoLaboralDto` distingue fecha informada/certificada, discrepancias e historial. La versión esperada controla rectificación concurrente (`409`). Un identificador de persona o respaldo de otro tenant se rechaza antes de asociarlo (`404`).

La carga inicial puede leer `Persona.FechaIngresoInstitucion` como dato administrativo opcional; no lo convierte en antigüedad certificada ni altera su uso actual para capacitaciones. Sin fuente no usa hoy, mínimo ni máximo. Certificar ingreso no certifica saldo. Contratos múltiples requieren clasificación explícita; el cargo del acta queda en instantánea. La certificación de corte/saldo y su endpoint no se implementan en A (`T-VIN-D01`).

**Acoplamiento progresivo con el módulo de contratos laborales ([#196](https://github.com/IstpetDev/actualizacion_datos/issues/196)):** Mientras @AnthonyPilatasig especifica e implementa el módulo básico de contratos laborales por institución (#196), `ServicioVinculosLaborales` (#191) opera sin bloqueo mediante las referencias contractuales de `VinculoLaboral` y `CertificacionIngreso`. Cuando el módulo de contratos (#196) esté disponible en `develop`, `ServicioVinculosLaborales` se acoplará para consultar dichos contratos como fuente de referencia manteniendo intacto el contrato HTTP congelado en este plan.

Los contratos aquí definidos quedan congelados en E0 (#189) antes de implementar consumidores en [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191); cualquier cambio posterior al alcance funcional vuelve a revisión funcional.

Entradas inválidas: 400; sin sesión: 401; sin facultad: 403; recurso ajeno/ausente: 404 sin filtración; conflicto de revisión/intervalo/transición: 409. Se mantiene el contrato uniforme de ADR-0026. Validar pertenencia de todas las referencias en servidor, además del filtro institucional; no confiar en guardias Angular.

## ADR aplicables y por redactar

| Decisión | ADR y estado | Tareas condicionadas |
|---|---|---|
| Reutilizar convenciones vigentes | [ADR-0001](../../decisiones/ADR-0001-clean-architecture-backend.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0003](../../decisiones/ADR-0003-cliente-openapi-generado.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0004](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0026](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) — Vigente | Todas las tareas de implementación |
| Reglas por institución y régimen en Modo A | [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) — Vigente (cerrado en #189, Opción 1 para Modo A) | T-VIN-00 completada; T-VIN-01 y T-VIN-02 desbloqueadas |
| Registro documental sin saldo en Modo A | [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) — Vigente (cerrado en #189, Opción 1 para Modo A) | T-VIN-00 completada; T-VIN-01 y T-VIN-02 desbloqueadas |
| PDF inmutable y verificación física | [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) — Vigente (cerrado en #189, Opción 1 para Modo A) | T-VIN-00 completada; T-VIN-01 y T-VIN-02 desbloqueadas |

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

1. T-VIN-00: completada en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) (E0) con decisiones de ADR-0044/0045/0046 y contratos congelados.
2. Ejecutar las tareas de servidor del área (`T-VIN-01` en [#191](https://github.com/IstpetDev/actualizacion_datos/issues/191)) tras integrar E1 (#190); regenerar contrato/cliente en ese mismo PR.
3. Ejecutar UI (`T-VIN-02`) consumiendo el contrato congelado y luego integración de rutas/menú en E6. Acoplar progresivamente con [#196](https://github.com/IstpetDev/actualizacion_datos/issues/196) a medida que avance el módulo básico de contratos laborales.
4. Validar [test-e2e.md](test-e2e.md), registrar resultados reales y abrir PR hacia develop para la implementación posterior.

Secuencia global de backlog: E0 (#189, resuelta) → E1 (marco, #190) → E2 (vínculos, #191) → E3 (períodos/eventos, #192) → E4 (PDF, #193) → E5 (firma/correcciones, #194) → E6 (recorrido integrado, #195). No se ejecuta trabajo en paralelo sobre DbContext, migraciones, Program, registro DI ni cliente generado. El integrador de E6 posee rutas/menú finales; las demás tareas entregan componentes sin editar esos archivos.

## Riesgos y decisiones pendientes

| Riesgo / decisión | Efecto | Acción / responsable |
|---|---|---|
| PD-VIN-01/02/03/05/06/07 | Reglas de certificación y custodia resueltas en #189; cada vínculo sin `CertificacionIngreso` respaldada bloquea la emisión del acta | TH/Jurídico registra certificaciones y referencias de custodia al operar cada vínculo |
| ADR-0045 Vigente | Opción 1 adoptada en #189 acotada a Modo A en Entrega 1 (`T-VIN-D01` diferida a Modo B) | Aplicar en `T-VIN-01` y `T-VIN-02` sin tablas de ledger/saldos |
| Acoplamiento con módulo de contratos (#196) | El módulo básico de contratos laborales se diseña e implementa en paralelo | Mantener `ServicioVinculosLaborales` desacoplado detrás de `IServicioVinculosLaborales` y acoplar con #196 (@AnthonyPilatasig) cuando se integre |
| Historia incompleta o mezcla de instituciones | Saldo/identidad incorrectos y fuga de datos | Mantener A sin saldo y probar todas las referencias ajenas; responsable técnico |

## Comprobación del plan

- [x] Rutas existentes contrastadas; archivos futuros identificados como Crear; migraciones futuras sin fecha inventada.
- [x] Cada RF/ESC se traza a tarea y prueba o justificación de diferimiento B.
- [x] ADR-0044/0045/0046 cerrados como Vigentes en #189 para Modo A y contratos congelados antes de implementar consumidores.
- [x] Contratos OpenAPI/Angular y puntos de edición compartida previstos en la misma tarea/PR que modifique API.
- [x] Solo planificación y cierre de puertas E0; ningún caso E2E de producción ejecutado en #182/#189.
