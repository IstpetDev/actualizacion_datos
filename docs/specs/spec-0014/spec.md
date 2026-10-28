# Ejecución y organización de pruebas para agentes — Spec

**ID:** spec-0014\
**Versión:** 0.1\
**Estado:** Aprobado (v0.1, 2026-10-28)\
**Revisor funcional:** Solicitante\
**Fecha:** 2026-10-28\
**Áreas afectadas:** Guías de desarrollo y comandos locales de `src/Backend` y `src/Frontend`

## Problema y resultado esperado

Las personas y los agentes que desarrollan la aplicación ejecutan suites completas durante cambios pequeños. No hay una guía que indique cómo elegir pruebas de una clase o componente, dónde crear pruebas nuevas ni qué verificar antes de terminar. El resultado esperado es un ciclo local breve con pruebas pertinentes. La configuración actual de CI permanece intacta.

## Fuentes y decisiones vigentes

| Fuente | Ruta o enlace exacto | Regla o dato que aporta |
|---|---|---|
| Petición | Conversación del 2026-10-28 | Documentar ejecución selectiva local, organización de clases de prueba y pruebas por componente. Ante la aclaración, mantener CI actual. |
| Guía de agentes | `AGENTS.md`, «Comandos» y «Flujo de trabajo» | Exige compilar y probar antes de terminar; cambio nuevo requiere spec aprobada. |
| Guía de contribución | `CONTRIBUTING.md`, «CI» | Describe pruebas unitarias en `develop` e integración en `main`. |
| ADR | ADR-0005, Vigente, `docs/decisiones/ADR-0005-ci-por-niveles.md` | CI filtra por rutas; en PR a `develop` ejecuta unitarias, integración solo en `main` y semanalmente. Se conserva por aclaración del solicitante. |
| Comportamiento existente | `.github/workflows/ci.yml`; `src/Frontend/angular.json`; `src/Frontend/package.json` | La selección local no está automatizada. CI usa `dotnet test` con filtro de integración y `pnpm test:ci` sin filtro. |
| Pruebas existentes | `src/Backend/tests/`; `src/Frontend/src/app/**/*.spec.ts` | Backend tiene tres proyectos de prueba y clases `*Tests`; frontend tiene specs junto al código y por componente, servicio o guardia. |

**Confirmado:** la estructura y los comandos anteriores se comprobaron en `develop` local. La comprobación del remoto no fue posible por falta de resolución de `github.com`. **Decisión aclarada por el solicitante:** mantener CI actual; los comandos selectivos solo se usan localmente.

## Alcance

**Incluye:** instrucciones verificables para agentes y colaboradores sobre creación, ubicación, nombre y ejecución local de pruebas; ejemplos de selección por clase, método, componente, servicio y carpeta; condiciones para ampliar la selección; declaración explícita de la política de CI.\
**Excluye:** cambiar CI, lógica de negocio, borrar pruebas, dividir proyectos de producción, seleccionar automáticamente pruebas según `git diff`, añadir dependencias de test o cambiar reglas de GitHub.\
**Límites del proceso:** empieza al modificar código o pruebas y termina al entregar el cambio con resultados de compilación, pruebas locales y CI documentados.

## Requisitos verificables

| ID único | Condición y comportamiento observable | Prioridad de la fuente | Fuente |
|---|---|---|---|
| RF-PRU-001 | La guía de agentes distingue ejecución local selectiva del CI vigente; ningún comando local se incorpora a CI como filtro por módulo. | Alta | Petición |
| RF-PRU-002 | La guía muestra un comando .NET para un proyecto de pruebas, otro para una clase y otro para un método, con filtro explícito que excluye integración cuando no hay Docker. | Alta | Petición |
| RF-PRU-003 | La guía muestra comandos Angular para un archivo `.spec.ts` y para todos los specs de una carpeta funcional, con rutas relativas a `src/Frontend/src`. | Alta | Petición |
| RF-PRU-004 | Una prueba nueva de backend se ubica en `Domain.Tests` para reglas de dominio, `Application.Tests` para casos de uso o validación, y `WebApi.Tests` para HTTP, infraestructura o persistencia. Cada clase agrupa pruebas de una unidad o comportamiento y se nombra `*Tests`; un archivo `partial` puede ampliar la misma clase sin perder el filtro. Las pruebas que requieren PostgreSQL/Testcontainers llevan el trait `Categoria=Integracion`. No se exige dividir las clases existentes. | Alta | Estructura existente |
| RF-PRU-005 | Una prueba nueva de frontend vive junto al componente, servicio o guardia que verifica y usa el sufijo `.spec.ts`; cada archivo agrupa los escenarios de esa unidad y los nombres describen comportamiento observable. No se exige dividir los specs existentes. | Alta | Estructura existente |
| RF-PRU-006 | La guía indica ampliar la selección cuando cambian contratos, código compartido, configuración o infraestructura de pruebas, y registrar los comandos ejecutados y sus resultados reales. | Alta | `AGENTS.md` |
| RF-PRU-007 | El workflow y la ADR-0005 permanecen sin cambios; la documentación explica exactamente cuándo CI ejecuta unitarias e integración. | Alta | Aclaración del solicitante |
| RF-PRU-008 | Los comandos documentados se comprueban contra la versión de Angular y .NET del repositorio; un filtro que no encuentre pruebas no se presenta como ejecución satisfactoria. | Alta | Petición |

## Escenarios del proceso

### Escenario 1 — Cambio en una clase del backend

- **Actor y precondición:** Desarrollador o agente que modifica una clase y conoce su proyecto de pruebas.
- **Disparador:** Cambia un comportamiento de esa clase.
- **Secuencia:** Crea o actualiza pruebas en `*Tests`; ejecuta primero la clase pertinente, luego amplía a las pruebas del proyecto o la capa si hay efectos compartidos; compila y registra el resultado.
- **Resultado:** El cambio queda respaldado por pruebas pertinentes y comandos reproducibles.
- **Variantes y errores:** Si requiere PostgreSQL, usa el trait de integración y Docker; si el filtro devuelve cero pruebas, corrige el comando.

Ejemplo de selección por clase dentro de un proyecto, sin Docker:

```bash
dotnet test src/Backend/tests/Istpet.ActualizacionDatos.WebApi.Tests --filter 'FullyQualifiedName~Istpet.ActualizacionDatos.WebApi.Tests.CuentaBancariaTests.&Categoria!=Integracion'
```

### Escenario 2 — Cambio en un componente de Angular

- **Actor y precondición:** Desarrollador o agente que modifica un componente, servicio o guardia.
- **Disparador:** Cambia un comportamiento visible o una interacción.
- **Secuencia:** Crea o actualiza el `.spec.ts` adyacente; ejecuta ese archivo con `--include`; si afecta varios componentes, ejecuta los specs de la carpeta funcional o la suite completa del frontend.
- **Resultado:** Los escenarios modificados pasan y se reporta el número de pruebas ejecutadas.
- **Variantes y errores:** Para servicios compartidos o configuración global, amplía la selección.

Ejemplo de selección por carpeta funcional, relativa a `src/Frontend/src`:

```bash
pnpm --dir src/Frontend exec ng test --watch=false '--include=app/features/cuenta-bancaria/**/*.spec.ts'
```

### Escenario 3 — Integración continua vigente

- **Actor y precondición:** CI recibe un PR.
- **Disparador:** Se actualiza el PR.
- **Secuencia:** Ejecuta las suites que determina el filtro por rutas y el nivel de CI de ADR-0005, sin reutilizar la selección local.
- **Resultado:** El resultado de CI refleja las pruebas exigidas por la política vigente.
- **Variantes y errores:** Una suite fallida o indebidamente omitida según esa política hace fallar `ci-ok`.

## Datos, seguridad e integraciones

No se capturan ni persisten datos nuevos. Los ejemplos de pruebas usan datos ficticios evidentes. La única integración externa considerada es PostgreSQL local mediante Testcontainers para las pruebas ya existentes; CI usa GitHub Actions. No se modifican credenciales, reglas de GitHub ni contratos de API.

## Criterios de aceptación

- [ ] `AGENTS.md` y la guía de contribución explican cuándo ejecutar pruebas locales selectivas y cómo ampliar la selección (RF-PRU-001, 006; escenarios 1 y 2).
- [ ] Los ejemplos de backend por proyecto, clase y método ejecutan al menos una prueba y excluyen integración cuando así se indica (RF-PRU-002, 008; escenario 1).
- [ ] Los ejemplos de frontend por archivo y carpeta ejecutan solo los specs elegidos y reportan pruebas encontradas (RF-PRU-003, 008; escenario 2).
- [ ] Las convenciones para nuevas pruebas de backend y frontend quedan documentadas con la estructura existente (RF-PRU-004, 005; escenarios 1 y 2).
- [ ] La documentación de CI coincide con el workflow vigente; no se modifica `.github/workflows/ci.yml` ni ADR-0005 (RF-PRU-007; escenario 3).
- [ ] Se informa la salida real de compilación y pruebas, incluidas las limitaciones del entorno.

## Puntos que requieren decisión

| ID | Contradicción o dato faltante | Impacto | Quién decide |
|---|---|---|---|
| PD-PRU-01 | Resuelto el 2026-10-28: el solicitante eligió mantener CI actual y limitar el cambio a instrucciones y comandos locales. | No se modifica `.github/workflows/ci.yml` ni ADR-0005. | Solicitante |

## Revisión funcional

**Versión revisada:** 0.1\
**Decisión:** Aprobado\
**Aprobó:** Solicitante, revisor funcional\
**Fecha y evidencia de aprobación:** 2026-10-28; aprobación explícita de «la spec» en esta conversación (repetida en dos mensajes).\
**Ajustes solicitados:** Ninguno

**Corrección técnica posterior a la aprobación:** el ejemplo de filtro por clase se precisó con el nombre completo para evitar coincidencias parciales con otras clases `*CuentaBancariaTests`. No cambia el alcance ni los requisitos aprobados.

Solo una aprobación explícita de esta versión habilita la creación de `plan.md`, `tasks.md` y `test-e2e.md`.
