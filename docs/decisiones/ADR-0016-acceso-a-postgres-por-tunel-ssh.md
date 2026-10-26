# ADR-0016 — Acceso a PostgreSQL de producción por túnel SSH

- **Estado:** Vigente
- **Fecha:** 2026-10-26

## Contexto

En producción el servicio `postgres` solo vive en la red interna de Docker, por lo que no hay forma de inspeccionar la base con un cliente SQL (p. ej. DBeaver) sin entrar al contenedor. El servidor es accesible únicamente por Tailscale y SSH ([ADR-0011](ADR-0011-despliegue-a-produccion.md)).

## Opciones

1. **Sin puerto publicado, solo `docker exec ... psql`:** no abre nada, pero no permite clientes gráficos.
2. **Publicar el puerto en todas las interfaces:** expone la base a la red; descartado.
3. **Publicar el puerto solo en loopback (`127.0.0.1`) y conectar por túnel SSH:** la base sigue inaccesible desde la red; el cliente entra por el SSH ya existente.

## Decisión

Se adopta la opción 3. `docker-compose.prod.yml` publica `127.0.0.1:${PUERTO_POSTGRES:-5433}:5432` en `postgres`. Se usa 5433 para no chocar con una instalación local de PostgreSQL en el servidor. El cliente SQL se configura con host `127.0.0.1`, puerto 5433 y la pestaña "SSH Tunnel" hacia el servidor. Las credenciales siguen solo en el `.env` del servidor.

## Consecuencias

- Quien tenga acceso SSH al servidor y las credenciales de la base puede consultarla; no se amplía la superficie hacia la red.
- Cambiar el puerto requiere definir `PUERTO_POSTGRES` en el `.env` del servidor.
- Al desplegar, `postgres` se recrea para aplicar el puerto (los datos persisten en el volumen `postgres-datos`).

## ADR relacionados

- [ADR-0011](ADR-0011-despliegue-a-produccion.md) — Despliegue automático a producción.
