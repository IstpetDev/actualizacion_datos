import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonaDto, PersonalInstitucionalClient, SupervisoresClient } from '../../api-client';
import { PersonalInstitucionalComponent } from './personal-institucional.component';

describe('PersonalInstitucionalComponent', () => {
  let fixture: ComponentFixture<PersonalInstitucionalComponent>;
  let componente: PersonalInstitucionalComponent;
  const institucionA = '00000000-0000-0000-0000-000000000001';
  const institucionB = '00000000-0000-0000-0000-000000000002';
  const persona: PersonaDto = {
    id: '00000000-0000-0000-0000-000000000129',
    institucionId: institucionA,
    documento: '0000000000',
    nombre: 'Persona Ficticia',
    correo: 'persona@ejemplo.test',
    rol: 'Supervisor',
    accesoHabilitado: true,
    estadoActualizacion: 'Borrador',
    fechaCreacionUtc: new Date(),
    tieneFicha: true,
    tipoFuncionarioId: undefined,
  };
  const global = {
    listarPersonalInstitucion: vi.fn(),
    asignarPersonalInstitucion: vi.fn(),
  };
  const supervisores = { listarSupervisores: vi.fn(), asignarSupervisor: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    global.listarPersonalInstitucion.mockReturnValue(of([]));
    global.asignarPersonalInstitucion.mockReturnValue(of(persona));
    supervisores.listarSupervisores.mockReturnValue(of([]));
    supervisores.asignarSupervisor.mockReturnValue(of(persona));
    await TestBed.configureTestingModule({
      imports: [PersonalInstitucionalComponent],
      providers: [
        { provide: PersonalInstitucionalClient, useValue: global },
        { provide: SupervisoresClient, useValue: supervisores },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PersonalInstitucionalComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('admin lista supervisores y no ofrece roles administrativos', () => {
    expect(supervisores.listarSupervisores).toHaveBeenCalled();
    expect(global.listarPersonalInstitucion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#rol-personal')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No hay supervisores asignados.');
  });

  it('admin registra supervisor y emite la actualización sin duplicar filas', () => {
    const emitido = vi.spyOn(componente.asignado, 'emit');
    componente.modelo = { documento: '0000000000', rol: 'Admin' };
    componente.guardar();
    expect(supervisores.asignarSupervisor).toHaveBeenCalledWith({
      documento: '0000000000',
      rol: 'Supervisor',
    });
    componente.modelo = { documento: '0000000000', rol: 'Supervisor' };
    componente.guardar();
    expect(componente.personal()).toEqual([persona]);
    expect(emitido).toHaveBeenCalledTimes(2);
    expect(componente.exito()).toContain('Asignación guardada');
    expect(componente.modelo.documento).toBe('');
  });

  it.each(['Admin', 'Supervisor'])('superadmin asigna %s a la institución seleccionada', (rol) => {
    fixture.componentRef.setInput('institucionId', institucionB);
    fixture.detectChanges();
    componente.modelo = {
      documento: '0000000000',
      rol,
      nombre: 'Persona Ficticia',
      correo: 'persona@ejemplo.test',
    };
    componente.guardar();
    expect(global.listarPersonalInstitucion).toHaveBeenCalledWith(institucionB);
    expect(global.asignarPersonalInstitucion).toHaveBeenCalledWith(
      institucionB,
      expect.objectContaining({ rol, documento: '0000000000' }),
    );
    expect(supervisores.asignarSupervisor).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#rol-personal')).not.toBeNull();
  });

  it('una respuesta tardía no mezcla personal entre instituciones', () => {
    const pendiente = new Subject<PersonaDto[]>();
    global.listarPersonalInstitucion.mockReturnValueOnce(pendiente).mockReturnValueOnce(of([]));
    fixture.componentRef.setInput('institucionId', institucionA);
    fixture.detectChanges();
    expect(componente.cargando()).toBe(true);
    fixture.componentRef.setInput('institucionId', institucionB);
    fixture.detectChanges();
    pendiente.next([persona]);
    pendiente.complete();
    expect(componente.personal()).toEqual([]);
    expect(componente.cargando()).toBe(false);
  });

  it('cambiar institución limpia formulario y descarta la respuesta de un guardado anterior', () => {
    const pendiente = new Subject<PersonaDto>();
    global.asignarPersonalInstitucion.mockReturnValue(pendiente);
    fixture.componentRef.setInput('institucionId', institucionA);
    fixture.detectChanges();
    componente.modelo = { documento: '0000000000', rol: 'Admin' };
    componente.guardar();
    expect(componente.guardando()).toBe(true);
    fixture.componentRef.setInput('institucionId', institucionB);
    fixture.detectChanges();
    pendiente.next(persona);
    pendiente.complete();
    expect(componente.guardando()).toBe(false);
    expect(componente.modelo.documento).toBe('');
    expect(componente.exito()).toBe('');
    expect(componente.personal()).toEqual([]);
  });

  it('muestra error de guardado sin perder datos y permite reintentar', () => {
    supervisores.asignarSupervisor.mockReturnValueOnce(
      throwError(() => ({ mensaje: 'No se pudo guardar la asignación.' })),
    );
    componente.modelo = { documento: '0000000000', rol: 'Supervisor', nombre: 'Persona Ficticia' };
    componente.guardar();
    fixture.detectChanges();
    expect(componente.modelo.documento).toBe('0000000000');
    expect(componente.guardando()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No se pudo guardar',
    );
    componente.guardar();
    fixture.detectChanges();
    expect(componente.errorGuardado()).toBe('');
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Asignación guardada',
    );
  });

  it('ofrece reintento de carga y muestra el listado recuperado', () => {
    supervisores.listarSupervisores.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    componente.cargar();
    fixture.detectChanges();
    expect(componente.errorCarga()).toContain('No se pudo conectar');
    supervisores.listarSupervisores.mockReturnValueOnce(of([persona]));
    componente.cargar();
    fixture.detectChanges();
    expect(componente.errorCarga()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Persona Ficticia');
  });

  it('seleccionar una cuenta prepara solo documento y rol', () => {
    componente.seleccionar(persona);
    expect(componente.modelo).toEqual({ documento: '0000000000', rol: 'Supervisor' });
  });

  it('bloquea el botón con documento o correo inválidos y durante la carga', async () => {
    componente.modelo = { documento: 'corto', rol: 'Supervisor' };
    fixture.detectChanges();
    await fixture.whenStable();
    const boton = fixture.nativeElement.querySelector(
      '[data-testid="guardar-personal"]',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    componente.guardar();
    expect(supervisores.asignarSupervisor).not.toHaveBeenCalled();
    componente.modelo = { documento: '0000000000', rol: 'Supervisor', correo: 'correo-invalido' };
    fixture.detectChanges();
    await fixture.whenStable();
    expect(boton.disabled).toBe(true);
    const pendiente = new Subject<PersonaDto[]>();
    supervisores.listarSupervisores.mockReturnValue(pendiente);
    componente.cargar();
    componente.modelo = { documento: '0000000000', rol: 'Supervisor' };
    componente.guardar();
    expect(supervisores.asignarSupervisor).not.toHaveBeenCalled();
  });
});
