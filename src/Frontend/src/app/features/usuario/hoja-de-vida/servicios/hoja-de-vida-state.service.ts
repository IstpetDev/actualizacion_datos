import { mensajeError } from '../../../../core/auth/mensaje-error';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, tap } from 'rxjs';
import { SeccionConCambios } from './seccion-con-cambios';
import {
  CapacitacionDto,
  DocumentoPersonalDto,
  DocumentoRequeridoDto,
  DocumentosPersonalesClient,
  EstadoEdicionDto,
  ExperienciaLaboralDto,
  FaltanteEnvioDto,
  FichaPersonalDto,
  GuardarCapacitacionRequest,
  GuardarDocumentoPersonalRequest,
  GuardarExperienciaLaboralRequest,
  GuardarFichaPersonalRequest,
  GuardarReferenciaRequest,
  GuardarTituloAcademicoRequest,
  GuardarTituloEnCursoRequest,
  HojaDeVidaClient,
  HojaDeVidaDto,
  MarcaObservacionDto,
  MisDatosClient,
  ObservacionDto,
  ReferenciaDto,
  TituloAcademicoDto,
  TituloEnCursoDto,
  CapacitacionesObligatoriasClient,
  EstadoCapacitacionObligatoriaPersonaDto,
  MensajeRespuesta,
} from '../../../../api-client';

@Injectable({
  providedIn: 'root',
})
export class HojaDeVidaStateService {
  private readonly hdvClient = inject(HojaDeVidaClient);
  private readonly docsClient = inject(DocumentosPersonalesClient);
  private readonly misDatosClient = inject(MisDatosClient);
  private readonly capacitacionesObligatoriasClient = inject(CapacitacionesObligatoriasClient);

  // Signals de Estado Principal
  readonly hojaDeVida = signal<HojaDeVidaDto | null>(null);
  readonly documentos = signal<DocumentoRequeridoDto[]>([]);
  readonly faltantes = signal<FaltanteEnvioDto[]>([]);
  readonly marcasObservacion = signal<MarcaObservacionDto[]>([]);
  readonly estadoEdicion = signal<EstadoEdicionDto | null>(null);
  readonly observaciones = signal<ObservacionDto[]>([]);
  readonly capacitacionesObligatorias = signal<EstadoCapacitacionObligatoriaPersonaDto[]>([]);

  readonly seccionActiva = signal<SeccionConCambios | null>(null);
  readonly tieneCambiosSinGuardarSignal = signal<boolean>(false);

  registrarSeccion(seccion: SeccionConCambios): void {
    this.seccionActiva.set(seccion);
    this.actualizarEstadoCambios();
  }

  desregistrarSeccion(seccion: SeccionConCambios): void {
    if (this.seccionActiva() === seccion) {
      this.seccionActiva.set(null);
      this.tieneCambiosSinGuardarSignal.set(false);
    }
  }

  actualizarEstadoCambios(): void {
    const s = this.seccionActiva();
    this.tieneCambiosSinGuardarSignal.set(!!s && s.tieneCambios());
  }

  tieneCambiosSinGuardar(): boolean {
    const s = this.seccionActiva();
    const hay = !!s && s.tieneCambios();
    this.tieneCambiosSinGuardarSignal.set(hay);
    return hay;
  }

  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly mensajeExito = signal<string>('');

  // Computed signals
  readonly ficha = computed<FichaPersonalDto | null>(() => this.hojaDeVida()?.ficha ?? null);
  readonly titulos = computed<TituloAcademicoDto[]>(() => this.hojaDeVida()?.titulos ?? []);
  readonly titulosEnCurso = computed<TituloEnCursoDto[]>(
    () => this.hojaDeVida()?.titulosEnCurso ?? [],
  );
  readonly capacitaciones = computed<CapacitacionDto[]>(
    () => this.hojaDeVida()?.capacitaciones ?? [],
  );
  readonly experiencias = computed<ExperienciaLaboralDto[]>(
    () => this.hojaDeVida()?.experiencias ?? [],
  );
  readonly referencias = computed<ReferenciaDto[]>(() => this.hojaDeVida()?.referencias ?? []);

  readonly referenciasPersonales = computed<ReferenciaDto[]>(() =>
    this.referencias().filter((r) => r.tipo?.toLowerCase() === 'personal'),
  );

  readonly referenciasFamiliares = computed<ReferenciaDto[]>(() =>
    this.referencias().filter((r) => r.tipo?.toLowerCase() === 'familiar'),
  );

  readonly estadoActualizacion = computed<string>(
    () => this.hojaDeVida()?.estadoActualizacion ?? 'Borrador',
  );

  readonly esDevuelto = computed<boolean>(
    () => this.estadoActualizacion().toLowerCase() === 'devuelto',
  );

  readonly observacionGeneralDevolucion = computed<string | undefined>(() => {
    const ult = this.observaciones()[0];
    return ult?.texto;
  });

  readonly documentosRequeridos = computed<DocumentoRequeridoDto[]>(() => this.documentos());

  /**
   * RF-HDV-010: Solo lectura estricta fuera de Borrador o Devuelto
   */
  readonly puedeEditar = computed<boolean>(() => {
    const hdv = this.hojaDeVida();
    if (!hdv) return false;
    const estado = (hdv.estadoActualizacion ?? '').toLowerCase();
    const estadoEditable = estado === 'borrador' || estado === 'devuelto';
    return !!hdv.puedeEditar && estadoEditable;
  });

  /**
   * Carga completa de la Hoja de Vida, Documentos, Estado de Campaña y Observaciones
   */
  cargarTodo(): Observable<unknown> {
    this.cargando.set(true);
    this.error.set('');

    return forkJoin({
      hdv: this.hdvClient.obtenerMiHojaDeVida(),
      docs: this.docsClient.listarMisDocumentosPersonales().pipe(catchError(() => of([]))),
      estado: this.misDatosClient
        .obtenerEstadoEdicion()
        .pipe(catchError(() => of(null as unknown as EstadoEdicionDto))),
      obs: this.misDatosClient.obtenerObservacionesMisDatos().pipe(catchError(() => of([]))),
      obligatorias: this.capacitacionesObligatoriasClient
        .obtenerMisCapacitacionesObligatorias()
        .pipe(catchError(() => of([]))),
    }).pipe(
      tap(({ hdv, docs, estado, obs, obligatorias }) => {
        this.hojaDeVida.set(hdv);
        this.documentos.set(docs ?? []);
        this.estadoEdicion.set(estado);
        const marcas: MarcaObservacionDto[] = (obs ?? []).flatMap((o) => o.marcas ?? []);
        this.marcasObservacion.set(marcas);
        this.observaciones.set(obs ?? []);
        this.capacitacionesObligatorias.set(obligatorias ?? []);
      }),
      catchError((err) => {
        const msg = mensajeError(err, 'No fue posible cargar la información de la hoja de vida.');
        this.error.set(msg);
        return of(null);
      }),
      finalize(() => this.cargando.set(false)),
    );
  }

  /**
   * Carga completa de la Hoja de Vida y los Documentos Personales
   */
  cargarHojaDeVida(): Observable<{ hdv: HojaDeVidaDto; docs: DocumentoRequeridoDto[] }> {
    this.cargando.set(true);
    this.error.set('');

    return forkJoin({
      hdv: this.hdvClient.obtenerMiHojaDeVida(),
      docs: this.docsClient.listarMisDocumentosPersonales().pipe(catchError(() => of([]))),
    }).pipe(
      tap(({ hdv, docs }) => {
        this.hojaDeVida.set(hdv);
        this.documentos.set(docs ?? []);
      }),
      catchError((err) => {
        const msg = mensajeError(err, 'No fue posible cargar la información de la hoja de vida.');
        this.error.set(msg);
        throw err;
      }),
      finalize(() => this.cargando.set(false)),
    );
  }

  /**
   * Consulta los requisitos pendientes que impiden el envío a revisión
   */
  consultarFaltantes(): Observable<FaltanteEnvioDto[]> {
    return this.hdvClient.obtenerFaltantesEnvio().pipe(
      map((res) => res?.faltantes ?? []),
      tap((faltantes) => this.faltantes.set(faltantes)),
      catchError(() => {
        this.faltantes.set([]);
        return of([]);
      }),
    );
  }

  obtenerFaltantes(): Observable<FaltanteEnvioDto[]> {
    return this.consultarFaltantes();
  }

  enviarRevision(): Observable<unknown> {
    this.guardando.set(true);
    return this.misDatosClient.enviarMisDatosARevision().pipe(
      tap(() => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({
            ...actual,
            estadoActualizacion: 'Enviado',
            puedeEditar: false,
          });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  // --- Operaciones de Ficha Personal ---
  guardarFichaPersonal(request: GuardarFichaPersonalRequest): Observable<FichaPersonalDto> {
    this.guardando.set(true);
    this.error.set('');

    return this.hdvClient.guardarMiFichaPersonal(request).pipe(
      tap((fichaActualizada) => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({ ...actual, ficha: fichaActualizada });
        }
        this.mensajeExito.set('Ficha personal guardada exitosamente.');
      }),
      catchError((err) => {
        this.error.set(mensajeError(err, 'Error al guardar la ficha personal.'));
        throw err;
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  // --- Operaciones de Títulos Académicos ---
  guardarTitulo(
    request: GuardarTituloAcademicoRequest,
    id?: string,
  ): Observable<TituloAcademicoDto> {
    this.guardando.set(true);
    this.error.set('');

    const peticion = id
      ? this.hdvClient.actualizarTituloAcademico(id, request)
      : this.hdvClient.agregarTituloAcademico(request);

    return peticion.pipe(
      tap((tituloGuardado) => {
        const actual = this.hojaDeVida();
        if (actual) {
          const titulos = id
            ? actual.titulos.map((t) => (t.id === id ? tituloGuardado : t))
            : [...actual.titulos, tituloGuardado];
          this.hojaDeVida.set({ ...actual, titulos });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  eliminarTitulo(id: string): Observable<void> {
    this.guardando.set(true);
    return this.hdvClient.eliminarTituloAcademico(id).pipe(
      tap(() => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({
            ...actual,
            titulos: actual.titulos.filter((t) => t.id !== id),
          });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  // --- Operaciones de Títulos en Curso ---
  guardarTituloEnCurso(
    request: GuardarTituloEnCursoRequest,
    id?: string,
  ): Observable<TituloEnCursoDto> {
    this.guardando.set(true);
    const peticion = id
      ? this.hdvClient.actualizarTituloEnCurso(id, request)
      : this.hdvClient.agregarTituloEnCurso(request);

    return peticion.pipe(
      tap((tituloGuardado) => {
        const actual = this.hojaDeVida();
        if (actual) {
          const titulosEnCurso = id
            ? actual.titulosEnCurso.map((t) => (t.id === id ? tituloGuardado : t))
            : [...actual.titulosEnCurso, tituloGuardado];
          this.hojaDeVida.set({ ...actual, titulosEnCurso });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  eliminarTituloEnCurso(id: string): Observable<void> {
    this.guardando.set(true);
    return this.hdvClient.eliminarTituloEnCurso(id).pipe(
      tap(() => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({
            ...actual,
            titulosEnCurso: actual.titulosEnCurso.filter((t) => t.id !== id),
          });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  // --- Operaciones de Capacitaciones ---
  guardarCapacitacion(
    request: GuardarCapacitacionRequest,
    id?: string,
  ): Observable<CapacitacionDto> {
    this.guardando.set(true);
    const peticion = id
      ? this.hdvClient.actualizarCapacitacion(id, request)
      : this.hdvClient.agregarCapacitacion(request);

    return peticion.pipe(
      tap((capGuardada) => {
        const actual = this.hojaDeVida();
        if (actual) {
          const capacitaciones = id
            ? actual.capacitaciones.map((c) => (c.id === id ? capGuardada : c))
            : [...actual.capacitaciones, capGuardada];
          this.hojaDeVida.set({ ...actual, capacitaciones });
          this.cargarCapacitacionesObligatorias().subscribe();
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  eliminarCapacitacion(id: string): Observable<void> {
    this.guardando.set(true);
    return this.hdvClient.eliminarCapacitacion(id).pipe(
      tap(() => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({
            ...actual,
            capacitaciones: actual.capacitaciones.filter((c) => c.id !== id),
          });
          this.cargarCapacitacionesObligatorias().subscribe();
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  cargarCapacitacionesObligatorias(): Observable<EstadoCapacitacionObligatoriaPersonaDto[]> {
    return this.capacitacionesObligatoriasClient.obtenerMisCapacitacionesObligatorias().pipe(
      tap((obs) => this.capacitacionesObligatorias.set(obs ?? [])),
      catchError(() => of([])),
    );
  }

  vincularCapacitacionObligatoria(
    obligatoriaId: string,
    capacitacionId: string,
  ): Observable<MensajeRespuesta> {
    this.guardando.set(true);
    return this.capacitacionesObligatoriasClient
      .vincularCapacitacionObligatoria(obligatoriaId, { capacitacionId })
      .pipe(
        tap(() => {
          this.cargarCapacitacionesObligatorias().subscribe();
          this.hdvClient.obtenerMiHojaDeVida().subscribe((hdv) => this.hojaDeVida.set(hdv));
        }),
        finalize(() => this.guardando.set(false)),
      );
  }

  justificarNuevoIngreso(
    obligatoriaId: string,
    justificacion: string,
  ): Observable<MensajeRespuesta> {
    this.guardando.set(true);
    return this.capacitacionesObligatoriasClient
      .justificarNuevoIngresoCapacitacionObligatoria(obligatoriaId, { justificacion })
      .pipe(
        tap(() => this.cargarCapacitacionesObligatorias().subscribe()),
        finalize(() => this.guardando.set(false)),
      );
  }

  // --- Operaciones de Experiencia Laboral ---
  guardarExperiencia(
    request: GuardarExperienciaLaboralRequest,
    id?: string,
  ): Observable<ExperienciaLaboralDto> {
    this.guardando.set(true);
    const peticion = id
      ? this.hdvClient.actualizarExperienciaLaboral(id, request)
      : this.hdvClient.agregarExperienciaLaboral(request);

    return peticion.pipe(
      tap((expGuardada) => {
        const actual = this.hojaDeVida();
        if (actual) {
          const experiencias = id
            ? actual.experiencias.map((e) => (e.id === id ? expGuardada : e))
            : [...actual.experiencias, expGuardada];
          this.hojaDeVida.set({ ...actual, experiencias });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  eliminarExperiencia(id: string): Observable<void> {
    this.guardando.set(true);
    return this.hdvClient.eliminarExperienciaLaboral(id).pipe(
      tap(() => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({
            ...actual,
            experiencias: actual.experiencias.filter((e) => e.id !== id),
          });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  // --- Operaciones de Referencias ---
  guardarReferencia(request: GuardarReferenciaRequest, id?: string): Observable<ReferenciaDto> {
    this.guardando.set(true);
    const peticion = id
      ? this.hdvClient.actualizarReferencia(id, request)
      : this.hdvClient.agregarReferencia(request);

    return peticion.pipe(
      tap((refGuardada) => {
        const actual = this.hojaDeVida();
        if (actual) {
          const referencias = id
            ? actual.referencias.map((r) => (r.id === id ? refGuardada : r))
            : [...actual.referencias, refGuardada];
          this.hojaDeVida.set({ ...actual, referencias });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  eliminarReferencia(id: string): Observable<void> {
    this.guardando.set(true);
    return this.hdvClient.eliminarReferencia(id).pipe(
      tap(() => {
        const actual = this.hojaDeVida();
        if (actual) {
          this.hojaDeVida.set({
            ...actual,
            referencias: actual.referencias.filter((r) => r.id !== id),
          });
        }
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  // --- Operaciones de Documentos Personales ---
  guardarDocumentoPersonal(
    tipoDocumentoId: string,
    request: GuardarDocumentoPersonalRequest,
  ): Observable<DocumentoPersonalDto> {
    this.guardando.set(true);
    return this.docsClient.guardarMiDocumentoPersonal(tipoDocumentoId, request).pipe(
      tap((docGuardado) => {
        const docs = this.documentos().map((d) => {
          if (d.tipoDocumentoId === tipoDocumentoId) {
            return {
              ...d,
              registrado: docGuardado,
            };
          }
          return d;
        });
        this.documentos.set(docs);
      }),
      finalize(() => this.guardando.set(false)),
    );
  }

  /**
   * Obtiene la marca de observación del supervisor para un ítem o sección dada
   */
  obtenerMarcaParaItem(tipoDestino: string, claveDestino: string): MarcaObservacionDto | undefined {
    const tipoLower = tipoDestino.toLowerCase();
    const claveLower = claveDestino.toLowerCase();

    return this.marcasObservacion().find((m) => {
      const mTipo = m.tipoDestino?.toLowerCase();
      const mClave = m.claveDestino?.toLowerCase();

      // Coincidencia directa (campo o archivo previo)
      if (mTipo === tipoLower && mClave === claveLower) {
        return true;
      }

      // Coincidencia de marca por ítem (T-07: tipoDestino = 'item', claveDestino = 'tipo:id')
      if (mTipo === 'item' && mClave) {
        if (mClave === `${tipoLower}:${claveLower}`) {
          return true;
        }

        // Variaciones con guion o guion bajo (p.ej. titulo_en_curso vs titulo-en-curso, experiencia_laboral vs experiencia)
        const tipoNormalizado = tipoLower.replace(/[-_]/g, '');
        const separador = mClave.indexOf(':');
        if (separador > 0) {
          const mPrefijo = mClave.substring(0, separador).replace(/[-_]/g, '');
          const mId = mClave.substring(separador + 1);
          if (
            (mPrefijo === tipoNormalizado ||
              (tipoNormalizado.startsWith('experiencia') && mPrefijo.startsWith('experiencia')) ||
              (tipoNormalizado.startsWith('documento') && mPrefijo.startsWith('documento')) ||
              (tipoNormalizado.startsWith('capacitacion') && mPrefijo.startsWith('curso')) ||
              (tipoNormalizado.startsWith('curso') && mPrefijo.startsWith('capacitacion'))) &&
            mId === claveLower
          ) {
            return true;
          }
        }
      }

      return false;
    });
  }
}
