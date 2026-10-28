# Plan — Gestión de personal institucional

Spec v0.1 y ADR-0038, alcance autorizado en el pedido de #129.

1. Agregar operación de dominio para asignar Admin/Supervisor y proteger Superadmin. Añadir contratos y métodos al servicio institucional existente, con validación, alcance y guardado atómico de auditoría. Reutilizar desde la asignación previa de admins (RF-ROL-001 a 004).
2. Mapear GET/POST global por institución y GET/POST de supervisores del admin, con políticas de rol. Proteger el grupo histórico de instituciones. Regenerar API y cliente (RF-ROL-001, 002, 006).
3. Crear un componente Angular compartido de listado y formulario; integrarlo en el panel global con selector institucional y en la pestaña Supervisores del admin. Cancelar cargas anteriores y evitar resultados cruzados al cambiar de institución (RF-ROL-005).
4. Probar dominio, HTTP con cookies reales y PostgreSQL migrado: creación, promoción, compatibilidad, rechazo de elevación, persistencia, auditoría y rollback. Probar ambas variantes UI y errores (RF-ROL-006).
5. Compilar y ejecutar suites completas, lint y formato, obtener capturas ficticias y registrar evidencia. PR a develop; CI del HEAD final, intento de aprobación, merge, cierre de #129 y eliminación de rama local/remota.

Sin dependencias nuevas ni cambios de esquema. Rutas: `Persona.cs`, `ModelosInstitucion.cs`, `IServicioInstituciones.cs`, `ServicioInstituciones.cs`, nuevo `PersonalInstitucionalEndpoints.cs`, paneles de superadmin/admin y nuevo componente compartido en `features/personal-institucional/`.
