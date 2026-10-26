import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivosClient, ElementoCatalogoDto } from '../../../../../api-client';
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
  };
  let catalogosMock: {
    paises: Mock;
    estadosCiviles: Mock;
    tiposSangre: Mock;
    etnias: Mock;
    provincias: Mock;
    cantones: Mock;
    parroquias: Mock;
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
    stateMock = {
      puedeEditar: vi.fn().mockReturnValue(true),
      guardando: vi.fn().mockReturnValue(false),
      ficha: vi.fn().mockReturnValue(null),
      guardarFichaPersonal: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    catalogosMock = {
      paises: vi.fn().mockReturnValue(of([])),
      estadosCiviles: vi.fn().mockReturnValue(of([])),
      tiposSangre: vi.fn().mockReturnValue(of([])),
      etnias: vi.fn().mockReturnValue(of([])),
      provincias: vi.fn().mockReturnValue(of(mockProvincias)),
      cantones: vi.fn().mockReturnValue(of(mockCantones)),
      parroquias: vi.fn().mockReturnValue(of(mockParroquias)),
    };

    await TestBed.configureTestingModule({
      imports: [FichaPersonalComponent],
      providers: [
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
});
