# Hoja de vida del personal — Tareas

**Spec aprobado:** `spec.md` versión 0.3  
**Plan:** `plan.md` versión 1.0  
**Estado:** Preparado para implementación (T-09 y T-10 bloqueadas por ADR)

Rutas abreviadas como en `plan.md`: `B` = `src/Backend/src/Istpet.ActualizacionDatos`, `F` = `src/Frontend/src/app`. Los responsables siguen el dueño de cada issue; los marcados «propuesta» se reparten para aliviar la carga y los confirma cada persona.

## Matriz de dependencias

| Tarea | Issue | Requisitos | Depende de | Puede ir en paralelo con | Dueño |
|---|---|---|---|---|---|
| T-00 | por crear | Contratos de todos | Ninguna | Ninguna | Coordinador (propuesta: @AnthonyPilatasig) |
| T-01 | #29 | RF-HDV-014, 001 (validación de tipo) | T-00 | T-05, T-06 | @bryancito1090 |
| T-02 | #30 | RF-HDV-001 a 006, 010, 015, 017, 020 | T-00, T-01 | T-03 | @AlexanderMartinez0410 |
| T-03 | #30 | RF-HDV-007, 008, 010, 015 | T-00 | T-02 | @AnthonyPilatasig (propuesta) |
| T-04 | #30 | RF-HDV-009, 018, 019, 023, 024 | T-02, T-03 | T-07 | @AlexanderMartinez0410 |
| T-05 | #31 | RF-HDV-012, 013, 015 | T-00 | T-01, T-06 | @bryancito1090 |
| T-06 | #32 | RF-HDV-008; RF-FLU-005; PD-HDV-04 | T-00 | T-01, T-05 | @AnthonyPilatasig |
| T-07 | por crear | RF-HDV-011, 015 | T-00, T-02 | T-04 | @bryancito1090 (propuesta) |
| T-08 | #13 | RF-HDV-016 | T-02 | T-11, T-12 | @JorgeDoicela |
| T-09 | por crear | RF-HDV-021, 022, 023 | T-04; **ADR-0012 Vigente** | T-08 | por asignar |
| T-10 | por crear | RF-HDV-025, 026, 027; cuenta bancaria obligatoria en RF-HDV-009 | T-04; **ADR-0013 Vigente** | T-08 | por asignar |
| T-11 | #33 | Escenario 1; RF-HDV-001 a 009, 017 a 020, 024 | T-02, T-03, T-04 | T-12 | @JorgeDoicela |
| T-12 | #34 | Escenarios 2 y 3; RF-HDV-011, 012, 013, 027 | T-05, T-07 | T-11 | @AlexanderMartinez0410 |
| T-13 | #35 | Todos | T-01 a T-12 | Ninguna | @JosephBano |

Una tarea paralela tiene contrato fijado en T-00 y archivos de edición separados. Si dos tareas modifican el mismo archivo, se ordenan o la integración la hace el coordinador. **T-09 y T-10 están «Bloqueadas por ADR»** hasta que ADR-0012 y ADR-0013 estén Vigentes en `docs/decisiones/`.

Regla común a toda tarea de backend: una prueba que falle por el comportamiento ausente antes de implementarlo; una prueba de aislamiento entre dos instituciones si la tarea lee o escribe datos de la hoja de vida; y, si cambia la API, `openapi/v1.json` y el cliente regenerados en el mismo PR con `pnpm --dir src/Frontend generar:api`.

## T-00 — Contratos de la hoja de vida

**Objetivo:** fijar interfaces, DTO y esqueleto de endpoints para que las demás tareas no se pisen.  
**Área y rama:** Backend; `feature/28-contratos-hoja-de-vida`  
**Archivos exclusivos:** `B.Application/Servicios/IServicioCatalogos.cs`, `IServicioHojaDeVida.cs`, `IServicioDocumentosPersonales.cs`, `IValidadorCompletitudEnvio.cs`, `IServicioConfiguracionHojaDeVida.cs`, `IServicioExportacion.cs`; `B.Application/Modelos/ModelosHojaDeVida.cs`; `B.WebApi/Endpoints/` (archivos vacíos con su `MapXxx`)  
**Entrada/contrato:** rutas y roles de la tabla de `plan.md`  
**Salida para integración:** interfaces compilables y una línea de registro por grupo en `B.WebApi/Program.cs`  
**Dependencias:** Ninguna  
**ADR aplicable:** ADR-0010 (`docs/decisiones/ADR-0010-hoja-de-vida-estructurada.md`)  
**Responsable:** coordinador

- [ ] Definir interfaces y DTO con los errores y estados de `plan.md`.
- [ ] Registrar los grupos de endpoints con respuestas 501 hasta que cada tarea los implemente.
- [ ] Ejecutar `dotnet build src/Backend`: sin errores ni advertencias.
- [ ] Regenerar `openapi/v1.json` y el cliente.
- [ ] Entregar el PR con la lista de contratos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-01 — Catálogos: importación y consulta

**Objetivo:** que cualquier rol consulte catálogos y que el `superadmin` los importe sin duplicar (RF-HDV-014); que un campo de catálogo rechace un elemento de otro tipo (RF-HDV-001).  
**Área y rama:** Backend; `feature/29-catalogos`  
**Archivos exclusivos:** `B.Infrastructure/Servicios/ServicioCatalogos.cs`, `ValidadorCatalogos.cs`; `B.WebApi/Endpoints/CatalogosEndpoints.cs`; migración de siembra; `data/catalogos/` con su README de origen y fecha  
**Entrada/contrato:** CSV por tipo con `codigo`, `nombre`, `codigo_padre`, `codigo_externo`; ids desde 1000; semilla nueva (grados de primaria y secundaria, tipo de capacitación «instrucción profesional») con ids menores de 1000  
**Salida para integración:** `GET /api/catalogos/{tipo}?padreId=`, `ValidadorCatalogos` para T-02 y T-05  
**Dependencias:** T-00  
**ADR aplicable:** ADR-0010 dec. 5  
**Responsable:** @bryancito1090 (fuentes: @JorgeDoicela INEC, @AlexanderMartinez0410 SENESCYT, @AnthonyPilatasig UNESCO y sistema de talento humano)

- [ ] Pruebas: importar dos veces no duplica; un padre de otro tipo se rechaza; `padreId` filtra; solo activos.
- [ ] Implementar importación, consulta y validador.
- [ ] Ejecutar `dotnet test src/Backend`: todas en verde.
- [ ] Cargar los catálogos en desarrollo con Docker y documentar su origen en `data/catalogos/README.md`.
- [ ] Entregar diff, resultado de pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** fuentes de PD-HDV-03 entregadas por sus responsables

## T-02 — Ficha e ítems de la hoja de vida (API del usuario)

**Objetivo:** que el `usuario` guarde ficha, perfil, foto y los ítems de títulos, en curso, capacitaciones, experiencias y referencias, solo en borrador o devuelto.  
**Área y rama:** Backend; `feature/30-hoja-de-vida-usuario`  
**Archivos exclusivos:** `B.Infrastructure/Servicios/ServicioHojaDeVida.cs`; `B.WebApi/Endpoints/HojaDeVidaEndpoints.cs`  
**Entrada/contrato:** `IServicioHojaDeVida` y DTO de T-00  
**Salida para integración:** endpoints `/api/mis-datos/hoja-de-vida/...`  
**Dependencias:** T-00, T-01  
**ADR aplicable:** ADR-0004, ADR-0006, ADR-0010  
**Responsable:** @AlexanderMartinez0410

- [ ] Pruebas: elemento de otro tipo rechazado; edición rechazada en enviado y aprobado, por sección; archivo ajeno rechazado; foto que no es imagen rechazada; ítem de otra institución no encontrado.
- [ ] Implementar el servicio y los endpoints.
- [ ] Ejecutar `dotnet test src/Backend`: todas en verde.
- [ ] Verificar RF-HDV-001 a 006, 010, 015, 017, 020.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-03 — Documentos personales por requisito

**Objetivo:** que el `usuario` vea los documentos que le aplican y registre uno por tipo, reemplazando el anterior.  
**Área y rama:** Backend; `feature/30-documentos-personales`  
**Archivos exclusivos:** `B.Infrastructure/Servicios/ServicioDocumentosPersonales.cs`; `B.WebApi/Endpoints/DocumentosPersonalesEndpoints.cs`  
**Entrada/contrato:** requisitos por tipo de funcionario o «todos»  
**Salida para integración:** `GET /api/mis-datos/documentos`, `PUT /api/mis-datos/documentos/{tipoDocumentoId}`  
**Dependencias:** T-00  
**ADR aplicable:** ADR-0006, ADR-0010 dec. 9  
**Responsable:** @AnthonyPilatasig (propuesta)

- [ ] Pruebas: persona con tipo y sin tipo; reemplazo de un tipo existente; aislamiento entre instituciones; edición rechazada fuera de borrador.
- [ ] Implementar listado y registro.
- [ ] Ejecutar `dotnet test src/Backend`, incluida la integración en PostgreSQL.
- [ ] Verificar RF-HDV-007, 008, 010, 015.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-04 — Validación de completitud al enviar

**Objetivo:** que el envío falle diciendo qué falta.  
**Área y rama:** Backend; `feature/30-validacion-envio`  
**Archivos exclusivos:** `B.Infrastructure/Servicios/ValidadorCompletitudEnvio.cs`; `B.Infrastructure/Servicios/ServicioDatosUsuario.cs` (solo el punto de envío)  
**Entrada/contrato:** obligatorios de spec v0.3: datos personales de PD-HDV-01, un estudio, dos referencias personales, respaldo en cada ítem, documentos obligatorios según requisitos  
**Salida para integración:** error de envío con la lista de faltantes por sección e identificador  
**Dependencias:** T-02, T-03  
**ADR aplicable:** ADR-0009 (validación en un solo lugar), ADR-0010  
**Responsable:** @AlexanderMartinez0410

- [ ] Pruebas: una por cada causa de faltante; una referencia familiar no cuenta; sin estudio; ítem sin archivo; documento obligatorio ausente; ficha precargada incompleta.
- [ ] Implementar el validador y conectarlo a `EnviarARevision`.
- [ ] Ejecutar `dotnet test src/Backend`: todas en verde.
- [ ] Verificar RF-HDV-009, 018, 019, 023, 024.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** contrastar PD-HDV-01 con `Profesores.cs` (@AnthonyPilatasig)

## T-05 — Configuración del admin

**Objetivo:** que el admin cree tipos de funcionario, tipos de documento y requisitos, y asigne el tipo a las personas.  
**Área y rama:** Backend; `feature/31-configuracion-admin`  
**Archivos exclusivos:** `B.Infrastructure/Servicios/ServicioConfiguracionHojaDeVida.cs`; `B.WebApi/Endpoints/ConfiguracionHojaDeVidaEndpoints.cs`; `B.Infrastructure/Servicios/ServicioPersonas.cs` (solo asignación de tipo)  
**Entrada/contrato:** código único por institución  
**Salida para integración:** `/api/configuracion/...` y `PUT /api/personas/{id}/tipo-funcionario`  
**Dependencias:** T-00  
**ADR aplicable:** ADR-0004, ADR-0010 dec. 6  
**Responsable:** @bryancito1090

- [ ] Pruebas: código repetido rechazado dentro de la institución y permitido en otra; tipo de otra institución rechazado; rol `usuario` rechazado.
- [ ] Implementar servicio y endpoints.
- [ ] Ejecutar `dotnet test src/Backend`: todas en verde.
- [ ] Verificar RF-HDV-012, 013, 015.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-06 — Flujo de segunda campaña y archivos

**Objetivo:** que una persona aprobada inicie otra actualización al entrar, y que reemplazar un archivo o subirlo duplicado no deje basura.  
**Área y rama:** Backend; `feature/32-flujo-segunda-campana`  
**Archivos exclusivos:** `B.Domain/Persona.cs` (nuevo método); `B.Infrastructure/Servicios/ServicioArchivos.cs`; `B.WebApi/Endpoints/MisDatosEndpoints.cs`  
**Entrada/contrato:** `POST /api/mis-datos/iniciar-actualizacion`, solo con campaña abierta y estado «aprobado»  
**Salida para integración:** transición «aprobado» → «borrador»; archivo reemplazado eliminado; subida duplicada tratada  
**Dependencias:** T-00  
**ADR aplicable:** ADR-0006  
**Responsable:** @AnthonyPilatasig

- [ ] Pruebas de dominio para cada estado de origen (solo «aprobado» pasa); prueba de campaña cerrada; pruebas de archivo reemplazado y duplicado.
- [ ] Implementar la transición y el tratamiento de archivos.
- [ ] Ejecutar `dotnet test src/Backend`.
- [ ] Anotar el cambio en `docs/specs/spec-0001/spec.md` (RF-FLU-005) mediante PR de docs.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-07 — Marcas por ítem

**Objetivo:** que el supervisor marque un título, curso, experiencia o referencia concreta y el usuario la vea.  
**Área y rama:** Backend; `feature/28-marcas-por-item`  
**Archivos exclusivos:** `B.Domain/TipoDestinoMarca.cs`; `B.Infrastructure/Servicios/ServicioRevision.cs`  
**Entrada/contrato:** `TipoDestinoMarca.Item` con `ClaveDestino` = `tipo:{id}`  
**Salida para integración:** marcas por ítem en devolución y en `GET /api/mis-datos/observaciones`  
**Dependencias:** T-00, T-02  
**ADR aplicable:** ADR-0008  
**Responsable:** @bryancito1090 (propuesta)

- [ ] Pruebas: marca con clave de ítem existente; clave de otra persona rechazada; el usuario ve la marca; migración no necesaria o declarada.
- [ ] Implementar y comprobar cómo se guarda `TipoDestino` antes de agregar el valor.
- [ ] Ejecutar `dotnet test src/Backend`.
- [ ] Verificar RF-HDV-011, 015.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-08 — Exportación por secciones

**Objetivo:** que el Excel y el `.zip` incluyan cada sección y sus respaldos, solo de personas aprobadas.  
**Área y rama:** Backend; `feature/13-exportacion`  
**Archivos exclusivos:** `B.Infrastructure/Servicios/ServicioExportacion.cs`; `B.WebApi/Endpoints/ExportacionEndpoints.cs`  
**Entrada/contrato:** solo personas en «aprobado»; hoja «pendientes» con las demás; cuenta bancaria enmascarada si existe; `codigo_externo` opcional  
**Salida para integración:** archivos Excel y `.zip`  
**Dependencias:** T-02  
**ADR aplicable:** ADR-0010, ADR-0013 (máscara, si ya es Vigente)  
**Responsable:** @JorgeDoicela (lado API: @bryancito1090)

- [ ] Pruebas: persona aprobada exportada; persona en nueva actualización solo en «pendientes»; respaldos ordenados por sección; otra institución no aparece.
- [ ] Implementar la exportación.
- [ ] Ejecutar `dotnet test src/Backend`.
- [ ] Verificar RF-HDV-016.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-09 — Carga de nómina ampliada

**Objetivo:** cargar la nómina con valores nulos, dividir nombres y producir un informe de advertencias.  
**Área y rama:** Backend; `feature/28-carga-nomina`  
**Archivos exclusivos:** `B.Application/Servicios/DivisorNombres.cs`; `B.Application/Modelos/ModelosPersona.cs`; `B.Infrastructure/Servicios/ServicioPersonas.cs` (carga); `F/features/admin/nomina/` (informe)  
**Entrada/contrato:** tabla de columnas y casos de prueba de ADR-0012  
**Salida para integración:** `POST /api/personas/cargar` con el nuevo contrato e informe sin datos personales  
**Dependencias:** T-04; **ADR-0012 Vigente**  
**ADR aplicable:** ADR-0012 (`docs/decisiones/ADR-0012-carga-de-nomina-nulos-y-nombres.md`)  
**Responsable:** por asignar

- [ ] Pruebas del divisor con los cinco casos del ADR (nombres ficticios); una prueba por columna vacía o inválida; fila sin documento rechazada; documento repetido omitido.
- [ ] Implementar la carga y el informe.
- [ ] Ejecutar `dotnet test src/Backend` y `pnpm --dir src/Frontend test:ci`.
- [ ] Regenerar `openapi/v1.json` y el cliente.
- [ ] Entregar diff, pruebas y riesgos; confirmar que el archivo real de nómina no está en el repositorio.

**Resultado registrado:** pendiente  
**Bloqueos:** **Bloqueada por ADR-0012**; las columnas bancarias además esperan ADR-0013

## T-10 — Cuenta bancaria

**Objetivo:** que la persona registre y confirme su cuenta y que el supervisor y el admin vean si coincide con la nómina, sin ver el número.  
**Área y rama:** Backend y Frontend; `feature/28-cuenta-bancaria`  
**Archivos exclusivos:** `B.Domain/HojaDeVida/CuentaBancaria.cs`; `B.Infrastructure/Servicios/ServicioCuentaBancaria.cs`; `B.WebApi/Endpoints/CuentaBancariaEndpoints.cs`; migración; reglas en `ValidadorCompletitudEnvio.cs`  
**Entrada/contrato:** decisiones 1 a 8 de ADR-0013  
**Salida para integración:** `/api/mis-datos/cuenta-bancaria` y `/api/revision/{documento}/cuenta-bancaria`  
**Dependencias:** T-04; **ADR-0013 Vigente**  
**ADR aplicable:** ADR-0013 (`docs/decisiones/ADR-0013-datos-bancarios.md`), ADR-0011  
**Responsable:** por asignar

- [ ] Pruebas: el número no queda en claro en la base; máscara con cuatro dígitos; confirmación igual y distinta; auditoría de cada lectura del número completo; aislamiento; cuenta obligatoria impide el envío (PD-HDV-17).
- [ ] Implementar entidad, servicio, endpoints y migración.
- [ ] Ejecutar `dotnet test src/Backend`.
- [ ] Comprobar que la clave de cifrado no está en el repositorio.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** **Bloqueada por ADR-0013**

## T-11 — Pantallas de hoja de vida del usuario

**Objetivo:** que el docente complete cada sección, adjunte certificados, suba sus cinco documentos y envíe viendo qué falta.  
**Área y rama:** Frontend; `feature/33-pantallas-hoja-de-vida`  
**Archivos exclusivos:** `F/features/usuario/hoja-de-vida/`; `F/api-client/` (regenerado)  
**Entrada/contrato:** endpoints de T-02, T-03 y T-04  
**Salida para integración:** rutas del usuario en `F/app.routes.ts` (una línea)  
**Dependencias:** T-02, T-03, T-04  
**ADR aplicable:** ADR-0003  
**Responsable:** @JorgeDoicela

- [ ] Pruebas de componente: ficha con catálogos dependientes; ítem con certificado; envío impedido mostrando la lista de faltantes; bloqueo de edición fuera de borrador.
- [ ] Implementar las pantallas.
- [ ] Ejecutar `pnpm --dir src/Frontend test:ci`, `pnpm --dir src/Frontend lint` y `pnpm --dir src/Frontend format:check`.
- [ ] Verificar Escenario 1.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** PD-HDV-11 y PD-HDV-13

## T-12 — Revisión por secciones y configuración (supervisor y admin)

**Objetivo:** que el supervisor revise por sección y marque ítems, y que el admin configure requisitos.  
**Área y rama:** Frontend; `feature/34-revision-y-configuracion`  
**Archivos exclusivos:** `F/features/supervisor/revision/`; `F/features/admin/configuracion/`  
**Entrada/contrato:** endpoints de T-05 y T-07  
**Salida para integración:** rutas en `F/app.routes.ts` (una línea)  
**Dependencias:** T-05, T-07  
**ADR aplicable:** ADR-0003, ADR-0008  
**Responsable:** @AlexanderMartinez0410

- [ ] Pruebas de componente: marca sobre un ítem; devolución con observación general; creación de tipo de documento y requisito.
- [ ] Implementar pantallas.
- [ ] Ejecutar `pnpm --dir src/Frontend test:ci`, `lint` y `format:check`.
- [ ] Verificar Escenarios 2 y 3.
- [ ] Entregar diff, pruebas y riesgos.

**Resultado registrado:** pendiente  
**Bloqueos:** Ninguno

## T-13 — Pruebas E2E y cierre

**Objetivo:** ejecutar `test-e2e.md` completo sobre `develop` integrado.  
**Área y rama:** ambas; `test/35-e2e-spec-0003`  
**Archivos exclusivos:** `docs/specs/spec-0003/test-e2e.md` (resultados)  
**Entrada/contrato:** ambiente de `test-e2e.md`  
**Salida para integración:** resultados por caso y marcas de «Implementado»  
**Dependencias:** T-01 a T-12  
**ADR aplicable:** Ninguno  
**Responsable:** @JosephBano

- [ ] Preparar el ambiente con `cp .env.example .env && docker compose up --build`.
- [ ] Ejecutar cada caso y registrar resultado, evidencia, fecha y ejecutor.
- [ ] Abrir un issue por cada fallo.
- [ ] Solo los casos aprobados pasan los requisitos a «Implementado».

**Resultado registrado:** pendiente  
**Bloqueos:** todas las anteriores

## Integración y cierre

- [ ] El coordinador revisó cada diff y comprobó la evidencia de cada tarea.
- [ ] Se resolvieron dependencias y conflictos sin cambiar el spec aprobado.
- [ ] Se ejecutaron `dotnet test src/Backend` y `pnpm --dir src/Frontend test:ci`.
- [ ] Se ejecutó `test-e2e.md` y se registraron resultados por escenario.
- [ ] El cambio se integra mediante PR a `develop`, con título `<tipo>: <resumen en minúsculas>`.
- [ ] Solo los requisitos con evidencia integrada y prueba satisfactoria pasan a `Implementado`.
