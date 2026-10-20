# Plantilla de spec

Esta carpeta contiene las cuatro plantillas de una spec. **No se edita para una spec concreta.**

| Archivo | Cuándo se usa |
|---|---|
| [`spec.md`](spec.md) | Siempre, al empezar. Es lo único que se crea con «crea un spec». |
| [`plan.md`](plan.md) | Tras la aprobación funcional de `spec.md`. |
| [`tasks.md`](tasks.md) | Tras `plan.md`. |
| [`test-e2e.md`](test-e2e.md) | Tras `plan.md`, antes de implementar. |

## Uso

```bash
cp -r docs/specs/_plantilla docs/specs/spec-NNNN
rm docs/specs/spec-NNNN/README.md
```

Después, conservar en `spec-NNNN/` solo `spec.md` hasta que la spec esté aprobada; los otros tres se completan en las fases siguientes. Ver el flujo completo en [../README.md](../README.md).

## Reglas

- Texto en español; datos de ejemplo solo ficticios (`0000000000`, `usuario@ejemplo.test`).
- Cada requisito tiene un ID único con prefijo de área (`RF-ACC-001`) y se escribe como «Dado / cuando / el sistema».
- Las decisiones de arquitectura se citan por su ADR en `docs/decisiones/`; si el ADR está Propuesto, es un punto abierto.
- No hay una persona fija como responsable funcional: cada spec registra quién revisa y aprueba su versión.
