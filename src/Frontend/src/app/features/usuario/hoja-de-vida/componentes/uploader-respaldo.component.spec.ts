import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivoDto, ArchivosClient } from '../../../../api-client';
import { UploaderRespaldoComponent } from './uploader-respaldo.component';

describe('UploaderRespaldoComponent', () => {
  let component: UploaderRespaldoComponent;
  let fixture: ComponentFixture<UploaderRespaldoComponent>;
  let archivosClientMock: {
    subirArchivo: Mock;
  };

  const mockArchivoDto: ArchivoDto = {
    id: 'arch-123',
    institucionId: 'inst-1',
    personaId: 'per-1',
    nombreOriginal: 'titulo.pdf',
    tipoContenido: 'application/pdf',
    tamanoBytes: 1024,
    hashSha256: 'abc',
    claveDestino: undefined,
    fechaSubidaUtc: new Date(),
  };

  beforeEach(async () => {
    archivosClientMock = {
      subirArchivo: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UploaderRespaldoComponent],
      providers: [{ provide: ArchivosClient, useValue: archivosClientMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(UploaderRespaldoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('muestra_alerta_informativa_cuando_el_archivo_supera_los_5_MB', () => {
    // 6 MB
    const archivoGrande = new File(['x'.repeat(100)], 'documento.pdf', { type: 'application/pdf' });
    Object.defineProperty(archivoGrande, 'size', { value: 6 * 1024 * 1024 });

    archivosClientMock.subirArchivo.mockReturnValue(of(mockArchivoDto));

    const event = {
      target: {
        files: [archivoGrande],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onArchivoSeleccionado(event);

    expect(component.avisoTamanio()).toContain('supera los 5 MB');
    expect(archivosClientMock.subirArchivo).toHaveBeenCalled();
  });

  it('rechaza_archivo_cuando_supera_los_10_MB_sin_enviar_al_servidor', () => {
    // 11 MB
    const archivoMuyGrande = new File(['x'], 'pesado.pdf', { type: 'application/pdf' });
    Object.defineProperty(archivoMuyGrande, 'size', { value: 11 * 1024 * 1024 });

    const event = {
      target: {
        files: [archivoMuyGrande],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onArchivoSeleccionado(event);

    expect(component.error()).toContain('10 MB');
    expect(archivosClientMock.subirArchivo).not.toHaveBeenCalled();
  });

  it('rechaza_archivo_si_solo_se_admiten_imagenes_y_se_selecciona_un_pdf', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.detectChanges();

    const archivoPdf = new File(['pdf-data'], 'documento.pdf', { type: 'application/pdf' });

    const event = {
      target: {
        files: [archivoPdf],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onArchivoSeleccionado(event);

    expect(component.error()).toContain('Solo se admiten imágenes');
    expect(archivosClientMock.subirArchivo).not.toHaveBeenCalled();
  });

  it('emite_archivoIdChange_al_subir_archivo_exitosamente', () => {
    archivosClientMock.subirArchivo.mockReturnValue(of(mockArchivoDto));
    const spy = vi.spyOn(component.archivoIdChange, 'emit');

    const archivoValido = new File(['valid'], 'cedula.pdf', { type: 'application/pdf' });
    Object.defineProperty(archivoValido, 'size', { value: 1024 });

    const event = {
      target: {
        files: [archivoValido],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onArchivoSeleccionado(event);

    expect(spy).toHaveBeenCalledWith('arch-123');
  });
});
