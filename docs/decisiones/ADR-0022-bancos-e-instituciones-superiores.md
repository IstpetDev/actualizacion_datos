# ADR-0022 — Bancos e instituciones de educación superior

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

Spec-0004 v0.2 aprobada pide bancos con fuente oficial y completar las IES sin perder las 64 universidades existentes ni «Otra institución». Las fuentes publican organizaciones, no datos de sus clientes o representantes.

## Opciones

1. Agregar enums y contratos por clase de institución: cambia API y formularios sin necesidad.
2. Usar los catálogos existentes y conservar la entrada escrita para organizaciones no incluidas.

## Decisión

Opción 2, aprobada en esta conversación con spec v0.2. `Banco.csv` usa los tres grupos del catastro público de la Superintendencia de Bancos. Sus códigos `SB_...` son claves técnicas propias estables, sin presentarlas como identificadores oficiales. Si el recurso no publica códigos oficiales, `codigo_externo` queda vacío. No se incluye el catastro de cooperativas de la SEPS; se conserva otro banco por nombre (ADR-0013).

`InstitutosSuperiores.csv` normaliza los listados públicos y particulares del CES. Se importa como `Universidad`, después de País y del CSV de las 64 universidades. Se conservan códigos oficiales, país Ecuador `218` y códigos externos; una colisión o discrepancia de códigos impide generar una entrada ambigua. No se inventan equivalencias con talento humano. Se mantiene «Otra institución» para el extranjero y las IES ausentes.

Los hashes, cantidades, fecha y transformaciones se registran en `fuentes.json` y en el README. Los CSV son instantáneas del directorio oficial; no certifican vigencia de programas o títulos. No se versiona información de personas contenida en otras secciones de las fuentes.

## Consecuencias

No hay migración de esquema, nuevo tipo de catálogo ni contrato HTTP nuevo. Las importaciones conservan ids. Dos archivos alimentan `Universidad`; cada uno conserva su trazabilidad y las entradas ausentes del otro. Sus órdenes pueden coincidir y las consultas desempatan por código, como ya hace el servicio.

## ADR relacionados

- ADR-0010 — Catálogos compartidos.
- ADR-0013 — Banco de catálogo o escrito.
- ADR-0021 — Carga en producción.
