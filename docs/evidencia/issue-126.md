# Issue #126 — Evidencia de resolución: evitar que módulos deshabilitados bloqueen el envío de la hoja de vida

- **Fecha:** 2026-10-28
- **Rama:** `fix/126-modulos-deshabilitados-envio-hoja-de-vida` (hacia `develop`)
- **Issue:** #126 (`fix: evitar que modulos deshabilitados bloqueen el envio de la hoja de vida`)
- **Asignado:** @AnthonyPilatasig

---

## 1. Contexto y Causa Raíz

Cuando una institución mantiene cerrados o deshabilita ciertos módulos de la hoja de vida (mediante fases en `/admin/configuracion` según spec-0010 y ADR-0028), el envío a revisión del expediente del funcionario quedaba bloqueado por tres causas principales:

1. **Evaluación de reglas y formatos sin filtro de secciones abiertas en Backend:**
   - En `ValidadorCompletitudEnvio.ValidarAsync`, reglas con `regla.Seccion == null` (como `ReglaFormatosHojaDeVida`) evaluaban la ficha personal sin verificar si estaba en `abiertas`.
   - Si una regla generaba faltantes asociados a subsecciones (`titulos`, `titulos-en-curso`, `experiencias`), `CodigosSeccion.IntentarParsear` no las mapeaba a su sección general, impidiendo el filtrado post-evaluación.
2. **Precondición residual de verificación de correo en `ServicioDatosUsuario.EnviarARevisionAsync`:**
   - Se requería `persona.CorreoVerificado` proveniente de la verificación por código del dashboard antiguo, widget que ya no existe en `HojaDeVidaComponent`.
   - Adicionalmente, si la persona fue cargada sin correo en `Persona`, pero completó su `CorreoInstitucional` en `FichaPersonal`, no se sincronizaba antes de la validación del dominio.
3. **Validación frontend indiferente a secciones deshabilitadas:**
   - En `ValidacionHojaDeVidaService`, el método `hayErrores()` comprobaba indiscriminadamente todos los formularios registrados en el mapa interno, sin discriminar si pertenecían a secciones habilitadas en `seccionesAbiertas()`.
   - En `HojaDeVidaComponent`, los botones de envío se deshabilitaban si un módulo cerrado reportaba errores de formulario.

---

## 2. Solución Implementada

### Backend (`Istpet.ActualizacionDatos.Infrastructure` y `Application`)
1. **Mapeo completo en `CodigosSeccion.IntentarParsear`:**
   - Se agregaron alias y subclaves como `"titulos"`, `"titulos-en-curso"` (mapeadas a `SeccionHojaDeVida.FormacionAcademica`), `"experiencias"` (a `SeccionHojaDeVida.ExperienciaLaboral`), `"capacitacion"` (a `SeccionHojaDeVida.Capacitaciones`), `"documentos-personales"`, `"documento"` (a `SeccionHojaDeVida.DocumentosPersonales`) y `"cuenta"` (a `SeccionHojaDeVida.CuentaBancaria`).
2. **Filtrado defensivo en `ValidadorCompletitudEnvio.ValidarAsync`:**
   - Omite la ejecución de reglas pertenecientes a secciones cerradas (`regla.Seccion.HasValue && !abiertas.Contains(...)`).
   - Realiza un post-filtrado estricto sobre todos los `FaltanteEnvioDto` devueltos por cualquier regla general, descartando los que pertenezcan a secciones cerradas (`CodigosSeccion.IntentarParsear(f.Seccion, out var sec) && !abiertas.Contains(sec)`).
3. **Aislamiento en `ReglaFormatosHojaDeVida`:**
   - La revisión de formatos de la ficha personal ahora verifica explícitamente `if (abiertas.Contains(SeccionHojaDeVida.FichaPersonal))`.
4. **Saneamiento en `ServicioDatosUsuario.EnviarARevisionAsync` y `ServicioHojaDeVida`:**
   - Se retiró la comprobación `if (!persona.CorreoVerificado)`.
   - Se sincroniza `persona.Correo` desde `ficha.CorreoInstitucional` cuando la persona carece de correo asignado, asegurando la consistencia en el dominio al enviar a revisión.

### Frontend (`src/Frontend`)
1. **Normalización y filtrado en `ValidacionHojaDeVidaService`:**
   - Se implementaron las funciones `normalizarCodigoSeccion` y `estaSeccionAbierta`.
   - Se añadió la señal `seccionesAbiertas` y el método `actualizarSeccionesAbiertas`.
   - `hayErrores(seccionesAbiertas?: string[])` ignora los formularios registrados pertenecientes a secciones deshabilitadas.
2. **Integración en `HojaDeVidaComponent`:**
   - Se sincronizan las secciones activas en el servicio de validación reactivamente.
   - Se implementó `hayErrores(): boolean` utilizando las secciones abiertas computadas.
   - Los botones de envío superior e inferior y el modal de cambios sin guardar evalúan únicamente los errores de los módulos abiertos.

---

## 3. Pruebas y Verificación

### Backend (.NET 10 en Docker)
```bash
docker run --rm -v "${PWD}:/origen" -w /origen mcr.microsoft.com/dotnet/sdk:10.0 dotnet test src/Backend --filter "Categoria!=Integracion"
```
- **Resultado:**
  - `Domain.Tests`: 125 pasados (0 fallos).
  - `Application.Tests`: 134 pasados (0 fallos).
  - `WebApi.Tests`: 398 pasados (0 fallos).
  - **Total:** 657 pruebas pasadas exitosamente.
  - Nuevas pruebas integradas en `SeccionesTests.cs`:
    - `Envio_revision_exitoso_cuando_solo_ficha_personal_esta_habilitada`: valida que con todas las secciones complementarias cerradas (formación, capacitaciones, experiencia, referencias, documentos, cuenta bancaria), el usuario completa su ficha personal y envía a revisión exitosamente con HTTP 200 y transición a estado `Enviado`.
    - `Envio_revision_sincroniza_correo_institucional_de_ficha_si_persona_carecia_de_correo`: valida la sincronización automática del correo institucional ingresado en la ficha hacia la entidad `Persona`.

### Frontend (Angular 22 / Vitest)
```bash
pnpm --dir src/Frontend test:ci
```
- **Resultado:**
  - 41 archivos de prueba ejecutados.
  - 435 pruebas pasadas (0 fallos).
  - Nuevas pruebas integradas:
    - `validacion-hoja-de-vida.service.spec.ts`: `hayErrores_omite_formularios_de_secciones_deshabilitadas`.
    - `hoja-de-vida.component.spec.ts`: `hayErrores_no_bloquea_envio_si_los_errores_pertenecen_a_modulos_deshabilitados` y `hayErrores_bloquea_envio_si_el_modulo_abierto_tiene_errores`.

### Linters y Formateo
```bash
pnpm --dir src/Frontend lint
pnpm --dir src/Frontend format
docker run --rm -v "${PWD}:/origen" -w /origen mcr.microsoft.com/dotnet/sdk:10.0 dotnet format src/Backend
```
- Todos los archivos pasaron el linter de Angular (`All files pass linting.`) y el formateador Prettier / dotnet format.

### Validación de Política de Ramas
```bash
sh .github/scripts/validar-rama.sh develop fix/126-modulos-deshabilitados-envio-hoja-de-vida "fix: evitar que modulos deshabilitados bloqueen el envio de la hoja de vida"
```
- **Resultado:** `Política de ramas cumplida: 'fix/126-modulos-deshabilitados-envio-hoja-de-vida' -> 'develop', título 'fix: evitar que modulos deshabilitados bloqueen el envio de la hoja de vida'.`
