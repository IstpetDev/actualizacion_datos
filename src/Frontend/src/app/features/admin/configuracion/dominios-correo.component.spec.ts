import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ConfiguracionClient, PoliticaValidacionDto } from '../../../api-client';
import { politicaFicticia } from '../../usuario/hoja-de-vida/servicios/casos-validacion.fixture';
import { DominiosCorreoComponent } from './dominios-correo.component';

describe('Configuración de dominios', () => {
  const preparar = (dominios: string[] = []) => {
    const cliente = {
      obtenerPoliticaValidacion: vi
        .fn()
        .mockReturnValue(of({ ...politicaFicticia, dominiosCorreoPermitidos: dominios })),
      guardarDominiosCorreo: vi.fn().mockReturnValue(of(politicaFicticia)),
    };
    TestBed.configureTestingModule({
      imports: [DominiosCorreoComponent],
      providers: [{ provide: ConfiguracionClient, useValue: cliente }],
    });
    const fixture = TestBed.createComponent(DominiosCorreoComponent);
    fixture.detectChanges();
    return { fixture, cliente, componente: fixture.componentInstance };
  };
  it('advierte al admin si no existen dominios y permite configurar varios', () => {
    const { fixture, cliente, componente } = preparar();
    expect(fixture.nativeElement.textContent).toContain('No hay dominios configurados');
    componente.dominios = 'institucion-ficticia.example\notra-ficticia.example';
    componente.guardar();
    fixture.detectChanges();
    expect(cliente.guardarDominiosCorreo).toHaveBeenCalledWith({
      dominiosCorreoPermitidos: ['institucion-ficticia.example', 'otra-ficticia.example'],
    });
    expect(fixture.nativeElement.textContent).toContain('Dominios guardados.');
    expect(componente.dominios).toBe('institucion-ficticia.example');
  });
  it('conserva el texto y muestra un error de campo al rechazar la API', () => {
    const { fixture, cliente, componente } = preparar(['institucion-ficticia.example']);
    cliente.guardarDominiosCorreo.mockReturnValue(
      throwError(() => ({ mensaje: 'Indique dominios DNS válidos.' })),
    );
    componente.dominios = '*.example';
    componente.guardar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'dominios DNS',
    );
    expect(componente.dominios).toBe('*.example');
    expect(componente.ocupado()).toBe(false);
  });
  it('bloquea el botón mientras carga o guarda', () => {
    const { fixture, cliente, componente } = preparar();
    const pendiente = new Subject<PoliticaValidacionDto>();
    cliente.guardarDominiosCorreo.mockReturnValue(pendiente);
    componente.guardar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    pendiente.next(politicaFicticia);
    pendiente.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(false);
  });
});
