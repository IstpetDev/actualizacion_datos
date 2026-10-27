# Procedimiento de Restauración con Semilla Inicial de Base de Datos

Este documento describe la estructura y el procedimiento para restaurar o inicializar la base de datos de **Actualización de Datos** utilizando el volcado maestro idempotente `docs/seed_completo.sql`.

## Contenido de la Semilla (`docs/seed_completo.sql`)

El archivo contiene todas las inserciones necesarias con sentencias `INSERT INTO ... ON CONFLICT DO NOTHING`, lo que garantiza que pueda ejecutarse en bases de datos vacías o existentes sin provocar fallos de clave foránea ni duplicar registros.

### 1. Instituciones Base

Se registran las 3 instituciones académicas del sistema:

| ID de Institución | Nombre | Código / Slug |
|---|---|---|
| `a0000000-0000-0000-0000-000000000001` | Instituto Superior Tecnológico Nelson Torres (Matriz Traversari) | `traversari` |
| `a0000000-0000-0000-0000-000000000002` | Campus Chillogallo | `chillogallo` |
| `a0000000-0000-0000-0000-000000000003` | Sede Tumbaco | `tumbaco` |

### 2. Cuentas de Acceso Administrativas

- **Superadministrador Global:**
  - Documento: `0000000001`
  - Correo: `superadmin@istpet.edu.ec`
  - Rol: `Superadmin` (acceso transversal a todas las instituciones)
  - Clave inicial hash: PBKDF2-SHA256 (igual al documento)
  - `debe_cambiar_contrasena`: `true`

- **Administradores Institucionales:**
  - Los 2 administradores están vinculados a **las 3 instituciones**:
    1. Documento `1716750268` (Admin en Matriz, Chillogallo y Tumbaco)
    2. Documento `1719380337` (Admin en Matriz, Chillogallo y Tumbaco)
  - Rol: `Admin`
  - `acceso_habilitado`: `true`
  - `correo_verificado`: `true`
  - `debe_cambiar_contrasena`: `false`

### 3. Catálogos Oficiales de Ecuador (2.106 registros)

- **División Político Administrativa (DPA 2026 INEC):**
  - 24 Provincias
  - 221 Cantones
  - 1.048 Parroquias rurales y urbanas
- **Catálogo CINE UNESCO:** Niveles y campos de formación académica
- **Catálogo CES / Senescyt:** Universidades, Escuelas Politécnicas e Institutos Superiores Técnicos y Tecnológicos
- **Catálogo Financiero:** Bancos y cooperativas de ahorro y crédito del Ecuador
- **Tipos de Cuenta Bancaria:** Corriente, Ahorros

---

## Procedimiento de Ejecución / Restauración

### Caso A: Entorno Local (Docker Compose)

Si se recrea el volumen de la base de datos o se borra el contenedor:

1. Aplicar las migraciones de EF Core (si no se aplicaron automáticamente al arrancar la API):
   ```bash
   dotnet ef database update --project src/Backend/src/Istpet.ActualizacionDatos.Infrastructure --startup-project src/Backend/src/Istpet.ActualizacionDatos.WebApi
   ```
2. Ejecutar el script SQL dentro del contenedor de PostgreSQL:
   ```powershell
   Get-Content docs/seed_completo.sql -Raw | docker compose exec -T postgres psql -U postgres -d actualizacion_datos
   ```

### Caso B: Servidor Remoto / Producción (Túnel SSH o Conexión Directa)

Según el [ADR-0017](../decisiones/ADR-0017-acceso-a-postgres-por-tunel-ssh.md), el acceso a PostgreSQL se realiza mediante túnel SSH al puerto 5432:

1. Abrir el túnel SSH hacia el host de base de datos.
2. Ejecutar con el cliente `psql`:
   ```bash
   psql -h localhost -p 5432 -U postgres -d actualizacion_datos -f docs/seed_completo.sql
   ```
3. Verificar la carga ejecutando las consultas de conteo:
   ```sql
   SELECT 'instituciones' AS tabla, COUNT(*) FROM instituciones
   UNION ALL
   SELECT 'personas', COUNT(*) FROM personas
   UNION ALL
   SELECT 'catalogos', COUNT(*) FROM catalogos;
   ```

---

## Seguridad y Control de Versiones

- El archivo `docs/seed_completo.sql` contiene hashes de contraseñas de cuentas administrativas de despliegue, por lo que está explícitamente ignorado en `.gitignore` para evitar filtraciones en el repositorio público y alertas en escaneos de secretos (Gitleaks / GitHub Secret Scanning).
- La plantilla de datos y estructura de catálogos se mantiene también en formato CSV dentro de `data/catalogos/` para la inicialización automática del contenedor.
