# Acta PDF y firma física — Plan de implementación

**Spec aprobado:** [spec.md](spec.md) v0.1, Modo A; [aprobación comunicada el 2026-11-10](../../evidencia/issue-182/aprobacion.md).

**Versión del plan:** 0.1 — 2026-11-10. **Estado:** diseño documental preparado; ejecución futura condicionada a los ADR y datos institucionales indicados.

**Áreas y tecnologías:** .NET 10 / Clean Architecture, EF Core y PostgreSQL, xUnit, Angular 22/pnpm y cliente NSwag existentes. No se seleccionan dependencias nuevas.

## Correspondencia con el spec

Se traza cada requisito/escenario; parcial o diferido significa que su componente B no forma parte de Entrega 1. No se presenta un caso planificado como prueba ejecutada.

| Requisito | Escenarios y pruebas | Solución / disposición | Tarea | Archivo principal |
|---|---|---|---|---|
| RF-VAC-ACT-001 | ESC-VAC-ACT-01 → E2E-ACT-01 | Modo A: completa borrador, el sistema previsualiza contenido obligatorio y bloquea emisión si faltan facultad, fuente, cláusula, días o retorno respaldados | T-ACT-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-002 | ESC-VAC-ACT-01 → E2E-ACT-01; ESC-VAC-ACT-02 → E2E-ACT-02; ESC-VAC-ACT-06 → E2E-ACT-06 | Modo A: termina, el sistema conserva instantánea, número/versión, fecha/actor y PDF con hash; descargas posteriores entregan idénticos bytes | T-ACT-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-003 | ESC-VAC-ACT-02 → E2E-ACT-02 | Modo A: la persona trabajadora descarga/imprime, el sistema entrega el PDF privado y mantiene firma pendiente; el operador delegado deja rastro de entrega | T-ACT-03 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-004 | ESC-VAC-ACT-03 → E2E-ACT-03 | Modo A: verifica una persona designada, el sistema exige revisión física registrada, método y evidencia/referencia/excepción permitida; solo entonces refleja firma verificada vigente | T-ACT-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-005 | ESC-VAC-ACT-03 → E2E-ACT-03; ESC-VAC-ACT-04 → E2E-ACT-04; ESC-VAC-ACT-05 → E2E-ACT-05 | Modo A: se revisa, el sistema observa con motivo y conserva historia, sin trasladar verificación a otra versión | T-ACT-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-006 | ESC-VAC-ACT-04 → E2E-ACT-04 | Modo A: se corrige, el sistema anula con motivo y crea sucesora enlazada; conserva PDF previo y exige nueva verificación | T-ACT-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-007 | ESC-VAC-ACT-01 → E2E-ACT-01 | Se implementa la ausencia de saldo numérico y tabla de incentivos en A. Tabla de saldo/corte/proyección y anticipo pertenecen a Modo B y se difieren. | T-ACT-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-008 | ESC-VAC-ACT-02 → E2E-ACT-02; ESC-VAC-ACT-05 → E2E-ACT-05 | Modo A: el actor carece de facultad o pertenece a otra institución/persona, el sistema deniega sin exponer PDF/evidencia ni cambiar estado | T-ACT-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-009 | ESC-VAC-ACT-06 → E2E-ACT-06 | Modo A: se emite/verifica/anula, el sistema evita duplicados, estados imposibles y PDF publicado sin registro íntegro, conservando auditoría | T-ACT-01 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |
| RF-VAC-ACT-010 | ESC-VAC-ACT-02 → E2E-ACT-02; ESC-VAC-ACT-04 → E2E-ACT-04; ESC-VAC-ACT-05 → E2E-ACT-05 | Modo A: cambia su estado o se descarga, el sistema registra actor, institución, versión, fecha, resultado y motivo aplicable, sin eliminar historia previa | T-ACT-02 | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` |

## Diseño y contratos

Propuesta condicionada a T-ACT-00/ADR-0046: `GET/POST /api/vacaciones/actas`, `PUT /api/vacaciones/actas/{id}/borrador`, `POST /api/vacaciones/actas/{id}/emisiones`, `GET /api/vacaciones/actas/{id}/versiones/{version}/pdf`, `POST /api/vacaciones/actas/{id}/versiones/{version}/entregas`, `/verificaciones`, `/observaciones`, `/anulaciones` y `/sustituciones` bajo el mismo prefijo de versión. Toda transición recibe revisión esperada y clave de reintento; solo borrador permite editar contenido. Rutas concretas se congelan en E0 antes de distribuir consumidores.

`BorradorActaSolicitud` referencia evento/vínculo, plantilla/revisión y campos respaldados; `VersionActaDto` devuelve número, versión, estado, fechas de registro, hash y facultades efectivas, nunca ruta de disco. `VerificarFirmaSolicitud` exige método, fecha de inspección, observaciones y archivo/ref. física/excepción conforme política aprobada. Actor y hora de auditoría vienen de sesión/reloj servidor, no de datos editables. El indicador de verificación es derivado del estado vigente y su hecho registrado, no una casilla independiente.

El PDF toma instantánea del evento y sus certificaciones; en Modo A omite saldo numérico y tabla de incentivos. Reimpresión lee el archivo ya conservado: no lo regenera ni altera para insertar marcas. La pantalla informa anulación/sucesión. Una sucesora exige nueva firma y solo una versión puede estar activa. OBSERVADA no permite editar el PDF; pérdida de respaldo conserva hechos previos. La base de datos no debe publicar estado emitido hasta disponer de bytes íntegros; usar escritura recuperable y compensación de archivo huérfano según ADR-0046, sin exponer una emisión parcial. Las pruebas inyectan fallos de almacenamiento y concurrencia.

Se evalúa reutilizar `IAlmacenArchivos`/motor PDF existentes, sin librería nueva por defecto. La limpieza de documentos de hoja de vida no debe borrar actas históricas; se requiere decisión explícita de retención antes de conectar ambos flujos. Auditoría registra emisión, descarga, entrega, recepción, observación, verificación, pérdida, anulación y sucesión, sin adjuntar binarios a logs.

Los contratos descritos son propuestas de diseño para el backlog, no endpoints implementados. Cualquier cambio al alcance funcional aprobado exige revisión; resolver un detalle técnico condicionado no convierte este plan en decisión de un ADR.

Entradas inválidas: 400; sin sesión: 401; sin facultad: 403; recurso ajeno/ausente: 404 sin filtración; conflicto de revisión/intervalo/transición: 409. Se mantiene el contrato uniforme de ADR-0026. Validar pertenencia de todas las referencias en servidor, además del filtro institucional; no confiar en guardias Angular.

## ADR aplicables y por redactar

| Decisión | ADR y estado | Tareas condicionadas |
|---|---|---|
| Reutilizar convenciones vigentes | [ADR-0001](../../decisiones/ADR-0001-clean-architecture-backend.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0003](../../decisiones/ADR-0003-cliente-openapi-generado.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0004](../../decisiones/ADR-0004-multitenancia-esquema-unico.md) — Vigente | Todas las tareas de implementación |
| Reutilizar convenciones vigentes | [ADR-0026](../../decisiones/ADR-0026-manejo-global-de-errores-y-contrato-uniforme.md) — Vigente | Todas las tareas de implementación |
| Resolver opción antes de tareas dependientes | [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-ACT-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-ACT-00; bloquear tareas que adopten esa opción |
| Resolver opción antes de tareas dependientes | [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md) — Propuesto, revisado documentalmente, sin decisión autónoma | T-ACT-00; bloquear tareas que adopten esa opción |

## Mapa de archivos

Las rutas que dicen Crear son propuestas futuras; el milestone solo añade documentos.

| Área | Ruta desde raíz | Responsabilidad |
|---|---|---|
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/ActaVacaciones.cs` | Crear: agregado y cadena de versiones |
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VersionActaVacaciones.cs` | Crear: instantánea, estado y metadatos de archivo |
| Domain | `src/Backend/src/Istpet.ActualizacionDatos.Domain/Vacaciones/VerificacionFirmaFisica.cs` | Crear: revisión física, resultado y custodia con historia |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Modelos/ModelosActaVacaciones.cs` | Crear: borrador, emisión, descarga y transiciones con revisión esperada |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Servicios/IServicioActasVacaciones.cs` | Crear: casos de uso privados por facultad |
| Application | `src/Backend/src/Istpet.ActualizacionDatos.Application/Documentos/IServicioGeneracionPdfActaVacaciones.cs` | Crear: entrada congelada y salida PDF; sin librería en dominio/aplicación |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Servicios/ServicioActasVacaciones.cs` | Crear: emisión, almacenamiento, accesos y transiciones consistentes |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Documentos/GeneradorPdfActaVacaciones.cs` | Crear: composición según contenido aprobado; evaluar motor ya vigente |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/ActaVacacionesConfiguracion.cs` | Crear: numeración, versiones y vínculo al evento |
| Infrastructure | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Configuraciones/Vacaciones/VerificacionFirmaFisicaConfiguracion.cs` | Crear: resultados históricos y control de concurrencia |
| WebApi | `src/Backend/src/Istpet.ActualizacionDatos.WebApi/Endpoints/ActasVacacionesEndpoints.cs` | Crear: emisión/archivo privado y ciclo documental |
| Frontend | `src/Frontend/src/app/features/vacaciones/actas-vacaciones.component.ts` | Crear: preparar, previsualizar, emitir, observar, verificar y sustituir |
| Frontend | `src/Frontend/src/app/features/vacaciones/mis-actas-vacaciones.component.ts` | Crear: consulta/descarga propia e historial permitido |
| Frontend | `src/Frontend/src/app/features/vacaciones/actas-vacaciones.component.spec.ts` | Crear: transiciones y errores por facultad/versión |
| Frontend | `src/Frontend/src/app/features/vacaciones/mis-actas-vacaciones.component.spec.ts` | Crear: lectura propia, descarga y estado sin autoverificación |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.Domain.Tests/ActaVacacionesTests.cs` | Crear: máquina de estados y sucesión |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/ActasVacacionesTests.cs` | Crear: HTTP, archivos y ausencia de saldo en A |
| Pruebas | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/GeneradorPdfActaVacacionesTests.cs` | Crear: contenido imprimible ficticio y conservación de bytes |
| Integración | `src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests/Integracion/ActasVacacionesIntegracionTests.cs` | Crear: aislamiento, auditoría, evidencia, concurrencia y recuperación |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/AplicacionDbContext.cs` | Modificar en serie: conjuntos, filtros y guardas de inmutabilidad que apruebe ADR |
| Integración compartida | `src/Backend/src/Istpet.ActualizacionDatos.Infrastructure/Persistence/Migrations/` | Generar migración con EF tras ADR; nombre lógico AgregarActasVacaciones. El prefijo temporal lo genera EF; no se inventa una ruta de archivo existente |
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

1. T-ACT-00: registrar decisiones técnicas y datos operativos en E0; no elegir opciones pendientes desde estas tareas.
2. Ejecutar las tareas de servidor del área cuando sus dependencias estén resueltas; regenerar contrato/cliente en ese mismo PR.
3. Ejecutar UI consumiendo contrato fijado y luego integración de rutas/menú.
4. Validar [test-e2e.md](test-e2e.md), registrar resultados reales y abrir PR hacia develop para la implementación posterior.

Secuencia global de backlog: E0 → E1 (marco) → E2 (vínculos) → E3 (períodos/eventos) → E4 (PDF) → E5 (firma/correcciones) → E6 (recorrido integrado). No se ejecuta trabajo en paralelo sobre DbContext, migraciones, Program, registro DI ni cliente generado. El integrador de E6 posee rutas/menú finales; las demás tareas entregan componentes sin editar esos archivos.

## Riesgos y decisiones pendientes

| Riesgo / decisión | Efecto | Acción / responsable |
|---|---|---|
| PD-ACT-01/02/03/04/05/06/07/08 | Activación sin datos confirmados produciría una afirmación falsa o permiso indebido | TH/Jurídico/autoridad registra valores y responsables; bloquear operación hasta entonces |
| ADR-0046 Propuesto | La representación técnica no está decidida | Quien desarrolla decide en E0 antes de las tareas dependientes; el cierre de #182 no lo hace Vigente |
| Historia incompleta o mezcla de instituciones | Saldo/identidad incorrectos y fuga de datos | Mantener A sin saldo y probar todas las referencias ajenas; responsable técnico |
| Pérdida de archivo, carrera o reintento | Versión/estado inconsistente | Fallos controlados y recuperación en PostgreSQL/almacén de pruebas; E4/E5/E6 |

## Comprobación del plan

- [x] Rutas existentes contrastadas; archivos futuros identificados como Crear; migraciones futuras sin fecha inventada.
- [x] Cada RF/ESC se traza a tarea y prueba o justificación de diferimiento B.
- [x] ADR nuevos registrados y revisados como Propuestos, con ejecución dependiente bloqueada.
- [x] Contratos OpenAPI/Angular y puntos de edición compartida previstos en la misma tarea/PR que modifique API.
- [x] Solo planificación; ningún caso E2E de producción ejecutado en #182.
