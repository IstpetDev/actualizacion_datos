# ADR-0044 — Reglas vacacionales por institución y régimen

- **Estado:** Vigente
- **Fecha:** 2026-11-10
- **Cerrado:** 2026-11-10, por @bryancito1090 (quien desarrolla) en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) para el alcance Modo A.

## Contexto

[#183](https://github.com/IstpetDev/actualizacion_datos/issues/183) requiere reglas por institución y vínculo; [spec-0022 v0.2](../specs/spec-0022/spec.md) delimita Entrega 1 a Modo A y exige confirmación institucional de fuentes, cláusulas y facultades antes de activar cada institución. El legado usa reglas fijas y dedicaciones reconocidas por texto; no constituye validación legal. Los documentos emitidos deben explicar la versión aplicada sin cambiar al actualizar una regla.

No se propone cantidad de días, porcentaje, acumulación ni exclusión jurídica de personal parcial en código ni en migraciones. Aprobación funcional, confirmación jurídica por institución y elección técnica quedan separadas y trazadas.

## Opciones

1. Configuración tipada, versionada y con vigencia por institución/régimen, asignada al vínculo/episodio; servicios que consuman solo parámetros confirmados. Facilita validación y trazabilidad; exige gobernar configuraciones e intervalos incompatibles.
2. Estrategias específicas por régimen en código, con asignación institucional y parámetros confirmados/versionados. Separa reglas estructuralmente distintas, pero sus cambios requieren despliegue y revisión.
3. Motor externo de reglas versionadas con aprobación. Más expresivo; añade operación, dependencias y controles aún no justificados en Entrega 1.

Copiar constantes del legado o una regla universal no es alternativa admisible por #182. Todas las opciones deben respetar aislamiento y bloqueo de parámetros desconocidos.

## Decisión

Se adopta la **Opción 1 (configuración tipada, versionada y con vigencia por institución)** acotada al alcance de **Modo A (`ACTA_SIN_SALDO`)** en Entrega 1:

1. **Entidades de dominio:** Se definen `MarcoVacacional` y `FacultadVacacional` aisladas por `InstitucionId` (ADR-0004). Cada revisión confirmada de `MarcoVacacional` conserva identificador de régimen/marco, fuente normativa o contractual, texto/cláusula legal de plantilla aprobada, vigencia (`FechaInicioVigencia`, `FechaFinVigencia` opcional), referencia de custodia documental, actor y fecha de confirmación.
2. **Activación institucional explícita (fallo seguro):** Ninguna institución nace habilitada ni recibe semillas de valores legales (Código del Trabajo, LOEI, LOSEP ni políticas). Mientras la institución permanezca en estado `PENDIENTE_CONFIRMACION` o carezca de delegación activa, el sistema permite únicamente conservar borradores y bloquea la emisión y verificación de actas (`409` / `403` según corresponda).
3. **Permisos por delegación explícita:** Ningún rol técnico (`usuario`, `supervisor`, `admin`, `superadmin`) otorga por sí solo permisos operativos de vacaciones. `FacultadVacacional` registra por institución y persona las facultades activas (`PREPARAR_EMITIR`, `ENTREGAR`, `VERIFICAR_FIRMA`, `ANULAR_RECTIFICAR`, `CONSULTAR_ARCHIVO`), con vigencia y respaldo de designación.
4. **Inmutabilidad histórica:** Actualizar la fuente o cláusula del marco institucional genera una nueva revisión numerada y no altera las actas ya emitidas (`VersionActaVacaciones`), que conservan en su instantánea la revisión vigente al momento de emisión. Los intervalos superpuestos incompatibles se rechazan con `409`.
5. **Diferimiento de fórmulas de Modo B:** Los parámetros numéricos de devengo, antigüedad, feriados automáticos, empalmes y prelación de bolsas quedan diferidos hasta una futura aprobación de Modo B; en Entrega 1 el servidor rechaza cualquier solicitud de cálculo automático de saldo.

## Consecuencias

- Las tareas dependientes de Entrega 1 (`T-MAR-01`, `T-MAR-02` e issues [#190](https://github.com/IstpetDev/actualizacion_datos/issues/190)–[#195](https://github.com/IstpetDev/actualizacion_datos/issues/195)) quedan desbloqueadas técnicamente bajo el contrato congelado en [spec-0022/plan.md](../specs/spec-0022/plan.md).
- Cada institución mantiene bloqueada la emisión/verificación en tiempo de ejecución hasta que TH/Jurídico/Autoridad registre su marco y facultades con referencia de custodia, sin inferir valores legales ni sembrar parámetros por defecto.
- No se incorpora paquete ni servicio externo nuevo.

## ADR relacionados

- [ADR-0001 — Vigente, Clean Architecture](ADR-0001-clean-architecture-backend.md).
- [ADR-0004 — Vigente, multitenancia](ADR-0004-multitenancia-esquema-unico.md).
- [ADR-0045 — Vigente, corte histórico y Modo A sin saldo](ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md).
- [ADR-0046 — Vigente, PDF inmutable y verificación física](ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md).

## Revisión documental para #187 y cierre en #189

Revisado inicialmente el 2026-11-10 para #187 y cerrado como **Vigente** el 2026-11-10 en [#189](https://github.com/IstpetDev/actualizacion_datos/issues/189) ([evidencia E0](../evidencia/issue-189/README.md)) por decisión expresa de quien desarrolla para Entrega 1 en Modo A.
