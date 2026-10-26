# ADR-0015 — Despliegue dividido en etapas

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

El [ADR-0011](ADR-0011-despliegue-a-produccion.md) definió el despliegue automático, pero `deploy.yml` lo ejecutaba todo en un único job: construcción, transferencia, migraciones, actualización, smoke tests y limpieza. Eso dificulta ver en qué fase falló un despliegue (el primer fallo real fue en migraciones, tras 4 minutos de construcción y transferencia), impide reintentar solo una fase y mezcla fases que no necesitan los secretos del servidor con las que sí.

## Opciones

1. **Mantener un solo job:** simple, pero opaco y sin reintento parcial.
2. **Un job por fase con una acción compuesta local para la conexión:** cada fase es visible y reintentable por separado; la conexión (Tailscale + SSH) no se duplica.
3. **Workflows reutilizables (`workflow_call`) por fase:** más separación, pero añade archivos y complejidad que no se justifican con un solo entorno.

## Decisión

Se adopta la opción 2. `deploy.yml` pasa a: `construir` -> `transferir` -> `migrar` -> `desplegar` -> `verificar` -> `limpiar`, encadenados con `needs`.

1. **`construir`** usa una matriz (`backend`, `frontend`) y **no recibe secretos**: construye, empaqueta con `docker save | gzip` y publica la imagen como artefacto (retención de 1 día). Los dos servicios se construyen en paralelo.
2. **`transferir`** descarga los artefactos, los carga en el Docker del servidor por SSH y sincroniza `docker-compose.prod.yml` y la configuración de Nginx.
3. **`migrar`** ejecuta `--migrar` (ADR-0011, punto 6). Si falla, `desplegar` no se ejecuta y los contenedores productivos no se tocan.
4. **`desplegar`** levanta la versión con la etiqueta del SHA; **`verificar`** comprueba `/health`.
5. **`limpiar`** corre con `always()` salvo que nunca se haya transferido nada.
6. La conexión a Tailscale y la configuración de SSH viven en la acción compuesta local `.github/actions/conectar-servidor`.
7. Las etapas que tocan el servidor usan el environment `produccion` (de ahí salen los secretos). La concurrencia `deploy-produccion` se mantiene a nivel de workflow.
8. Se mantiene el mecanismo de distribución del ADR-0011 (sin registro de imágenes); el artefacto de GitHub es solo el transporte entre jobs, ya que cada job corre en un runner distinto.

## Consecuencias

- Cada fase se ve por separado en la interfaz y puede relanzarse con "Re-run failed jobs".
- Cada etapa con acceso al servidor abre su propia conexión Tailscale (unos segundos extra por etapa).
- Si en el environment `produccion` se activan revisores requeridos, GitHub pedirá aprobación en cada job que lo use, no una sola vez.
- `rollback.yml` no cambia en este ADR.

## ADR relacionados

- [ADR-0011](ADR-0011-despliegue-a-produccion.md) — Despliegue automático a producción (se mantiene vigente; este ADR solo reorganiza el pipeline).
- [ADR-0005](ADR-0005-ci-por-niveles.md) — CI por niveles.
