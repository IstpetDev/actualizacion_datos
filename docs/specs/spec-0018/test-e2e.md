# Visibilidad de borradores y avance institucional para supervisores — Test E2E

**ID:** spec-0018; issue #143  
**Áreas:** `src/Backend`, `src/Frontend`

## 1. Ambiente y Datos Ficticios
- Institución A: `instAId`
- Supervisor A: Documento `1700000098`, rol `Supervisor`
- Persona 1 (Sin iniciar): Documento `1700000001`, rol `Usuario`, sin ficha ni secciones
- Persona 2 (Con borrador): Documento `1700000002`, rol `Usuario`, con ficha guardada
- Persona 3 (Enviada): Documento `1700000003`, rol `Usuario`, con ficha y enviada
- Institución B: `instBId`
- Supervisor B: Documento `1700000097`, rol `Supervisor`

## 2. Recorridos E2E

### Recorrido 1: Visualización de estados y avance en la bandeja
1. Iniciar sesión como Supervisor A y consultar `/api/revision/pendientes`.
2. Verificar que Persona 1 aparece con estado `Sin Iniciar`, 0 secciones y avance 0%.
3. Verificar que Persona 2 aparece con estado `Borrador` y avance > 0%.
4. Verificar que Persona 3 aparece con estado `Enviado` y avance 100%.

### Recorrido 2: Consulta de borrador y bloqueo de aprobación
1. Como Supervisor A, solicitar expediente de Persona 2 (`/api/revision/1700000002`).
2. La solicitud responde 200 OK con los datos parciales registrados.
3. Se verifica que en la tabla de auditoría existe el evento `ConsultaBorradorSupervisor`.
4. Como Supervisor A, intentar aprobar Persona 2 (`/api/revision/1700000002/aprobar`).
5. La solicitud responde 400 Bad Request indicando que no se puede aprobar un expediente en borrador.
6. Como Supervisor A, intentar devolver Persona 2 (`/api/revision/1700000002/devolver`).
7. La solicitud responde 400 Bad Request indicando que no se puede devolver un borrador.

### Recorrido 3: Aislamiento institucional
1. Como Supervisor B (de institución B), intentar consultar expediente de Persona 1 o Persona 2 de institución A.
2. La solicitud responde 404 Not Found.

