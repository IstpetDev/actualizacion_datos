import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { InstitucionDto, InstitucionesClient } from '../../api-client';
import { AuthService } from '../../core/auth';
import { SuperadminDashboardComponent } from './superadmin-dashboard.component';

describe('SuperadminDashboardComponent', () => {
  let component: SuperadminDashboardComponent;
  let fixture: ComponentFixture<SuperadminDashboardComponent>;
  let institucionesClientMock: {
    listarInstituciones: Mock;
    crearInstitucion: Mock;
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
        { provide: AuthService, useValue: authServiceMock },
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
});
