# Evidencia de Implementación — Issue #43 (T-07)

## Marcas por ítem en la devolución (RF-HDV-011, RF-HDV-015)

- **Issue:** #43  
- **Tarea:** T-07 de `docs/specs/spec-0003/tasks.md`  
- **Rama:** `feature/43-marcas-por-item`  
- **Destino:** `develop`  

---

### 1. Resumen de Cambios

1. **`TipoDestinoMarca.Item` (Dominio):**
   - Se añadió el valor `Item = 3` al enumerado `TipoDestinoMarca`.
   - Se comprobó la configuración en `MarcaObservacionConfiguracion.cs`: la propiedad `TipoDestino` se persiste mediante `.HasConversion<string>()` en una columna `varchar(50)`. Por tanto, **no se requiere migración de base de datos** (DDL) para soportar el nuevo valor `"Item"`.

2. **Validación de Clave de Destino (Infraestructura / ServicioRevision):**
   - En `ServicioRevision.DevolverActualizacionAsync`, se procesa el tipo de destino `item`.
   - Se valida obligatoriamente que la `ClaveDestino` cumpla el formato `tipo:{id}` (`Guid` válido).
   - Se verifica en base de datos que el ítem exista y pertenezca efectivamente a la persona (`persona.Id` e institución) cuya actualización se devuelve. Si el ítem no existe o pertenece a otra persona, se rechaza la solicitud con `ReglaNegocioException` (HTTP 400).
   - Tipos de ítem soportados: `titulo`, `titulo-en-curso`, `capacitacion` (o `curso`), `experiencia`, `referencia`, `documento`.

3. **Consulta de Marcas por el Usuario (Frontend y Backend):**
   - En `GET /api/mis-datos/observaciones`, las marcas por ítem se entregan con `tipoDestino: "item"` y `claveDestino: "tipo:{id}"`.
   - En el frontend (`hoja-de-vida-state.service.ts`), `obtenerMarcaParaItem` vincula las marcas `item` hacia los componentes correspondientes (`<app-marca-observacion>`), permitiendo que el usuario vea la marca visualmente sobre el ítem devuelto.

---

### 2. Evidencia de Pruebas

#### Backend
- `MarcasPorItemTests.cs` (4 pruebas completas):
  - `RF_HDV_011_Marca_con_clave_de_item_existente_agrega_marca_tipo_item`: OK.
  - `RF_HDV_011_Marca_con_clave_de_otra_persona_o_inexistente_es_rechazada`: OK.
  - `RF_HDV_011_Usuario_ve_la_marca_sobre_el_item_en_mis_datos_observaciones`: OK.
  - `RF_HDV_015_Aislamiento_supervisor_otra_institucion_no_marca_ni_ve_item`: OK.
- `ObservacionTests.cs`:
  - `Observacion_con_marcas_de_campo_y_archivo_agrega_marcas` (incluye `TipoDestinoMarca.Item`): OK.

#### Frontend
- `hoja-de-vida-state.service.spec.ts`:
  - `obtenerMarcaParaItem_encuentra_marca_por_item_con_prefijo`: OK.
- `pnpm --dir src/Frontend test:ci`: 27 archivos de pruebas, 174 pruebas en verde.
