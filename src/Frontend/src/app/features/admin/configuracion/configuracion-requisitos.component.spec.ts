import politicaPrueba from '../../usuario/hoja-de-vida/servicios/politica-validacion.fixture.json';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  ArchivosClient,
  ConfiguracionClient,
  ConfiguracionDocumentoClient,
  ConfiguracionSeccionesClient,
  PersonaDto,
  PersonasClient,
  PlantillasHojaDeVidaClient,
  RequisitoDocumentoDto,
  TipoDocumentoDto,
  TipoFuncionarioDto,
} from '../../../api-client';
import { AuthService } from '../../../core/auth';
import { ConfiguracionRequisitosComponent } from './configuracion-requisitos.component';

describe('ConfiguracionRequisitosComponent', () => {
  let component: ConfiguracionRequisitosComponent;
  let fixture: ComponentFixture<ConfiguracionRequisitosComponent>;
  let configClientMock: {
    obtenerPoliticaValidacion: Mock;
    listarTiposFuncionario: Mock;
    crearTipoFuncionario: Mock;
    actualizarTipoFuncionario: Mock;
    eliminarTipoFuncionario: Mock;
    listarTiposDocumento: Mock;
    crearTipoDocumento: Mock;
    actualizarTipoDocumento: Mock;
    eliminarTipoDocumento: Mock;
    listarRequisitosDocumento: Mock;
    crearRequisitoDocumento: Mock;
    actualizarRequisitoDocumento: Mock;
    eliminarRequisitoDocumento: Mock;
  };
  let personasClientMock: {
    listarPersonas: Mock;
    asignarTipoFuncionario: Mock;
    asignarTipoFuncionarioMasivo: Mock;
  };
  let authServiceMock: {
    rolActual: Mock;
  };

  const mockTiposFuncionario: TipoFuncionarioDto[] = [
    {
      id: 'tf-001',
      codigo: 'DOCENTE',
      nombre: 'Docente titular',
      esDocente: true,
      activo: true,
    },
  ];

  const mockTiposDocumento: TipoDocumentoDto[] = [
    {
      id: 'td-001',
      codigo: 'CEDULA',
      nombre: 'Cédula de Identidad',
      descripcion: 'Copia a color legible',
      tieneVencimiento: false,
      orden: 1,
      activo: true,
    },
  ];

  const mockRequisitos: RequisitoDocumentoDto[] = [
    {
      id: 'req-001',
      tipoDocumentoId: 'td-001',
      tipoFuncionarioId: undefined,
      esObligatorio: true,
      activo: true,
    },
  ];

  const mockPersonas: PersonaDto[] = [
    {
      id: 'per-001',
      institucionId: 'inst-1',
      documento: '1700000000',
      nombre: 'Docente de Prueba',
      correo: 'docente@ejemplo.test',
      rol: 'usuario',
      accesoHabilitado: true,
      estadoActualizacion: 'Borrador',
      fechaCreacionUtc: new Date(),
      tipoFuncionarioId: 'tf-001',
    },
    {
      id: 'per-002',
      institucionId: 'inst-1',
      documento: '1700000001',
      nombre: 'Administrativo de Prueba',
      correo: 'admin.persona@ejemplo.test',
      rol: 'usuario',
      accesoHabilitado: true,
      estadoActualizacion: 'Borrador',
      fechaCreacionUtc: new Date(),
      tipoFuncionarioId: undefined,
    },
  ];

  beforeEach(async () => {
    configClientMock = {
      obtenerPoliticaValidacion: vi.fn().mockReturnValue(of(politicaPrueba)),
      listarTiposFuncionario: vi.fn().mockReturnValue(of(mockTiposFuncionario)),
      crearTipoFuncionario: vi.fn().mockReturnValue(of(mockTiposFuncionario[0])),
      actualizarTipoFuncionario: vi.fn().mockReturnValue(of(mockTiposFuncionario[0])),
      eliminarTipoFuncionario: vi.fn().mockReturnValue(of(undefined)),
      listarTiposDocumento: vi.fn().mockReturnValue(of(mockTiposDocumento)),
      crearTipoDocumento: vi.fn().mockReturnValue(of(mockTiposDocumento[0])),
      actualizarTipoDocumento: vi.fn().mockReturnValue(of(mockTiposDocumento[0])),
      eliminarTipoDocumento: vi.fn().mockReturnValue(of(undefined)),
      listarRequisitosDocumento: vi.fn().mockReturnValue(of(mockRequisitos)),
      crearRequisitoDocumento: vi.fn().mockReturnValue(of(mockRequisitos[0])),
      actualizarRequisitoDocumento: vi.fn().mockReturnValue(of(mockRequisitos[0])),
      eliminarRequisitoDocumento: vi.fn().mockReturnValue(of(undefined)),
    };

    personasClientMock = {
      listarPersonas: vi.fn().mockReturnValue(of(mockPersonas)),
      asignarTipoFuncionario: vi.fn().mockReturnValue(of({ mensaje: 'Asignado' })),
      asignarTipoFuncionarioMasivo: vi
        .fn()
        .mockReturnValue(
          of({ totalModificados: 1, totalConTipo: 2, totalSinTipo: 0, mensaje: 'Asignado masivo' }),
        ),
    };

    authServiceMock = {
      rolActual: vi.fn().mockReturnValue('admin'),
    };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionRequisitosComponent],
      providers: [
        { provide: ConfiguracionClient, useValue: configClientMock },
        { provide: PersonasClient, useValue: personasClientMock },
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ConfiguracionSeccionesClient,
          useValue: {
            listarSeccionesConfiguracion: vi.fn().mockReturnValue(of([])),
            cambiarEstadoSeccion: vi.fn().mockReturnValue(of({})),
          },
        },
        {
          provide: ConfiguracionDocumentoClient,
          useValue: {
            obtenerConfiguracionDocumento: vi.fn().mockReturnValue(of({})),
            actualizarMarcaDocumento: vi.fn().mockReturnValue(of({})),
            elegirPlantillaDocumento: vi.fn().mockReturnValue(of({})),
            aceptarVersionDocumento: vi.fn().mockReturnValue(of({})),
          },
        },
        {
          provide: PlantillasHojaDeVidaClient,
          useValue: {
            listarPlantillasHojaDeVida: vi.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: ArchivosClient,
          useValue: {
            subirArchivo: vi.fn().mockReturnValue(of({ id: 'mock-archivo-id' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionRequisitosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar datos iniciales si el usuario es admin', () => {
    expect(component).toBeTruthy();
    expect(authServiceMock.rolActual).toHaveBeenCalled();
    expect(configClientMock.listarTiposFuncionario).toHaveBeenCalled();
    expect(configClientMock.listarTiposDocumento).toHaveBeenCalled();
    expect(configClientMock.listarRequisitosDocumento).toHaveBeenCalled();
    expect(personasClientMock.listarPersonas).toHaveBeenCalled();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="configuracion-requisitos-panel"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="error-no-admin"]')).toBeNull();
  });

  it('debe bloquear la visualización si el usuario no es admin', () => {
    authServiceMock.rolActual.mockReturnValue('usuario');
    fixture = TestBed.createComponent(ConfiguracionRequisitosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="error-no-admin"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="config-header"]')).toBeNull();
  });

  it('debe permitir crear un nuevo tipo de funcionario (RF-HDV-012)', () => {
    component.formTfCodigo = 'ADMINISTRATIVO';
    component.formTfNombre = 'Personal Administrativo';
    component.formTfEsDocente = false;

    component.guardarTipoFuncionario();
    fixture.detectChanges();

    expect(configClientMock.crearTipoFuncionario).toHaveBeenCalledWith({
      codigo: 'ADMINISTRATIVO',
      nombre: 'Personal Administrativo',
      esDocente: false,
      activo: true,
    });
  });

  it('oculta el control docente y conserva el atributo al editar y desactivar', () => {
    const pantalla = fixture.nativeElement as HTMLElement;
    expect(pantalla.querySelector('[data-testid="input-tf-esdocente"]')).toBeNull();
    expect(
      Array.from(pantalla.querySelectorAll('th')).map((celda) => celda.textContent?.trim()),
    ).not.toContain('Docente');

    component.iniciarEdicionFuncionario(mockTiposFuncionario[0]);
    component.formTfNombre = 'Nombre ficticio editado';
    component.guardarTipoFuncionario();
    expect(configClientMock.actualizarTipoFuncionario).toHaveBeenCalledWith('tf-001', {
      codigo: 'DOCENTE',
      nombre: 'Nombre ficticio editado',
      esDocente: true,
      activo: true,
    });
    component.alternarActivoFuncionario(mockTiposFuncionario[0]);
    expect(configClientMock.actualizarTipoFuncionario).toHaveBeenLastCalledWith('tf-001', {
      codigo: 'DOCENTE',
      nombre: 'Docente titular',
      esDocente: true,
      activo: false,
    });
  });

  it('sugiere el máximo más uno incluyendo inactivos y conserva el orden al editar', () => {
    const documentos = [1, 4, 7].map((orden) => ({
      ...mockTiposDocumento[0],
      id: `td-${orden}`,
      orden,
      activo: orden !== 7,
    }));
    configClientMock.listarTiposDocumento.mockReturnValue(of(documentos));
    component.cargarDatos();
    expect(component.formTdOrden).toBe(8);
    component.iniciarEdicionDocumento(documentos[1]);
    expect(component.formTdOrden).toBe(4);
    component.cargarDatos();
    expect(component.formTdOrden).toBe(4);
    component.cancelarEdicionDocumento();
    expect(component.formTdOrden).toBe(8);

    configClientMock.listarTiposDocumento.mockReturnValue(of([]));
    component.cargarDatos();
    expect(component.formTdOrden).toBe(1);
  });

  it('recalcula el siguiente orden después de recibir la recarga asíncrona de cada alta', () => {
    expect(component.formTdOrden).toBe(2);
    const recarga = new Subject<TipoDocumentoDto[]>();
    configClientMock.listarTiposDocumento.mockReturnValue(recarga);
    component.formTdCodigo = 'DOCUMENTO_FICTICIO';
    component.formTdNombre = 'Documento ficticio';
    component.guardarTipoDocumento();
    expect(configClientMock.crearTipoDocumento).toHaveBeenCalledWith(
      expect.objectContaining({ orden: 2 }),
    );
    recarga.next([...mockTiposDocumento, { ...mockTiposDocumento[0], id: 'td-002', orden: 2 }]);
    expect(component.formTdOrden).toBe(3);
    component.formTdCodigo = 'OTRO_DOCUMENTO_FICTICIO';
    component.formTdNombre = 'Otro documento ficticio';
    component.guardarTipoDocumento();
    expect(configClientMock.crearTipoDocumento).toHaveBeenLastCalledWith(
      expect.objectContaining({ orden: 3 }),
    );
    recarga.next([...mockTiposDocumento, { ...mockTiposDocumento[0], id: 'td-003', orden: 3 }]);
    expect(component.formTdOrden).toBe(4);
    recarga.complete();
  });

  it('debe permitir crear un nuevo tipo de documento (RF-HDV-012)', () => {
    component.cambiarTab('documentos');
    fixture.detectChanges();

    component.formTdCodigo = 'PAPELETA_VOTACION';
    component.formTdNombre = 'Certificado de Votación';
    component.formTdDescripcion = 'Último proceso electoral';
    component.formTdTieneVencimiento = false;
    component.formTdOrden = 2;

    component.guardarTipoDocumento();
    fixture.detectChanges();

    expect(configClientMock.crearTipoDocumento).toHaveBeenCalledWith({
      codigo: 'PAPELETA_VOTACION',
      nombre: 'Certificado de Votación',
      descripcion: 'Último proceso electoral',
      tieneVencimiento: false,
      orden: 2,
      activo: true,
    });
  });

  it('debe permitir crear un requisito para "Todos" sin tipo de funcionario (RF-HDV-012, Escenario 3)', () => {
    component.cambiarTab('requisitos');
    fixture.detectChanges();

    component.formReqTipoDocumentoId = 'td-001';
    component.formReqTipoFuncionarioId = ''; // Todos
    component.formReqObligatorio = true;

    component.guardarRequisito();
    fixture.detectChanges();

    expect(configClientMock.crearRequisitoDocumento).toHaveBeenCalledWith({
      tipoDocumentoId: 'td-001',
      tipoFuncionarioId: undefined,
      esObligatorio: true,
      activo: true,
    });
  });

  it('debe permitir asignar tipo de funcionario a una persona (RF-HDV-013)', () => {
    component.cambiarTab('asignaciones');
    fixture.detectChanges();

    const persona = component.personas()[0];
    component.asignarTipo(persona, 'tf-001');
    fixture.detectChanges();

    expect(personasClientMock.asignarTipoFuncionario).toHaveBeenCalledWith('per-001', {
      tipoFuncionarioId: 'tf-001',
    });
  });

  it('renderiza_los_botones_de_accion_dentro_del_contenedor_responsivo_acciones_tabla', () => {
    component.cambiarTab('funcionarios');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const celdaAcciones = compiled.querySelector('[data-testid="fila-tf-DOCENTE"] td.text-right');
    expect(celdaAcciones).toBeTruthy();

    const contenedorAcciones = celdaAcciones?.querySelector('.acciones-tabla');
    expect(contenedorAcciones).toBeTruthy();
    expect(contenedorAcciones?.querySelectorAll('button').length).toBe(2);
  });

  it('debe mostrar contadores y destacar visualmente a las personas sin tipo asignado', () => {
    component.cambiarTab('asignaciones');
    fixture.detectChanges();

    expect(component.totalPersonasConTipo()).toBe(1);
    expect(component.totalPersonasSinTipo()).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    const sinTipoBadge = compiled.querySelector('[data-testid="badge-sin-tipo"]');
    expect(sinTipoBadge).not.toBeNull();
    expect(sinTipoBadge?.textContent).toContain('Sin tipo');

    const contadorSinTipo = compiled.querySelector('[data-testid="contador-sin-tipo"]');
    expect(contadorSinTipo?.textContent).toContain('1 persona sin tipo');
  });

  it('debe filtrar personas por texto de búsqueda y por estado de tipo de funcionario', () => {
    component.cambiarTab('asignaciones');
    fixture.detectChanges();

    // Filtro por texto
    component.onBusquedaChange('1700000001');
    fixture.detectChanges();
    expect(component.personasFiltradas().length).toBe(1);
    expect(component.personasFiltradas()[0].documento).toBe('1700000001');

    // Filtro por estado sin tipo
    component.onBusquedaChange('');
    component.onFiltroEstadoChange('sin-tipo');
    fixture.detectChanges();
    expect(component.personasFiltradas().length).toBe(1);
    expect(component.personasFiltradas()[0].id).toBe('per-002');

    // Filtro por estado con tipo
    component.onFiltroEstadoChange('con-tipo');
    fixture.detectChanges();
    expect(component.personasFiltradas().length).toBe(1);
    expect(component.personasFiltradas()[0].id).toBe('per-001');
  });

  it('debe permitir seleccionar personas y ejecutar la asignación masiva', () => {
    component.cambiarTab('asignaciones');
    fixture.detectChanges();

    component.tipoParaAsignacionMasiva.set('tf-001');
    component.toggleSeleccion('per-002');
    fixture.detectChanges();

    expect(component.personasSeleccionadas().has('per-002')).toBe(true);

    component.asignarMasivoSeleccionadas();
    fixture.detectChanges();

    expect(personasClientMock.asignarTipoFuncionarioMasivo).toHaveBeenCalledWith({
      tipoFuncionarioId: 'tf-001',
      personaIds: ['per-002'],
      soloSinTipo: false,
    });
    expect(component.personasSeleccionadas().size).toBe(0);
  });

  it('debe permitir asignar tipo masivamente a todas las personas sin tipo asignado', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.cambiarTab('asignaciones');
    fixture.detectChanges();

    component.tipoParaAsignacionMasiva.set('tf-001');
    fixture.detectChanges();

    component.asignarMasivoSinTipo();
    fixture.detectChanges();

    expect(personasClientMock.asignarTipoFuncionarioMasivo).toHaveBeenCalledWith({
      tipoFuncionarioId: 'tf-001',
      soloSinTipo: true,
    });
  });

  it('debe paginar la lista de personas y permitir cambiar de página', () => {
    component.cambiarTab('asignaciones');
    component.onTamanoPaginaChange(1);
    fixture.detectChanges();

    expect(component.totalPaginasPersonas()).toBe(2);
    expect(component.personasPaginadas().length).toBe(1);
    expect(component.personasPaginadas()[0].id).toBe('per-001');

    component.cambiarPagina(2);
    fixture.detectChanges();

    expect(component.paginaPersonas()).toBe(2);
    expect(component.personasPaginadas()[0].id).toBe('per-002');
  });
});
