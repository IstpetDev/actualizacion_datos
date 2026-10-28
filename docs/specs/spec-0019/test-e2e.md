# Pruebas End-to-End / Aceptación — spec-0019

1. **Retiro rechazado sin motivo:**
   - Intentar retirar adjunto sin ingresar motivo. La interfaz deshabilita el botón de confirmación y la API responde 400 Bad Request.
2. **Retiro exitoso por supervisor:**
   - Supervisor ingresa motivo válido y confirma el retiro.
   - El archivo se elimina de `archivos_adjuntos` y el `.bin` se borra del disco.
   - Se crea registro en `Auditorias` con detalle del motivo y hash del archivo.
   - La lista del expediente ya no muestra el adjunto.
3. **Aislamiento por institución:**
   - Supervisor de una institución no puede retirar adjuntos de otra institución.
