import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { CatalogosClient, ElementoCatalogoDto } from '../../../../api-client';
import { CatalogosCacheService } from './catalogos-cache.service';

describe('CatalogosCacheService', () => {
  let service: CatalogosCacheService;
  let catalogosClientMock: {
    consultarCatalogo: Mock;
  };

  const mockPaises: ElementoCatalogoDto[] = [
    {
      id: 601,
      tipo: 1,
      codigo: 'EC',
      nombre: 'Ecuador',
      padreId: undefined,
      codigoExterno: undefined,
      orden: 1,
    },
    {
      id: 602,
      tipo: 1,
      codigo: 'CO',
      nombre: 'Colombia',
      padreId: undefined,
      codigoExterno: undefined,
      orden: 2,
    },
  ];

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

  beforeEach(() => {
    catalogosClientMock = {
      consultarCatalogo: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CatalogosCacheService,
        { provide: CatalogosClient, useValue: catalogosClientMock },
      ],
    });

    service = TestBed.inject(CatalogosCacheService);
  });

  it('debe_crearse_correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('obtiene_catalogos_y_los_almacena_en_cache_sin_repetir_llamadas', () => {
    catalogosClientMock.consultarCatalogo.mockReturnValue(of(mockPaises));

    let resultado1: ElementoCatalogoDto[] = [];
    service.paises().subscribe((p) => (resultado1 = p));
    expect(resultado1).toEqual(mockPaises);
    expect(catalogosClientMock.consultarCatalogo).toHaveBeenCalledTimes(1);

    // Segunda llamada debe salir de memoria sin invocar nuevamente el cliente HTTP
    let resultado2: ElementoCatalogoDto[] = [];
    service.paises().subscribe((p) => (resultado2 = p));
    expect(resultado2).toEqual(mockPaises);
    expect(catalogosClientMock.consultarCatalogo).toHaveBeenCalledTimes(1);
  });

  it('consulta_con_padreId_diferenciando_claves_en_cache', () => {
    catalogosClientMock.consultarCatalogo.mockReturnValue(of(mockProvincias));

    let provincias: ElementoCatalogoDto[] = [];
    service.provincias(601).subscribe((p) => (provincias = p));

    expect(catalogosClientMock.consultarCatalogo).toHaveBeenCalledWith('Provincia', 601);
    expect(provincias).toEqual(mockProvincias);
  });

  it('devuelve_lista_vacia_si_no_se_provee_padreId_en_cascadas', () => {
    let provincias: ElementoCatalogoDto[] = [];
    service.provincias(undefined).subscribe((p) => (provincias = p));

    expect(provincias).toEqual([]);
    expect(catalogosClientMock.consultarCatalogo).not.toHaveBeenCalled();
  });

  it('limpia_el_cache_correctamente', () => {
    catalogosClientMock.consultarCatalogo.mockReturnValue(of(mockPaises));

    service.paises().subscribe();
    expect(catalogosClientMock.consultarCatalogo).toHaveBeenCalledTimes(1);

    service.limpiarCache();

    service.paises().subscribe();
    expect(catalogosClientMock.consultarCatalogo).toHaveBeenCalledTimes(2);
  });

  it('obtiene_tipos_de_capacitacion', () => {
    catalogosClientMock.consultarCatalogo.mockReturnValue(of([]));
    service.tiposCapacitacion().subscribe();
    expect(catalogosClientMock.consultarCatalogo).toHaveBeenCalledWith(
      'TipoCapacitacion',
      undefined,
    );
  });
});
