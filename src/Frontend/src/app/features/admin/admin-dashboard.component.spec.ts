import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  CampanaDto,
  CampanasClient,
  PersonaDto,
  PersonasClient,
  RevisionClient,
  ResultadoCargaPersonasDto,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let campanasClientMock: {
    obtenerCampanaActiva: Mock;
    listarCampanas: Mock;
    crearCampana: Mock;
  };
  let personasClientMock: {
    listarPersonas: Mock;
    cargarPersonas: Mock;
  };
  let authServiceMock: {
    sesion: Mock;
  };

  const campanaActivaMock: CampanaDto = {
    id: '33333333-3333-3333-3333-333333333333',
    institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    nombre: 'Campaña 2026 Vigente',
    fechaInicioUtc: new Date('2026-10-01T00:00:00Z'),
    fechaFinUtc: new Date('2026-11-01T00:00:00Z'),
    activa: true,
    estaAbierta: true,
  };

  const personasMock: PersonaDto[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      documento: '1700000001',
      rol: 'usuario',
      nombre: 'Usuario Prueba',
      correo: 'usuario@ejemplo.test',
      accesoHabilitado: true,
      debeCambiarContrasena: false,
      estadoActualizacion: 'Borrador',
      fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
    },
  ];

  const resultadoCargaMock: ResultadoCargaPersonasDto = {
    totalRecibidos: 2,
    totalCargados: 2,
    totalDuplicadosOmitidos: 0,
    documentosCargados: ['1700000002', '1700000003'],
  };

  beforeEach(async () => {
    campanasClientMock = {
      obtenerCampanaActiva: vi.fn().mockReturnValue(of(campanaActivaMock)),
      listarCampanas: vi.fn().mockReturnValue(of([campanaActivaMock])),
      crearCampana: vi.fn().mockReturnValue(
        of({
          ...campanaActivaMock,
          nombre: 'Nueva Campaña Test',
        }),
      ),
    };

    personasClientMock = {
      listarPersonas: vi.fn().mockReturnValue(of(personasMock)),
      cargarPersonas: vi.fn().mockReturnValue(of(resultadoCargaMock)),
    };

    authServiceMock = {
      sesion: vi.fn().mockReturnValue({
        documento: '1700000008',
        nombre: 'Admin Test',
        rol: 'admin',
        institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        { provide: CampanasClient, useValue: campanasClientMock },
        { provide: PersonasClient, useValue: personasClientMock },
        { provide: RevisionClient, useValue: { listarEstadosCuentasBancarias: () => of([]) } },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_cargar_campana_activa_y_personas_al_iniciar', () => {
    expect(component).toBeTruthy();
    expect(campanasClientMock.obtenerCampanaActiva).toHaveBeenCalled();
    expect(campanasClientMock.listarCampanas).toHaveBeenCalled();
    expect(personasClientMock.listarPersonas).toHaveBeenCalled();
    expect(component.campanaActiva()?.nombre).toBe('Campaña 2026 Vigente');
  });

  it('permite_crear_una_nueva_campana_con_rango_de_fechas', () => {
    component.nuevoNombreCampana = 'Nueva Campaña 2027';
    component.nuevaFechaInicio = '2027-01-01T08:00';
    component.nuevaFechaFin = '2027-02-01T18:00';

    expect(component.formularioCampanaValido()).toBe(true);

    component.crearCampana();
    fixture.detectChanges();

    expect(campanasClientMock.crearCampana).toHaveBeenCalledWith({
      nombre: 'Nueva Campaña 2027',
      fechaInicioUtc: new Date('2027-01-01T08:00'),
      fechaFinUtc: new Date('2027-02-01T18:00'),
    });
    expect(component.mensajeExito()).toContain('creada exitosamente');
  });

  it('permite_cargar_nomina_de_personas_y_muestra_resultados', () => {
    component.cambiarTab('personas');
    fixture.detectChanges();

    component.filaDoc = '1700000002';
    component.filaNom = 'Segundo Usuario';
    component.filaCor = 'segundo@ejemplo.test';
    component.agregarFilaPersona();

    expect(component.listaParaCargar().length).toBe(1);

    component.enviarCargaPersonas();
    fixture.detectChanges();

    expect(personasClientMock.cargarPersonas).toHaveBeenCalledWith({
      personas: [
        {
          documento: '1700000002',
          nombre: 'Segundo Usuario',
          correo: 'segundo@ejemplo.test',
        },
      ],
    });
    expect(component.resultadoCarga()?.totalCargados).toBe(2);
    expect(component.listaParaCargar().length).toBe(0);
  });

  it('el_admin_si_tiene_habilitada_la_opcion_y_seccion_de_exportacion', () => {
    component.cambiarTab('exportacion');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="tab-exportacion"]')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="btn-exportar-admin"]')).not.toBeNull();
  });
});
