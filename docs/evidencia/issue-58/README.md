# Issue #58 / PR #59 — Paleta Institucional AMMI y Visibilidad de Contraseñas

**Issue:** #58 · **Pull Request:** #59  
**Rama:** `feature/58-paleta-colores-ammi` · **Base:** `develop`  
**Fecha:** 2026-10-23  

---

## 1. Contexto y Objetivos

El sistema requería alinear su identidad visual con los estándares institucionales de la **Academia Militar General Miguel Iturralde (AMMI)** y optimizar la experiencia de usuario (UX) en el acceso y cambio de credenciales.

### Objetivos principales
1. **Identidad Institucional Oficial:** Implementar de forma centralizada la paleta de colores oficial extraída del escudo y portal AMMI (amarillo corporativo y negro institucional).
2. **Modernización de UI:** Adoptar una estética limpia inspirada en el sistema de diseño Vercel (superficies neutras, bordes sutiles, microinteracciones rápidas y tipografía con buen contraste).
3. **Visibilidad de Contraseñas («Ojito»):** Proveer a los usuarios la capacidad de verificar lo que escriben al ingresar o actualizar sus credenciales, evitando errores de tipeo y reduciendo bloqueos de cuenta.

---

## 2. Decisiones Técnicas y «El Porqué de las Cosas»

### A. Paleta de Colores Institucional AMMI
- **¿Por qué?** La aplicación contaba previamente con estilos neutros/provisionales sin relación con la identidad gráfica del instituto. Tras el análisis pixel a pixel del escudo institucional, se identificaron los colores heráldicos normativos.
- **Tokens definidos en `styles.css`:**
  - `--ammi-primary`: `#1D1E1C` (Negro carbón institucional para textos dominantes, botones de acción principal y encabezados).
  - `--ammi-gold`: `#FCEA1E` (Amarillo oro institucional para acentos, bordes superiores de tarjetas, estados de foco y resaltado interactivo).
  - `--ammi-gold-hover`: `#E5D415` (Variación accesible para interacción).
  - `--ammi-surface`: `#FFFFFF` / `--ammi-surface-subtle`: `#F9FAFB` (Superficies de alto contraste que garantizan legibilidad).
  - `--ammi-danger`: `#DC2626` / `--ammi-danger-bg`: `#FEF2F2` (Manejo de errores y alertas semánticas).

### B. Sistema Visual Estilo Vercel
- **¿Por qué?** Proporciona máxima legibilidad, densidad de información óptima y un diseño atemporal sin sobrecargar la interfaz. Se adoptaron bordes nítidos (`#EAEAEA`), radios redondeados consistentes (`6px` a `8px`) y sombras tenues con elevación (`box-shadow`).

### C. Visor de Contraseñas («Ojito»)
- **¿Por qué?**
  - Al cambiar o escribir contraseñas (especialmente en móviles o con requisitos de complejidad como mínimo 8 caracteres), los usuarios cometen errores involuntarios difíciles de detectar en campos enmascarados con asteriscos/puntos.
  - Ofrece retroalimentación visual inmediata antes de enviar el formulario.
- **Accesibilidad y Compatibilidad:**
  - El botón utiliza `type="button"` para evitar envíos no deseados del formulario.
  - Incorpora atributos `aria-label` y `title` dinámicos (*«Mostrar contraseña»* / *«Ocultar contraseña»*) para lectores de pantalla.
  - Se añadieron reglas CSS para suprimir el icono nativo de contraseñas de Microsoft Edge/Chromium (`input::-ms-reveal, input::-ms-clear { display: none; }`), evitando que dos iconos de ojo se superpongan en navegadores bajo Windows.
  - El botón se desactiva automáticamente si el formulario o `fieldset` está bloqueado durante peticiones HTTP en curso.

---

## 3. Archivos Afectados

| Archivo | Responsabilidad |
|---|---|
| `src/Frontend/src/styles.css` | Definición de tokens institucionales AMMI y variables de diseño estilo Vercel. |
| `src/Frontend/src/app/layout/main-layout/main-layout.component.css` | Barra de navegación superior, acentos dorados y estados de sesión. |
| `src/Frontend/src/app/features/usuario/usuario-dashboard.component.css` | Tableros, estados de campaña y botones con paleta institucional. |
| `src/Frontend/src/app/features/auth/formulario-acceso.css` | Tarjetas de acceso con acento superior oro, inputs y estilos de `.campo-clave` / `.btn-ojo`. |
| `src/Frontend/src/app/features/auth/login.component.ts` | Integración del visor de contraseña con señal reactiva e icono SVG. |
| `src/Frontend/src/app/features/auth/cambiar-clave.component.ts` | Integración del visor de contraseña para los 3 campos (actual, nueva, confirmación). |
| `src/Frontend/src/app/features/auth/login.component.spec.ts` | Pruebas unitarias de visibilidad y accesibilidad para el login. |
| `src/Frontend/src/app/features/auth/cambiar-clave.component.spec.ts` | Pruebas unitarias de visibilidad y accesibilidad para el cambio de clave. |

---

## 4. Verificación y Calidad

| Comprobación | Herramienta | Resultado |
|---|---|---|
| Pruebas Unitarias Frontend | Vitest (`pnpm --dir src/Frontend test:ci`) | ✅ 173 pruebas aprobadas (27 archivos) |
| Linter Frontend | ESLint (`pnpm --dir src/Frontend lint`) | ✅ 0 errores, 0 advertencias |
| Formateo de Código | Prettier (`pnpm --dir src/Frontend format`) | ✅ Verificado y formateado |
| CI GitHub Actions | Workflow en PR #59 | ✅ CI en verde (`ci-ok`) |
