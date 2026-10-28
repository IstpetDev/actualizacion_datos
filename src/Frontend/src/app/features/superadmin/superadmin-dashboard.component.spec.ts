import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  InstitucionDto,
  InstitucionesClient,
  PlantillasHojaDeVidaClient,
  SuperadminProteccionDatosClient,
  PersonalInstitucionalClient,
  SupervisoresClient,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { SuperadminDashboardComponent } from './superadmin-dashboard.component';

describe('SuperadminDashboardComponent', () => {
  let component: SuperadminDashboardComponent;
  let fixture: ComponentFixture<SuperadminDashboardComponent>;
  let institucionesClientMock: {
    listarInstituciones: Mock;
    crearInstitucion: Mock;
  };
  let plantillasClientMock: {
    listarPlantillasHojaDeVida: Mock;
  };
  let superadminProteccionDatosClientMock: {
    listarAvisosProteccionDatosInstitucion: Mock;
    publicarAvisoProteccionDatosInstitucion: Mock;
  };
  let authServiceMock: {
    sesion: Mock;
  };

  const institucionesMock: InstitucionDto[] = [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      nombre: 'Instituto Tecnológico Superior Test',
      activa: true,
      fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
    },
  ];

  beforeEach(async () => {
    institucionesClientMock = {
      listarInstituciones: vi.fn().mockReturnValue(of(institucionesMock)),
      crearInstitucion: vi.fn().mockReturnValue(
        of({
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          nombre: 'Nueva Institución Educativa',
          activa: true,
          fechaCreacionUtc: new Date(),
        }),
      ),
    };

    plantillasClientMock = {
      listarPlantillasHojaDeVida: vi.fn().mockReturnValue(of([])),
    };

    superadminProteccionDatosClientMock = {
      listarAvisosProteccionDatosInstitucion: vi.fn().mockReturnValue(of([])),
      publicarAvisoProteccionDatosInstitucion: vi.fn().mockReturnValue(of({})),
    };

    authServiceMock = {
      sesion: vi.fn().mockReturnValue({
        documento: 'superadmin',
        nombre: 'Superadmin Plataforma',
        rol: 'superadmin',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [SuperadminDashboardComponent],
      providers: [
        { provide: InstitucionesClient, useValue: institucionesClientMock },
        { provide: PlantillasHojaDeVidaClient, useValue: plantillasClientMock },
        { provide: SuperadminProteccionDatosClient, useValue: superadminProteccionDatosClientMock },
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: PersonalInstitucionalClient,
          useValue: { listarPersonalInstitucion: () => of([]) },
        },
        { provide: SupervisoresClient, useValue: { listarSupervisores: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperadminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_listar_instituciones_al_iniciar', () => {
    expect(component).toBeTruthy();
    expect(institucionesClientMock.listarInstituciones).toHaveBeenCalled();
    expect(component.instituciones().length).toBe(1);
    expect(component.instituciones()[0].nombre).toContain('Instituto Tecnológico');
  });

  it('abre la gestión de personal de la institución elegida en la tabla', () => {
    const id = institucionesMock[0].id;
    (
      fixture.nativeElement.querySelector(
        '[data-testid="btn-personal-inst-' + id + '"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(component.tabActiva()).toBe('personal');
    expect(component.institucionPersonalId()).toBe(id);
    expect(fixture.nativeElement.querySelector('app-personal-institucional')).not.toBeNull();
  });

  it('permite_registrar_una_nueva_institucion_con_administrador_inicial', () => {
    component.nombreInstitucion = 'Nueva Institución Educativa';
    component.adminDoc = '1700000010';
    component.adminNom = 'Admin Nuevo';
    component.adminCor = 'admin@institucion.test';

    expect(component.formularioValido()).toBe(true);

    component.crearInstitucion();
    fixture.detectChanges();

    expect(institucionesClientMock.crearInstitucion).toHaveBeenCalledWith({
      nombre: 'Nueva Institución Educativa',
      admins: [
        {
          documento: '1700000010',
          nombre: 'Admin Nuevo',
          correo: 'admin@institucion.test',
        },
      ],
    });
    expect(component.mensajeExito()).toContain('registrada exitosamente');
    expect(component.nombreInstitucion).toBe('');
    expect(component.adminDoc).toBe('');
  });

  it('permite_cambiar_a_la_pestana_de_plantillas', () => {
    expect(component.tabActiva()).toBe('instituciones');
    component.tabActiva.set('plantillas');
    fixture.detectChanges();
    expect(component.tabActiva()).toBe('plantillas');
  });

  it('permite_cambiar_a_la_pestana_de_politicas_de_proteccion_de_datos', () => {
    expect(component.tabActiva()).toBe('instituciones');
    component.tabActiva.set('politicas-datos');
    fixture.detectChanges();
    expect(component.tabActiva()).toBe('politicas-datos');
  });

  it('permite_navegar_a_politicas_desde_el_boton_de_la_tabla', () => {
    component.irAPoliticas('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(component.tabActiva()).toBe('politicas-datos');
    expect(component.institucionSeleccionadaParaPoliticas()).toBe(
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
  });
});
