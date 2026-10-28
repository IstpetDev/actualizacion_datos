# Verificación — Issue #140

Ambiente: pruebas unitarias locales (Vitest para frontend, xUnit para backend). Datos ficticios.

1. Seleccionar provincia, cantón y parroquia -> guardar -> verificar que `guardarFichaPersonal` envía `parroquiaResidenciaId` y la recarga conserva los tres campos desde el primer intento (RF-PAR-001).
2. Cambiar provincia o cantón tras tener parroquia seleccionada -> verificar que la parroquia se invalida de forma visible con mensaje de error claro (RF-PAR-002).
3. Backend: comprobar persistencia y consulta exitosa de `ParroquiaResidenciaId` en la ficha personal (RF-PAR-003).
