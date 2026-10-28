import { casosFicha } from '../../servicios/casos-validacion.fixture';
import politicaPrueba from '../../servicios/politica-validacion.fixture.json';
import { ConfiguracionClient } from '../../../../../api-client';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivosClient, ElementoCatalogoDto, FichaPersonalDto } from '../../../../../api-client';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { FichaPersonalComponent } from './ficha-personal.component';

describe('FichaPersonalComponent', () => {
  let component: FichaPersonalComponent;
  let fixture: ComponentFixture<FichaPersonalComponent>;
  let stateMock: {
    puedeEditar: ReturnType<typeof vi.fn>;
    guardando: ReturnType<typeof vi.fn>;
    ficha: ReturnType<typeof vi.fn>;
    guardarFichaPersonal: Mock;
    obtenerMarcaParaItem: Mock;
    mensajeExito: ReturnType<typeof signal<string>>;
    error: ReturnType<typeof signal<string>>;
  };
  let fichaActual: ReturnType<typeof signal<FichaPersonalDto | undefined>>;
  let catalogosMock: {
    obtener: Mock;
    paises: Mock;
    estadosCiviles: Mock;
    tiposSangre: Mock;
    etnias: Mock;
    provincias: Mock;
    cantones: Mock;
    parroquias: Mock;
    discapacidades: Mock;
  };

  const mockProvincias: ElementoCatalogoDto[] = [
    {
      id: 17,
      tipo: 2,
      codigo: '17',
      nombre: 'Pichincha',
      padreId: 601,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  const mockCantones: ElementoCatalogoDto[] = [
    {
      id: 1701,
      tipo: 3,
      codigo: '1701',
      nombre: 'Quito',
      padreId: 17,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  const mockParroquias: ElementoCatalogoDto[] = [
    {
      id: 170150,
      tipo: 4,
      codigo: '170150',
      nombre: 'Iñaquito',
      padreId: 1701,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  beforeEach(async () => {
    fichaActual = signal<FichaPersonalDto | undefined>(undefined);
    stateMock = {
      puedeEditar: vi.fn().mockReturnValue(true),
      guardando: vi.fn().mockReturnValue(false),
      ficha: vi.fn(() => fichaActual()),
      guardarFichaPersonal: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
      mensajeExito: signal(''),
      error: signal(''),
    };

    catalogosMock = {
      obtener: vi.fn().mockReturnValue(of([])),
      paises: vi.fn().mockReturnValue(of([])),
      estadosCiviles: vi.fn().mockReturnValue(of([])),
      tiposSangre: vi.fn().mockReturnValue(of([])),
      etnias: vi.fn().mockReturnValue(of([])),
      provincias: vi.fn().mockReturnValue(of(mockProvincias)),
      cantones: vi.fn().mockReturnValue(of(mockCantones)),
      parroquias: vi.fn().mockReturnValue(of(mockParroquias)),
      discapacidades: vi.fn().mockReturnValue(of([{ id: 301, nombre: 'Tipo ficticio' }])),
    };

    await TestBed.configureTestingModule({
      imports: [FichaPersonalComponent],
      providers: [
        {
          provide: ConfiguracionClient,
          useValue: { obtenerPoliticaValidacion: () => of(politicaPrueba) },
        },
        { provide: HojaDeVidaStateService, useValue: stateMock },
        { provide: CatalogosCacheService, useValue: catalogosMock },
        { provide: ArchivosClient, useValue: { subirArchivo: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FichaPersonalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_correctamente', () => {
    expect(component).toBeTruthy();
  });

  function cargarFicha(): void {
    catalogosMock.obtener.mockImplementation((tipo: string) =>
      of(tipo === 'Parroquia' ? mockParroquias : tipo === 'Canton' ? mockCantones : []),
    );
    fichaActual.set({
      personaId: 'persona-ficticia',
      fechaActualizacionUtc: new Date(),
      primerNombre: 'Persona',
      primerApellido: 'Ficticia',
      parroquiaResidenciaId: 170150,
      discapacidadId: 301,
      porcentajeDiscapacidad: 25,
      numeroCarnetDiscapacidad: 'CARNE-FICTICIO',
    } as FichaPersonalDto);
    fixture.detectChanges();
  }

  it('rehidrata los tres selectores y conserva residencia y discapacidad al volver a guardar', async () => {
    cargarFicha();
    await fixture.whenStable();
    expect(component.provinciaResidenciaId()).toBe(17);
    expect(component.cantonResidenciaId()).toBe(1701);
    expect(component.cantonesResidencia()).toEqual(mockCantones);
    expect(component.parroquiasResidencia()).toEqual(mockParroquias);
    const parroquia = fixture.nativeElement.querySelector(
      '[name="parroquiaResidenciaId"]',
    ) as HTMLSelectElement;
    expect(parroquia.disabled).toBe(false);
    expect(parroquia.selectedOptions[0].textContent).toContain('Iñaquito');
    const discapacidad = fixture.nativeElement.querySelector(
      '[name="discapacidadId"]',
    ) as HTMLSelectElement;
    expect(discapacidad.selectedOptions[0].textContent).toContain('Tipo ficticio');
    expect(component.tieneCambios()).toBe(false);
    component.guardarFicha();
    expect(stateMock.guardarFichaPersonal).toHaveBeenCalledWith(
      expect.objectContaining({
        parroquiaResidenciaId: 170150,
        discapacidadId: 301,
        porcentajeDiscapacidad: 25,
        numeroCarnetDiscapacidad: 'CARNE-FICTICIO',
      }),
    );
  });

  it('restaura la cascada al descartar y la limpia al cargar una ficha sin residencia', () => {
    cargarFicha();
    component.onProvinciaResidenciaChange(18);
    component.descartarCambios();
    expect(component.provinciaResidenciaId()).toBe(17);
    expect(component.cantonResidenciaId()).toBe(1701);
    expect(component.modelo.parroquiaResidenciaId).toBe(170150);
    fichaActual.set({
      personaId: 'persona-ficticia',
      fechaActualizacionUtc: new Date(),
    } as FichaPersonalDto);
    fixture.detectChanges();
    expect(component.provinciaResidenciaId()).toBeUndefined();
    expect(component.cantonResidenciaId()).toBeUndefined();
    expect(component.parroquiasResidencia()).toEqual([]);
  });

  it('cancela rehidrataciones anteriores cuando se cambia manualmente la residencia', () => {
    cargarFicha();
    const pendientes = new Subject<ElementoCatalogoDto[]>();
    catalogosMock.obtener.mockReturnValue(pendientes);
    component.rehidratarResidencia();
    component.onProvinciaResidenciaChange(18);
    pendientes.next(mockParroquias);
    pendientes.complete();
    expect(component.provinciaResidenciaId()).toBe(18);
    expect(component.cantonResidenciaId()).toBeUndefined();
    expect(component.modelo.parroquiaResidenciaId).toBeUndefined();
  });

  it('conserva la parroquia y permite reintentar si falla su catálogo', () => {
    cargarFicha();
    catalogosMock.obtener.mockReturnValue(throwError(() => new Error('sin conexión')));
    component.rehidratarResidencia();
    fixture.detectChanges();
    expect(component.modelo.parroquiaResidenciaId).toBe(170150);
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar la ubicación guardada');
    cargarFicha();
    expect(component.errorResidencia()).toBe('');
    expect(component.cantonResidenciaId()).toBe(1701);
  });

  it('limpia porcentaje y carné al quitar discapacidad', () => {
    cargarFicha();
    component.onDiscapacidadChange(undefined);
    expect(component.modelo.discapacidadId).toBeUndefined();
    expect(component.modelo.porcentajeDiscapacidad).toBeUndefined();
    expect(component.modelo.numeroCarnetDiscapacidad).toBeUndefined();
  });

  it('muestra confirmación y errores accesibles y conserva cambios tras un guardado fallido', () => {
    stateMock.guardarFichaPersonal.mockImplementation(() => {
      stateMock.mensajeExito.set('Ficha personal guardada exitosamente.');
      return of({});
    });
    component.guardarFicha();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'guardada exitosamente',
    );
    component.modelo.primerNombre = 'Ficticia';
    stateMock.guardarFichaPersonal.mockImplementation(() => {
      stateMock.mensajeExito.set('');
      stateMock.error.set('No se pudo guardar la ficha personal.');
      return throwError(() => new Error('fallo ficticio'));
    });
    component.guardarFicha();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'No se pudo guardar',
    );
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(component.tieneCambios()).toBe(true);
  });

  it('cascada_geografica_cambiar_provincia_carga_cantones', () => {
    component.onProvinciaResidenciaChange(17);

    expect(catalogosMock.cantones).toHaveBeenCalledWith(17);
    expect(component.cantonesResidencia()).toEqual(mockCantones);
    expect(component.cantonResidenciaId()).toBeUndefined();
  });

  it('cascada_geografica_cambiar_canton_carga_parroquias', () => {
    component.onProvinciaResidenciaChange(17);
    component.onCantonResidenciaChange(1701);

    expect(catalogosMock.parroquias).toHaveBeenCalledWith(1701);
    expect(component.parroquiasResidencia()).toEqual(mockParroquias);
  });

  it('bloquea_formulario_en_modo_solo_lectura_cuando_puedeEditar_es_false', () => {
    stateMock.puedeEditar.mockReturnValue(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const fieldsets = compiled.querySelectorAll('fieldset');
    fieldsets.forEach((fs) => {
      expect((fs as HTMLFieldSetElement).disabled).toBe(true);
    });
    expect(compiled.querySelector('[data-testid="btn-guardar-ficha"]')).toBeNull();
  });

  it('guarda_la_ficha_personal_invocando_el_servicio_de_estado', () => {
    component.modelo.primerNombre = 'Juan';
    component.modelo.primerApellido = 'Perez';

    component.guardarFicha();

    expect(stateMock.guardarFichaPersonal).toHaveBeenCalledWith(
      expect.objectContaining({
        primerNombre: 'Juan',
        primerApellido: 'Perez',
      }),
    );
  });
  it('busca las provincias por el id recibido de Ecuador y no por un id fijo', () => {
    catalogosMock.paises.mockReturnValue(
      of([{ id: 9876, tipo: 6, codigo: '218', nombre: 'Ecuador', orden: 1 }]),
    );
    component.ngOnInit();
    expect(catalogosMock.provincias).toHaveBeenLastCalledWith(9876);
    expect(component.provinciasResidencia()).toEqual(mockProvincias);
  });

  it.each(casosFicha)(
    'muestra mensaje y bloquea guardar por %s = %s',
    async (campo, valor, valido) => {
      (component.modelo as Record<string, unknown>)[campo] = valor;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const boton = fixture.nativeElement.querySelector(
        '[data-testid="btn-guardar-ficha"]',
      ) as HTMLButtonElement;
      expect(boton.disabled).toBe(!valido);
      const mensaje = fixture.nativeElement.querySelector('#error-modelo-' + campo);
      if (!valido) expect(mensaje?.textContent?.trim().length).toBeGreaterThan(5);
      if (campo === 'correoInstitucional' && valor.includes('otra-ficticia'))
        expect(mensaje?.textContent).toContain('@institucion-ficticia.example');
      if (!valido) {
        component.guardarFicha();
        component.guardarCambios().subscribe((guardado) => expect(guardado).toBe(false));
        expect(stateMock.guardarFichaPersonal).not.toHaveBeenCalled();
      }
    },
  );

  it('no muestra ni envía perfil; permite guardar un borrador incompleto válido', () => {
    expect(fixture.nativeElement.querySelector('[name="perfil"]')).toBeNull();
    component.modelo = { celular: '0900000000' };
    component.guardarFicha();
    expect(stateMock.guardarFichaPersonal).toHaveBeenCalledWith({ celular: '0900000000' });
  });

  it('detecta_cambios_cuando_se_modifican_campos_y_los_descarta_correctamente', () => {
    component.ngOnInit();
    const originalNombre = component.modelo.primerNombre;
    expect(component.tieneCambios()).toBe(false);

    component.modelo.primerNombre = 'NombreModificado';
    expect(component.tieneCambios()).toBe(true);

    component.descartarCambios();
    expect(component.modelo.primerNombre).toBe(originalNombre);
    expect(component.tieneCambios()).toBe(false);
  });
  describe('Issue #140: sincronizacion y conservacion de parroquia', () => {
    it('seleccionar provincia, canton y parroquia conserva los tres selectores al guardar y recargar desde el primer intento', async () => {
      component.onProvinciaResidenciaChange(17);
      expect(component.provinciaResidenciaId()).toBe(17);
      expect(component.cantonesResidencia()).toEqual(mockCantones);

      component.onCantonResidenciaChange(1701);
      expect(component.cantonResidenciaId()).toBe(1701);
      expect(component.parroquiasResidencia()).toEqual(mockParroquias);

      component.onParroquiaChange(170150);
      expect(component.modelo.parroquiaResidenciaId).toBe(170150);
      expect(component.errorParroquia()).toBe('');
      expect(component.residenciaInvalida()).toBe(false);

      stateMock.guardarFichaPersonal.mockReturnValue(
        of({ parroquiaResidenciaId: 170150 } as FichaPersonalDto),
      );
      component.guardarFicha();
      expect(stateMock.guardarFichaPersonal).toHaveBeenCalledWith(
        expect.objectContaining({ parroquiaResidenciaId: 170150 }),
      );

      fichaActual.set({
        personaId: 'persona-ficticia',
        fechaActualizacionUtc: new Date(),
        primerNombre: 'Persona',
        primerApellido: 'Ficticia',
        parroquiaResidenciaId: 170150,
      } as FichaPersonalDto);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.provinciaResidenciaId()).toBe(17);
      expect(component.cantonResidenciaId()).toBe(1701);
      expect(component.modelo.parroquiaResidenciaId).toBe(170150);
      expect(component.parroquiasResidencia()).toEqual(mockParroquias);
      expect(component.errorParroquia()).toBe('');
    });

    it('cambiar canton invalida de forma visible una parroquia previa y bloquea el guardado silencioso', async () => {
      component.onProvinciaResidenciaChange(17);
      component.onCantonResidenciaChange(1701);
      component.onParroquiaChange(170150);
      expect(component.residenciaInvalida()).toBe(false);

      component.onCantonResidenciaChange(1702);
      fixture.detectChanges();

      expect(component.modelo.parroquiaResidenciaId).toBeUndefined();
      expect(component.errorParroquia()).toContain('Seleccione una parroquia correspondiente al');
      expect(component.residenciaInvalida()).toBe(true);

      const errorSmall = fixture.nativeElement.querySelector('#error-modelo-parroquiaResidenciaId');
      expect(errorSmall).not.toBeNull();
      expect(errorSmall.textContent).toContain('Seleccione una parroquia');

      stateMock.guardarFichaPersonal.mockClear();
      component.guardarFicha();
      expect(stateMock.guardarFichaPersonal).not.toHaveBeenCalled();

      component.onParroquiaChange(170150);
      fixture.detectChanges();
      expect(component.errorParroquia()).toBe('');
      expect(component.residenciaInvalida()).toBe(false);
      component.guardarFicha();
      expect(stateMock.guardarFichaPersonal).toHaveBeenCalledWith(
        expect.objectContaining({ parroquiaResidenciaId: 170150 }),
      );
    });

    it('cambiar provincia invalida de forma visible la parroquia previa', () => {
      component.onProvinciaResidenciaChange(17);
      component.onCantonResidenciaChange(1701);
      component.onParroquiaChange(170150);

      component.onProvinciaResidenciaChange(18);
      expect(component.modelo.parroquiaResidenciaId).toBeUndefined();
      expect(component.errorParroquia()).toContain('provincia elegida');
      expect(component.residenciaInvalida()).toBe(true);
    });

    it('seleccionar el mismo canton o provincia no borra innecesariamente la parroquia ya seleccionada', () => {
      component.onProvinciaResidenciaChange(17);
      component.onCantonResidenciaChange(1701);
      component.onParroquiaChange(170150);

      component.onCantonResidenciaChange(1701);
      expect(component.modelo.parroquiaResidenciaId).toBe(170150);
      expect(component.errorParroquia()).toBe('');

      component.onProvinciaResidenciaChange(17);
      expect(component.modelo.parroquiaResidenciaId).toBe(170150);
      expect(component.errorParroquia()).toBe('');
    });
  });
});
