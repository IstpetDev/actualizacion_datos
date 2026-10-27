import politicaPrueba from '../../usuario/hoja-de-vida/servicios/politica-validacion.fixture.json';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  ConfiguracionClient,
  PersonaDto,
  PersonasClient,
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
});
