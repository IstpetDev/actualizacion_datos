import { describe, expect, it } from 'vitest';
import { coincideBusqueda, filtrarCatalogo, normalizarParaBusqueda } from './filtro-busqueda.util';

describe('filtro-busqueda.util', () => {
  describe('normalizarParaBusqueda', () => {
    it('elimina acentos y convierte a minusculas', () => {
      expect(normalizarParaBusqueda('Perú')).toBe('peru');
      expect(normalizarParaBusqueda('Cañar')).toBe('canar');
      expect(normalizarParaBusqueda('PICHINCHA')).toBe('pichincha');
      expect(normalizarParaBusqueda('  ÁÉÍÓÚáéíóú  ')).toBe('aeiouaeiou');
    });

    it('maneja valores vacios o nulos', () => {
      expect(normalizarParaBusqueda(null)).toBe('');
      expect(normalizarParaBusqueda(undefined)).toBe('');
      expect(normalizarParaBusqueda('')).toBe('');
      expect(normalizarParaBusqueda('   ')).toBe('');
    });
  });

  describe('coincideBusqueda', () => {
    it('encuentra coincidencias ignorando mayusculas y tildes', () => {
      expect(coincideBusqueda('República del Ecuador', 'ecuador')).toBe(true);
      expect(coincideBusqueda('República del Ecuador', 'republica')).toBe(true);
      expect(coincideBusqueda('Perú', 'peru')).toBe(true);
      expect(coincideBusqueda('Canadá', 'canada')).toBe(true);
      expect(coincideBusqueda('Sucumbíos', 'sucumbios')).toBe(true);
      expect(coincideBusqueda('Guayas', 'GUAYAS')).toBe(true);
    });

    it('retorna true si el termino de busqueda esta vacio', () => {
      expect(coincideBusqueda('Cualquier texto', '')).toBe(true);
      expect(coincideBusqueda('Cualquier texto', '   ')).toBe(true);
      expect(coincideBusqueda('Cualquier texto', null)).toBe(true);
    });

    it('retorna false si el texto no contiene el termino buscado', () => {
      expect(coincideBusqueda('Ecuador', 'Colombia')).toBe(false);
      expect(coincideBusqueda(null, 'algo')).toBe(false);
    });
  });

  describe('filtrarCatalogo', () => {
    const catalogo = [
      { id: 1, nombre: 'Pichincha' },
      { id: 2, nombre: 'Guayas' },
      { id: 3, nombre: 'Azuay' },
      { id: 4, nombre: 'Cañar' },
      { id: 5, nombre: 'Sucumbíos' },
    ];

    it('filtra elementos ignorando acentos y mayusculas', () => {
      const resultado1 = filtrarCatalogo(catalogo, 'canar');
      expect(resultado1).toEqual([{ id: 4, nombre: 'Cañar' }]);

      const resultado2 = filtrarCatalogo(catalogo, 'sucumbios');
      expect(resultado2).toEqual([{ id: 5, nombre: 'Sucumbíos' }]);

      const resultado3 = filtrarCatalogo(catalogo, 'PICH');
      expect(resultado3).toEqual([{ id: 1, nombre: 'Pichincha' }]);
    });

    it('retorna todos los elementos si el termino esta vacio', () => {
      expect(filtrarCatalogo(catalogo, '')).toEqual(catalogo);
      expect(filtrarCatalogo(catalogo, '  ')).toEqual(catalogo);
      expect(filtrarCatalogo(null, 'algo')).toEqual([]);
    });

    it('conserva el elemento seleccionado aunque no coincida con el termino', () => {
      // Usuario busca 'guayas', pero tiene seleccionado 'Pichincha' (id: 1)
      const resultado = filtrarCatalogo(catalogo, 'guayas', 1);
      expect(resultado.map((x) => x.id)).toContain(1);
      expect(resultado.map((x) => x.id)).toContain(2);
      expect(resultado.length).toBe(2);
    });
  });
});
