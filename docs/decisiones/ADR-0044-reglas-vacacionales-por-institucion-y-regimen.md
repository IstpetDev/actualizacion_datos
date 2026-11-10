# ADR-0044 — Reglas vacacionales por institución y régimen

- **Estado:** Propuesto
- **Fecha:** 2026-11-10

## Contexto

[#183](https://github.com/IstpetDev/actualizacion_datos/issues/183) requiere reglas por institución y vínculo; [spec-0022 v0.1](../specs/spec-0022/spec.md) mantiene parámetros y fuentes pendientes de TH/Jurídico. El legado usa reglas fijas y dedicaciones reconocidas por texto; no constituye validación legal. Los documentos emitidos deben explicar la versión aplicada sin cambiar al actualizar una regla.

No se propone cantidad de días, porcentaje, acumulación ni exclusión jurídica de personal parcial. Aprobación funcional, confirmación jurídica y elección técnica son decisiones distintas.

## Opciones

1. Configuración tipada, versionada y con vigencia por institución/régimen, asignada al vínculo/episodio; servicios que consuman solo parámetros confirmados. Facilita validación y trazabilidad; exige gobernar configuraciones e intervalos incompatibles.
2. Estrategias específicas por régimen en código, con asignación institucional y parámetros confirmados/versionados. Separa reglas estructuralmente distintas, pero sus cambios requieren despliegue y revisión.
3. Motor externo de reglas versionadas con aprobación. Más expresivo; añade operación, dependencias y controles aún no justificados en Entrega 1.

Copiar constantes del legado o una regla universal no es alternativa admisible por #182. Todas las opciones deben respetar aislamiento y bloqueo de parámetros desconocidos.

## Decisión

**Pendiente.** Quien desarrolla debe elegir tras revisión funcional. TH/Jurídico confirma fuente, ámbito y valores; este ADR no sustituye esa validación. Se propone estudiar primero configuración tipada por su alcance acotado, sin adoptarla todavía.

Antes de tareas dependientes: resolver versión/vigencia, conflictos de asignación, origen/responsable de parámetros, bloqueo de reglas incompletas, conservación de la regla aplicada y cambios retroactivos. Este documento no habilita implementación ni cierra preguntas de spec-0022.

## Consecuencias

Una solución versionada permite explicar cálculos y preservar documentos, con más trabajo de configuración/certificación y pruebas de aislamiento, vigencia y concurrencia. Un motor genérico no convierte fuentes antiguas en derecho vigente. Hasta decidir, las tareas dependientes siguen bloqueadas; no se incorpora paquete ni servicio nuevo.

## ADR relacionados

- [ADR-0001 — Vigente, Clean Architecture](ADR-0001-clean-architecture-backend.md).
- [ADR-0004 — Vigente, multitenencia](ADR-0004-multitenancia-esquema-unico.md).
- [ADR-0045 — Propuesto, corte histórico](ADR-0045-corte-historico-y-saldo-certificado-vacaciones.md).
- [ADR-0046 — Propuesto, PDF y verificación física](ADR-0046-pdf-inmutable-y-verificacion-fisica-vacaciones.md).
