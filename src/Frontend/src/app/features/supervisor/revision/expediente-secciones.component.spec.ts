import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArchivoDto, HojaDeVidaDto } from '../../../api-client';
import { ExpedienteSeccionesComponent } from './expediente-secciones.component';

describe('ExpedienteSeccionesComponent', () => {
  let component: ExpedienteSeccionesComponent;
  let fixture: ComponentFixture<ExpedienteSeccionesComponent>;

  const mockHdv: HojaDeVidaDto = {
    personaId: 'per-001',
    documento: '1700000000',
    estadoActualizacion: 'Enviado',
    puedeEditar: false,
    ficha: {
      personaId: 'per-001',
      primerNombre: 'Ana',
      segundoNombre: 'Lucia',
      primerApellido: 'Perez',
      segundoApellido: 'Gomez',
      fechaNacimiento: new Date('1990-05-15'),
      correoInstitucional: 'usuario@ejemplo.test',
      celular: '0999999999',
      telefonoConvencional: '022222222',
      callePrincipal: 'Av. Siempre Viva',
      numeroCasa: '123',
      calleSecundaria: 'Calle Falsa',
      referenciaDomicilio: 'Frente al parque',
      codigoPostal: '170150',
      porcentajeDiscapacidad: 35,
      numeroCarnetDiscapacidad: 'CONADIS-1234',
      perfil: 'Docente investigadora',
      fechaActualizacionUtc: new Date(),
    } as unknown as HojaDeVidaDto['ficha'],
    titulos: [
      {
        id: 'tit-001',
        nombreTitulo: 'Licenciada en Educación',
        nombreInstitucionOtra: 'Universidad Ficticia',
        gradoAcademicoId: 3,
        numeroRegistroSenescyt: '1005-15-123456',
        fechaRegistroSenescyt: new Date('2015-08-20'),
        archivoId: 'respaldo-tit-1',
        fechaActualizacionUtc: new Date(),
      } as unknown as HojaDeVidaDto['titulos'][0],
    ],
    titulosEnCurso: [
      {
        id: 'tit-curso-001',
        nombrePrograma: 'Maestría en Pedagogía',
        nombreInstitucionOtra: 'Universidad Ejemplar',
        gradoAcademicoId: 4,
        fechaInicio: new Date('2024-01-10'),
        fechaFinEstimada: new Date('2026-12-15'),
        archivoId: 'respaldo-tit-curso-1',
        fechaActualizacionUtc: new Date(),
      } as unknown as HojaDeVidaDto['titulosEnCurso'][0],
    ],
    capacitaciones: [
      {
        id: 'cap-001',
        nombreEvento: 'Metodologías Ágiles de Aprendizaje',
        institucionOrganizadora: 'Instituto de Capacitación',
        tipoParticipacion: 'Asistente',
        numeroHoras: 40,
        fechaInicio: new Date('2025-03-01'),
        fechaFin: new Date('2025-03-10'),
        financiadaPorInstitucion: false,
        archivoId: 'respaldo-cap-1',
        fechaActualizacionUtc: new Date(),
      } as unknown as HojaDeVidaDto['capacitaciones'][0],
    ],
    experiencias: [
      {
        id: 'exp-001',
        empleador: 'Colegio Experimental',
        cargo: 'Docente de Matemáticas',
        fechaInicio: new Date('2018-09-01'),
        fechaFin: new Date('2023-07-31'),
        trabajaActualmente: false,
        funciones: 'Enseñanza secundaria',
        archivoId: 'respaldo-exp-1',
        fechaActualizacionUtc: new Date(),
      } as unknown as HojaDeVidaDto['experiencias'][0],
    ],
    referencias: [
      {
        id: 'ref-001',
        tipo: 'Personal',
        nombresApellidos: 'Juan Gomez',
        telefono: '0977777777',
        cargoActual: 'Ingeniero',
        empresa: 'Empresa Ficticia',
        fechaActualizacionUtc: new Date(),
      } as unknown as HojaDeVidaDto['referencias'][0],
    ],
  };

  const mockArchivos: ArchivoDto[] = [
    {
      id: 'arc-001',
      institucionId: 'inst-1',
      personaId: 'per-001',
      nombreOriginal: 'cedula_identidad.pdf',
      tipoContenido: 'application/pdf',
      tamanoBytes: 20480,
      hashSha256: 'hash123',
      claveDestino: 'CEDULA',
      fechaSubidaUtc: new Date('2026-10-20T10:00:00Z'),
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteSeccionesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteSeccionesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('hojaDeVida', mockHdv);
    fixture.componentRef.setInput('archivos', mockArchivos);
    fixture.detectChanges();
  });

  it('debe crearse correctamente y mostrar la ficha personal por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.tabActiva()).toBe('ficha');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="panel-exp-ficha"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Ana');
    expect(compiled.textContent).toContain('Perez');
    expect(compiled.textContent).toContain('Docente investigadora');
  });

  it('debe cambiar a pestaña de formación académica y permitir marcar un título (RF-HDV-011)', () => {
    component.cambiarTab('formacion');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="panel-exp-formacion"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Licenciada en Educación');

    let marcaEmitida: { tipo: string; clave: string; label: string } | undefined;
    component.marcarItem.subscribe((evt) => {
      marcaEmitida = evt;
    });

    const btnMarcar = compiled.querySelector(
      '[data-testid="btn-marcar-titulo-tit-001"]',
    ) as HTMLButtonElement;
    expect(btnMarcar).toBeTruthy();
    btnMarcar.click();

    expect(marcaEmitida).toEqual({
      tipo: 'Item',
      clave: 'titulo:tit-001',
      label: 'Licenciada en Educación',
    });
  });

  it('debe emitir la descarga de respaldo al hacer clic en el botón correspondiente', () => {
    component.cambiarTab('formacion');
    fixture.detectChanges();

    let descargaEmitida: { archivoId: string; nombreOriginal: string } | undefined;
    component.descargar.subscribe((evt) => {
      descargaEmitida = evt;
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const btnDescargar = compiled.querySelector(
      '[data-testid="btn-descargar-titulo-tit-001"]',
    ) as HTMLButtonElement;
    expect(btnDescargar).toBeTruthy();
    btnDescargar.click();

    expect(descargaEmitida?.archivoId).toBe('respaldo-tit-1');
  });

  it('debe permitir marcar capacitaciones, experiencias y referencias con clave estable', () => {
    let marcaEmitida: { tipo: string; clave: string; label: string } | undefined;
    component.marcarItem.subscribe((evt) => {
      marcaEmitida = evt;
    });

    // Capacitaciones
    component.cambiarTab('capacitaciones');
    fixture.detectChanges();
    const btnCap = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-marcar-capacitacion-cap-001"]',
    ) as HTMLButtonElement;
    btnCap.click();
    expect(marcaEmitida?.clave).toBe('capacitacion:cap-001');

    // Experiencia
    component.cambiarTab('experiencia');
    fixture.detectChanges();
    const btnExp = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-marcar-experiencia-exp-001"]',
    ) as HTMLButtonElement;
    btnExp.click();
    expect(marcaEmitida?.clave).toBe('experiencia:exp-001');

    // Referencias
    component.cambiarTab('referencias');
    fixture.detectChanges();
    const btnRef = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-marcar-referencia-ref-001"]',
    ) as HTMLButtonElement;
    btnRef.click();
    expect(marcaEmitida?.clave).toBe('referencia:ref-001');
  });

  it('debe listar los documentos y permitir descargarlos y marcarlos', () => {
    component.cambiarTab('documentos');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="item-documento-arc-001"]')).toBeTruthy();
    expect(compiled.textContent).toContain('cedula_identidad.pdf');

    let marcaEmitida: { tipo: string; clave: string; label: string } | undefined;
    component.marcarItem.subscribe((evt) => {
      marcaEmitida = evt;
    });

    const btnMarcarDoc = compiled.querySelector(
      '[data-testid="btn-marcar-documento-arc-001"]',
    ) as HTMLButtonElement;
    btnMarcarDoc.click();
    expect(marcaEmitida).toEqual({
      tipo: 'Item',
      clave: 'documento:arc-001',
      label: 'cedula_identidad.pdf',
    });
  });
});
