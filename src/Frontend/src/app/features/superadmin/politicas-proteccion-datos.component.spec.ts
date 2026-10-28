import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  AvisoInstitucionalDto,
  InstitucionDto,
  InstitucionesClient,
  SuperadminProteccionDatosClient,
} from '../../api-client';
import { PoliticasProteccionDatosComponent } from './politicas-proteccion-datos.component';

describe('PoliticasProteccionDatosComponent', () => {
  let component: PoliticasProteccionDatosComponent;
  let fixture: ComponentFixture<PoliticasProteccionDatosComponent>;
  let institucionesClientMock: {
    listarInstituciones: Mock;
  };
  let superadminProteccionDatosClientMock: {
    listarAvisosProteccionDatosInstitucion: Mock;
    publicarAvisoProteccionDatosInstitucion: Mock;
  };

  const institucionMock: InstitucionDto = {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Instituto Tecnológico Ficticio Central',
    activa: true,
    fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
  };

  const avisoMock: AvisoInstitucionalDto = {
    id: '22222222-2222-2222-2222-222222222222',
    institucionId: '11111111-1111-1111-1111-111111111111',
    version: '1.0.0',
    titulo: 'Aviso Legal de Protección de Datos',
    responsable: 'Oficial de Protección de Datos Ficticio',
    contenido: 'Texto legal íntegro explicativo ficticio...',
    declaracionAceptacion: 'Acepto voluntariamente el tratamiento de mis datos...',
    fuenteOficial: 'https://institucion.test/aviso-legal',
    evidenciaAprobacion: 'Resolución Rectoral Nro. 2026-001',
    rolesDestinatarios: [1, 2, 3],
    vigenteDesdeUtc: new Date('2026-10-01T00:00:00Z'),
    vigenteHastaUtc: undefined,
    esVigente: true,
  };

  beforeEach(async () => {
    institucionesClientMock = {
      listarInstituciones: vi.fn().mockReturnValue(of([institucionMock])),
    };

    superadminProteccionDatosClientMock = {
      listarAvisosProteccionDatosInstitucion: vi.fn().mockReturnValue(of([avisoMock])),
      publicarAvisoProteccionDatosInstitucion: vi.fn().mockReturnValue(of(avisoMock)),
    };

    await TestBed.configureTestingModule({
      imports: [PoliticasProteccionDatosComponent],
      providers: [
        { provide: InstitucionesClient, useValue: institucionesClientMock },
        { provide: SuperadminProteccionDatosClient, useValue: superadminProteccionDatosClientMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PoliticasProteccionDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_seleccionar_la_primera_institucion_cargando_sus_avisos', () => {
    expect(component).toBeTruthy();
    expect(institucionesClientMock.listarInstituciones).toHaveBeenCalled();
    expect(component.institucionSeleccionadaId()).toBe(institucionMock.id);
    expect(
      superadminProteccionDatosClientMock.listarAvisosProteccionDatosInstitucion,
    ).toHaveBeenCalledWith(institucionMock.id);
    expect(component.avisos().length).toBe(1);
    expect(component.avisoVigente()?.version).toBe('1.0.0');
  });

  it('muestra_alerta_de_pendiente_cuando_no_hay_aviso_vigente', () => {
    superadminProteccionDatosClientMock.listarAvisosProteccionDatosInstitucion.mockReturnValue(
      of([]),
    );
    component.seleccionarInstitucion(institucionMock.id);
    fixture.detectChanges();

    expect(component.avisoVigente()).toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="badge-estado-pendiente"]')).toBeTruthy();
  });

  it('valida_formulario_requiriendo_confirmacion_institucional_y_roles', () => {
    component.formVersion = '1.0.0';
    component.formTitulo = 'Título';
    component.formResponsable = 'Responsable';
    component.formFuenteOficial = 'https://ejemplo.test';
    component.formEvidenciaAprobacion = 'Resolución 001';
    component.formContenido = 'Contenido';
    component.formDeclaracionAceptacion = 'Declaración';
    component.formAprobacionConfirmada = false;

    // Sin confirmación institucional debe ser inválido
    expect(component.formularioValido()).toBe(false);

    component.formAprobacionConfirmada = true;
    expect(component.formularioValido()).toBe(true);

    // Sin roles seleccionados debe ser inválido
    component.formRolUsuario = false;
    component.formRolSupervisor = false;
    component.formRolAdmin = false;
    expect(component.formularioValido()).toBe(false);
  });

  it('publica_aviso_con_exito_y_recarga_el_listado', () => {
    component.formVersion = '2.0.0';
    component.formTitulo = 'Aviso Actualizado';
    component.formResponsable = 'Rectorado';
    component.formFuenteOficial = 'https://ejemplo.test/aviso';
    component.formEvidenciaAprobacion = 'Resolución 2026-002';
    component.formContenido = 'Texto nuevo';
    component.formDeclaracionAceptacion = 'Acepto';
    component.formAprobacionConfirmada = true;
    component.formRolUsuario = true;
    component.formRolSupervisor = true;
    component.formRolAdmin = true;

    const nuevoAviso: AvisoInstitucionalDto = {
      ...avisoMock,
      version: '2.0.0',
    };
    superadminProteccionDatosClientMock.publicarAvisoProteccionDatosInstitucion.mockReturnValue(
      of(nuevoAviso),
    );

    component.publicarAviso();
    fixture.detectChanges();

    expect(
      superadminProteccionDatosClientMock.publicarAvisoProteccionDatosInstitucion,
    ).toHaveBeenCalledWith(
      institucionMock.id,
      expect.objectContaining({
        version: '2.0.0',
        aprobacionInstitucionalConfirmada: true,
        rolesDestinatarios: [1, 2, 3],
      }),
    );
    expect(component.mensajeExito()).toContain('publicado exitosamente');
    expect(component.guardando()).toBe(false);
  });

  it('muestra_error_cuando_la_publicacion_falla_por_version_duplicada', () => {
    component.formVersion = '1.0.0';
    component.formTitulo = 'Aviso';
    component.formResponsable = 'Responsable';
    component.formFuenteOficial = 'https://ejemplo.test';
    component.formEvidenciaAprobacion = 'Resolución';
    component.formContenido = 'Texto';
    component.formDeclaracionAceptacion = 'Acepto';
    component.formAprobacionConfirmada = true;

    superadminProteccionDatosClientMock.publicarAvisoProteccionDatosInstitucion.mockReturnValue(
      throwError(() => ({
        status: 400,
        mensaje: 'La versión ya fue publicada.',
      })),
    );

    component.publicarAviso();
    fixture.detectChanges();

    expect(component.error()).toContain('La versión ya fue publicada');
    expect(component.guardando()).toBe(false);
  });

  it('permite_ver_detalle_de_un_aviso_en_el_historial', () => {
    component.verDetalleAviso(avisoMock);
    expect(component.avisoSeleccionado()).toEqual(avisoMock);
  });

  it('mapea_roles_destinatarios_a_nombres_legibles', () => {
    const roles = component.obtenerNombresRoles([1, 2, 3]);
    expect(roles).toEqual(['Usuario', 'Supervisor', 'Admin']);
  });
});
