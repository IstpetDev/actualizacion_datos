# Spec-0014 — Gestión de políticas y avisos de protección de datos en panel superadmin

- **Estado:** Aprobado (2026-10-28)
- **Iniciativa:** Issue #120
- **Áreas:** Backend (.NET 10), Frontend (Angular 22), OpenAPI

## 1. Contexto y Problema

Conforme a `ADR-0030` y `ADR-0034`, el sistema exige que todo usuario con rol institucional (`Usuario`, `Supervisor`, `Admin`) acepte el aviso de protección de datos personales institucional vigente al iniciar sesión.

Sin embargo:
1. La única vía existente para publicar un aviso (`AvisoProteccionDatos`) era mediante el CLI `--publicar-aviso <archivo.json>` durante el arranque del backend o en consola de servidor.
2. En la interfaz web del rol superadmin (`/superadmin`), no existía una sección para gestionar ni publicar la política o aviso legal por institución.
3. Al crear una nueva institución desde el panel global, sus usuarios quedaban imposibilitados de acceder recibiendo `AVISO_PROTECCION_DATOS_NO_DISPONIBLE` hasta que un operador accediera al servidor.

## 2. Requisitos Funcionales

- **RF-SUP-001 (Consulta de avisos institucionales):**
  - Un usuario autenticado con rol `Superadmin` puede consultar el listado histórico y estado de vigencia de los avisos de protección de datos de cualquier institución registrada.
  - La respuesta detalla: `id`, `institucionId`, `version`, `titulo`, `responsable`, `contenido`, `declaracionAceptacion`, `fuenteOficial`, `evidenciaAprobacion`, `rolesDestinatarios`, `vigenteDesdeUtc`, `vigenteHastaUtc` y el indicador calculado `esVigente`.
- **RF-SUP-002 (Publicación de avisos institucionales):**
  - El superadmin puede publicar una nueva versión del aviso para la institución seleccionada mediante `POST /api/superadmin/instituciones/{id}/avisos-proteccion-datos`.
  - Debe validar:
    - `aprobacionInstitucionalConfirmada == true`.
    - Unicidad de la versión para la institución.
    - Que no sea un aviso ya vencido (`vigenteHastaUtc <= UtcNow`).
    - Fuente oficial HTTPS válida sin credenciales.
    - Roles destinatarios institucionales indicados.
    - Sustitución ordenada del aviso anterior que cubra los mismos roles, cerrando su vigencia al inicio del nuevo.
- **RF-SUP-003 (Auditoría de publicación):**
  - La publicación registra un evento de auditoría con actor (documento/identidad del superadmin) y detalle de la versión publicada.
- **RF-SUP-004 (Autorización y aislamiento):**
  - Las operaciones de consulta y publicación en `/api/superadmin/instituciones/{id}/avisos-proteccion-datos` requieren autenticación y rol `Superadmin`. Usuarios con roles `Admin`, `Supervisor` o `Usuario` reciben `403 Forbidden`.
- **RF-SUP-005 (Interfaz en Panel Superadmin):**
  - Pestaña «Políticas de Protección de Datos» en el panel `/superadmin`.
  - Selector de institución con búsqueda o filtrado.
  - Indicador visual del estado: aviso vigente (con versión, roles y vigencia) o advertencia de «Pendiente de publicación».
  - Historial de avisos registrados para la institución.
  - Formulario reactivo completo de publicación con todos los campos requeridos y validación de aprobación institucional.
  - Mensajes claros de éxito y de error.

## 3. Criterios de Aceptación

- [x] Acceso restringido a cuentas con rol `Superadmin`.
- [x] El superadmin puede seleccionar cualquier institución y ver si tiene aviso vigente o si está pendiente.
- [x] Al publicar con datos válidos, se persiste en base de datos vinculado a la institución y sustituye la vigencia previa si correspondía.
- [x] Los usuarios institucionales (`Usuario`, `Supervisor`, `Admin`) pueden iniciar sesión y aceptar el aviso una vez publicado.
- [x] Rechazo con error claro ante versiones repetidas o sin confirmación institucional.
- [x] Cobertura con pruebas unitarias e integración en backend y pruebas de componentes en frontend.
- [x] Compilación limpia, formato y pruebas pasando.
