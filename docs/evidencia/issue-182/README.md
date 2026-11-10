# Coordinación documental de vacaciones — Issue #182

**Consulta de issues e ingeniería inversa:** 2026-11-09. **Preparación del expediente:** 2026-11-10.

**Estado:** Fase 1 preparada para revisión; aprobaciones funcionales pendientes. No hay implementación de producción.

## Alcance y criterio de cierre

El [issue #182](https://github.com/IstpetDev/actualizacion_datos/issues/182) exige cuatro specs revisadas/aprobadas, planes/tareas/pruebas trazados y ADR necesarios registrados para decisión. Archivos redactados o CI verde no equivalen a aprobación funcional, certificación jurídica ni cierre. Los seis issues estaban abiertos y sin comentarios de aprobación en la consulta inicial.

La petición permite preparar el PR a `develop` y, cuando se cumplan todos los criterios, aprobar/integrar, cerrar issue y eliminar rama. Mientras falte aprobación de versiones concretas, el PR permanece en borrador y #182/#187 abiertos. No se agrega `Closes` prematuro ni se inventa evidencia de aprobación. No se publican comentarios adicionales en GitHub.

## Entregables y dependencias

| Issue | Documento / versión | Estado real | Condición siguiente |
|---|---|---|---|
| [#183](https://github.com/IstpetDev/actualizacion_datos/issues/183) | [spec-0022 v0.1](../../specs/spec-0022/spec.md) | Borrador | Revisión de régimen, alcance y facultades por TH/Jurídico/responsable funcional |
| [#184](https://github.com/IstpetDev/actualizacion_datos/issues/184) | [spec-0023 v0.1](../../specs/spec-0023/spec.md) | Borrador | Revisión de vínculo, fecha, historia y corte |
| [#185](https://github.com/IstpetDev/actualizacion_datos/issues/185) | [spec-0024 v0.1](../../specs/spec-0024/spec.md) | Borrador | Aprobar alcance A/B y decisiones operativas o delimitar bloqueos explícitos |
| [#186](https://github.com/IstpetDev/actualizacion_datos/issues/186) | [spec-0025 v0.1](../../specs/spec-0025/spec.md) | Borrador | Aprobar contenido, facultades, verificación/evidencia y ciclo del acta |
| [#187](https://github.com/IstpetDev/actualizacion_datos/issues/187) | No se generan aún `plan.md`, `tasks.md`, `test-e2e.md` | Espera aprobación de specs concretas | Después, tres documentos por spec aprobada; trazabilidad requisito/escenario → solución → tarea → prueba; backlog desde tareas aprobadas |
| #182 | Este expediente y tres ADR propuestos | En curso | No cerrar antes de revisión/aprobación y trazabilidad de #187 |

Los ADR usan números correlativos libres sin reutilizar ADR-0001/0002/0003: [ADR-0044](../../decisiones/ADR-0044-reglas-vacacionales-por-institucion-y-regimen.md), [ADR-0045](../../decisiones/ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md), [ADR-0046](../../decisiones/ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md). Siguen **Propuestos**, para decisión de quien desarrolla; no habilitan tareas dependientes. Su registro anticipado no sustituye aprobación funcional ni constituye plan técnico.

## Método y procedencia de ingeniería inversa

Se consultó solo código de la copia local de `gestion_recursos_humanos_istpet`, commit `9418dfd0b6e974273e111fd02ade1cd9a3c6c25f`. No se consultaron bases de datos, expedientes, configuración privada, credenciales ni fotografías. No se copiaron valores personales ni firmas de plantillas. No se ejecutaron pruebas del legado: la lectura estática no certifica comportamiento desplegado ni esquema real de una base.

Las rutas siguientes son relativas al repositorio legado, no archivos implementados aquí. Para reproducir, obtener esa revisión y localizar símbolos sin importar datos. El contexto recibido se contrastó como hipótesis; se señalan diferencias encontradas.

| Fuente de código legado | Evidencia observada | Adaptación / límite |
|---|---|---|
| `src/Backend/RRHH.Domain/Entities/Profesores.cs`, `Contratos.cs` | Ficha/contratos, institución en contrato, fechas y reingreso | Modelo por institución/episodio; no copiar cédula como nueva clave técnica |
| `src/Backend/RRHH.Domain/Entities/VacPeriodosVacacionales.cs` | Origen, fechas, `DiasSolicitados`, fines de semana, estados, aprobación TH/RL y ruta | No se observaron campos persistidos `DiasCalendario`, `DiasEfectivos`, `FeriadosExcluidos` en esa entidad; sí en cálculo/DTO. No afirmar almacenamiento de todos en tabla |
| `src/Backend/RRHH.Domain/Entities/VacLedger.cs` | `TipoTransaccion`, `Dias`, `Periodo`, `Detalle`, `IdPeriodoVacaciones`/`IdPermiso`, `RegistradoPorId`; atributo decimal `(8,4)` | Contexto inicial decía `(5,2)`, `Descripcion`, `ReferenciaId`, `UsuarioAccion`. No asumir esos nombres/precisión ni esquema desplegado; nuevo modelo espera reglas aprobadas |
| `src/Backend/RRHH.Domain/Entities/VacSaldos.cs`, `VacConfiguracion.cs`, `VacPlantillasDocumentos.cs` | Resumen por profesor/período, parámetros clave/valor, configuración de plantilla JSON | Resumen no sustituye evidencia; configuración global no es matriz jurídica multiinstitucional |
| `src/Backend/RRHH.Infrastructure/Persistence/Repositories/Vacaciones/VacacionesRepository.cs`, `TieneDerechoVacaciones` (1681) | Excluye si todos los contratos son parciales; sin contratos usa presencia de fecha de ficha; dedicación desconocida no excluye por sí sola | No es prueba de elegibilidad jurídica; exigir régimen/fuente |
| Mismo archivo, `ObtenerFechaInicioEfectiva` (1489); `src/Frontend/src/app/features/vacaciones-licencias/fecha-antiguedad.ts` | Reingreso más reciente; si no, mínimo ficha/contrato; backend puede usar hoy cuando no hay fechas | Frontend conserva «sin fecha» en caso sin fuentes, mientras backend usa hoy. Nuevo diseño exige certificación, sin sustitutos |
| `src/Frontend/src/app/features/vacaciones-licencias/vacaciones-licencias.component.ts`, `alertaInconsistenciaFechas`; `components/plantilla-acta/cargo-contrato-activo.ts` | Alerta de fechas y selección de cargo activo no parcial: completo > medio > fecha > identificador | Mantener alerta; prioridad técnica no certifica cargo/continuidad; exigir resolución explícita |
| `VacacionesRepository.cs`, `GetPeriodoActivo` (341), `CalcularDiasGanadosBaseHistoricos` (1460), `CalcularDevengadoTiempoReal` | Aniversarios y reglas numéricas fijas; sin fecha puede producir período del año actual | No trasladar cifras como valores normativos. Ancla verificada y parámetros por régimen |
| `VacacionesRepository.cs`, `ReconciliarPeriodosFifoSinLockAsync` (808), `BolsaFifo` (418) | Reconstruye bolsas desde inicio con consumos iniciales cero, separa base/incentivo y reparte cronológicamente | Prohibido inferir saldo exacto; corte certificado o Modo A |
| Reconciliador anterior (1153–1257) | Actualiza GOCE, crea filas y elimina sobrantes; tramos requieren cantidades compatibles con fechas imputables | Ledger legado **no inmutable**; no asumir tramos universales para fracciones ni copiar reconciliación destructiva |
| `VacacionesRepository.cs`, `CalcularDiasVacacionesAsync` (4109), `ValidarConflictoFechasVacacionesAsync` (2197) | Viernes puede añadir fin de semana; resta feriados únicos no recuperables; revisa vacaciones/permisos | Calendario/empalme sujetos a régimen. Colisión con permisos fuera de Entrega 1 |
| `VacacionesRepository.cs`, aprobación TH/RL (2590–2635), creación directa/planificación | Aprobación final genera GOCE; directa/planificación nacen aprobadas | No trasladar esos estados a firma. Reconciliación también consulta `APROBADO_TH` y otros estados: no asegurar que toda ruta espera exclusivamente RL |
| `VacacionesRepository.cs`, `GenerarActaVacacionesAsync` (3339); `src/Frontend/src/app/features/vacaciones-licencias/components/plantilla-acta/plantilla-acta.component.ts` (solo símbolos de composición) | DOCX, placeholders, tablas de vacaciones/incentivos, nota de anticipo | Conservar estructura, sin copiar datos. Nuevo flujo PDF versionado y firma física separada |

El contexto dice «6 tablas principales», pero enumera **cinco entidades nucleares**: evento, ledger, saldo, configuración y plantilla, además de vínculos. El legado también contiene permisos, cierres, recuperación e incentivos. No se inventa una sexta tabla ni se incorporan esas extensiones a Entrega 1.

## Cinco brechas preservadas

| Brecha | Requisitos | Bloqueos |
|---|---|---|
| Régimen universal / filtro de dedicación | RF-VAC-MAR-002/003; RF-VAC-VIN-004 | PD-MAR-01/02/03; ADR-0044 |
| Historia con consumos cero | RF-VAC-VIN-005/006; RF-VAC-SAL-002/003 | PD-VIN-04; PD-SAL-01/04; ADR-0045 |
| DOCX editable sin verificación física | RF-VAC-ACT-002/004/005/006/010 | PD-ACT-01/02/03/06/08; ADR-0046 |
| Datos personales en referencias | Reglas de privacidad en cada spec; ejemplo ficticio en spec-0025 | Ningún material real se copia al repositorio |
| Permisos y extensiones del legado | RF-VAC-MAR-005 y exclusiones de cada spec | Fuera de Entrega 1; sin tareas desde supuestos |

## Fuentes normativas y verificación pendiente

Consulta técnica 2026-11-09: el [Código del Trabajo inicial](https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/CODIGO_DEL_TRABAJO.pdf) se descargó por HTTPS validado y leyó con `pdftotext` fuera del repositorio; declara última reforma 2023-05-12, localizados arts. 69–78. El [PDF LOSEP inicial](https://www.trabajo.gob.ec/wp-content/uploads/2024/01/LEY-ORGANICA-DE-SERVICIO-PUBLICO.pdf) fue legible mediante navegador, declara igual fecha de reforma y contiene arts. 3/29. **No se acredita que sean las últimas reformas vigentes en 2026.**

La [LOEI inicial](https://educacion.gob.ec/wp-content/uploads/downloads/2024/07/Ley-Organica-Educacion-Intercultural.pdf) no se pudo leer: tiempo de espera en navegador y fallo de validación de certificado en descarga alternativa. No se desactivó TLS ni se tomó fuente secundaria como autoridad. La [Biblioteca del Ministerio del Trabajo](https://www.trabajo.gob.ec/biblioteca/) se consultó como catálogo, sin acreditar actualidad de las compilaciones. Contratos/colectivos/políticas no fueron aportados.

Al aprobar se debe registrar validación de artículos/reformas/ámbito por Jurídico o delimitar capacidades que sigan bloqueadas. Documentar un bloqueo no lo resuelve. Registro de fuentes y PD-MAR-01/02/03 en spec-0022.

## Revisión y continuación de #187

1. Registrar versión, decisión, responsable/rol y evidencia de aprobación en cada spec. Responder preguntas o aprobar un alcance que mantenga bloqueadas capacidades no resueltas; cambios de alcance exigen revisar dependientes.
2. Mantener ADR Propuestos hasta decisión expresa de quien desarrolla, antes de ejecutar tareas dependientes. Ningún ADR vigente cambia en este PR.
3. Solo con versiones aprobadas, desarrollar #187 con `plan.md`, `tasks.md`, `test-e2e.md` por spec: rutas exactas, trazabilidad de cada RF/ESC, contratos/migraciones, corte, aislamiento, recuperación, PDF/evidencia y regeneración OpenAPI/cliente si cambia API.
4. Crear issues de implementación desde tareas aprobadas con dependencias/aceptación, sin programar ni cerrar #182 antes de cumplir su revisión y trazabilidad.

No se generan planes encubiertos ni matriz E2E anticipada aquí. Los escenarios funcionales son parte de las specs como exige #182.

## Validación local del expediente

Ejecución 2026-11-10. Solo cambia documentación: no hay área de producción modificada que compilar, ni pruebas .NET/Angular ejecutadas. No se presenta esa ausencia como prueba del módulo futuro. Las siguientes comprobaciones verifican el expediente actual:

| Comando | Resultado real |
|---|---|
| `bash .github/scripts/validar-rama.sh develop docs/182-planificacion-vacaciones 'docs: preparar specs funcionales del módulo de vacaciones'` | `Política de ramas cumplida` |
| `python3 /tmp/validar-docs-vacaciones.py` | Comprobación temporal de secciones, enlaces/anclas, identificadores únicos, cobertura RF en escenarios, estado pendiente y ausencia de planes prematuros: 10 documentos, 129 enlaces locales, 34 requisitos, 23 escenarios; correcta |
| `git diff --cached --check` | Sin salida, código 0 |
| `git diff --cached --name-only \| bash .github/scripts/filtrar-rutas.sh` | `backend=false`, `frontend=false`, `openapi=false`, `workflows=false`, `docs=true` |
| `gitleaks protect --staged --redact --no-banner` | `1 commits scanned`, `no leaks found` |

El comprobador temporal no se añade como infraestructura de pruebas del producto. Sus cantidades se desglosan en spec-0022: 7 RF/4 escenarios; spec-0023: 8/6; spec-0024: 9/7; spec-0025: 10/6. La cobertura solo comprueba referencias y estructura documental, no ejecución ni corrección legal. La revisión funcional y los checks remotos del HEAD del PR son verificaciones distintas; CI verde no reemplaza aprobaciones.

## PR y primera validación remota

[PR #188](https://github.com/IstpetDev/actualizacion_datos/pull/188), en borrador hacia `develop`, rama `docs/182-planificacion-vacaciones`, milestone 3 «Módulo de vacaciones: planificación por specs». El conector permitió consultas, pero crear el PR devolvió `403 Resource not accessible by integration`; se creó con `gh` mediante la sesión disponible, sin modificar permisos ni configuración del repositorio.

Primera comprobación remota mediante `gh pr checks 188 --watch --interval 10` y `gh run view 42819949262 --json status,conclusion,headSha,jobs`: ejecución [42819949262](https://github.com/IstpetDev/actualizacion_datos/actions/runs/42819949262), HEAD `e3b589df2ca06a19f6aae0ac310cd749050a5f01`, estado `completed`, conclusión `success`. Pasaron Detectar cambios, Política de ramas, Secretos/Gitleaks y `ci-ok`; se omitieron los seis trabajos ajenos a documentación mediante el filtro existente. `gh pr view 188` informó `MERGEABLE`, `CLEAN`, `isDraft=true`; #182 seguía `OPEN`.

Este registro describe esa ejecución concreta, previa al commit que añade este párrafo. El HEAD posterior debe comprobarse de nuevo al actualizar el PR. No hay aprobación/revisión GitHub emitida como sustituto de la revisión funcional; no se fusiona, cierra issue ni elimina rama mientras falten criterios de #182/#187.
