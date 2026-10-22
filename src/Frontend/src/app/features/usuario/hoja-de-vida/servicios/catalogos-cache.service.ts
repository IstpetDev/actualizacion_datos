import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { CatalogosClient, ElementoCatalogoDto } from '../../../../api-client';

@Injectable({
  providedIn: 'root',
})
export class CatalogosCacheService {
  private readonly cliente = inject(CatalogosClient);
  private readonly cache = new Map<string, ElementoCatalogoDto[]>();
  private readonly peticionesEnVuelo = new Map<string, Observable<ElementoCatalogoDto[]>>();

  /**
   * Obtiene elementos de un catálogo por tipo y opcionalmente filtrados por padreId.
   * Utiliza caché en memoria para garantizar alto rendimiento y cero llamadas redundantes.
   */
  obtener(tipo: string, padreId?: number): Observable<ElementoCatalogoDto[]> {
    const clave = this.construirClave(tipo, padreId);

    if (this.cache.has(clave)) {
      return of(this.cache.get(clave)!);
    }

    if (this.peticionesEnVuelo.has(clave)) {
      return this.peticionesEnVuelo.get(clave)!;
    }

    const peticion = this.cliente.consultarCatalogo(tipo, padreId).pipe(
      tap((elementos) => {
        this.cache.set(clave, elementos ?? []);
        this.peticionesEnVuelo.delete(clave);
      }),
      shareReplay(1),
    );

    this.peticionesEnVuelo.set(clave, peticion);
    return peticion;
  }

  // Accesores semánticos convenientes para la Hoja de Vida
  paises(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('Pais');
  }

  provincias(paisId?: number): Observable<ElementoCatalogoDto[]> {
    return paisId ? this.obtener('Provincia', paisId) : of([]);
  }

  cantones(provinciaId?: number): Observable<ElementoCatalogoDto[]> {
    return provinciaId ? this.obtener('Canton', provinciaId) : of([]);
  }

  parroquias(cantonId?: number): Observable<ElementoCatalogoDto[]> {
    return cantonId ? this.obtener('Parroquia', cantonId) : of([]);
  }

  nivelesAcademicos(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('NivelAcademico');
  }

  gradosAcademicos(nivelId?: number): Observable<ElementoCatalogoDto[]> {
    return nivelId ? this.obtener('GradoAcademico', nivelId) : of([]);
  }

  universidades(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('Universidad');
  }

  estadosCiviles(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('EstadoCivil');
  }

  tiposSangre(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('TipoSangre');
  }

  etnias(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('Etnia');
  }

  discapacidades(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('Discapacidad');
  }

  tiposCapacitacion(): Observable<ElementoCatalogoDto[]> {
    return this.obtener('TipoCapacitacion');
  }

  limpiarCache(): void {
    this.cache.clear();
    this.peticionesEnVuelo.clear();
  }

  private construirClave(tipo: string, padreId?: number): string {
    return padreId !== undefined ? `${tipo}_${padreId}` : tipo;
  }
}
