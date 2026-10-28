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
    descargarArchivo: Mock;
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
      descargarArchivo: vi.fn(),
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
    const archivoGrande = new File(['x'.repeat(100)], 'documento.pdf', {
      type: 'application/pdf',
    });
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
    expect(component.vistaPreviaUrl()).toBeNull();
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

  it('envia_claveDestino_al_subir_archivo_si_esta_definida', () => {
    fixture.componentRef.setInput('claveDestino', 'foto:perfil');
    fixture.detectChanges();

    archivosClientMock.subirArchivo.mockReturnValue(of(mockArchivoDto));

    const archivoValido = new File(['valid'], 'foto.jpg', { type: 'image/jpeg' });
    Object.defineProperty(archivoValido, 'size', { value: 2048 });

    const event = {
      target: {
        files: [archivoValido],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onArchivoSeleccionado(event);

    expect(archivosClientMock.subirArchivo).toHaveBeenCalledWith(
      'foto:perfil',
      undefined,
      expect.objectContaining({ fileName: 'foto.jpg' }),
    );
  });

  it('descarga_archivo_con_exito_usando_el_cliente_de_archivos', () => {
    archivosClientMock.descargarArchivo.mockReturnValue(
      of({ data: new Blob(['pdf-content']), fileName: 'descarga.pdf' }),
    );

    component.descargarArchivo('arch-123');

    expect(archivosClientMock.descargarArchivo).toHaveBeenCalledWith('arch-123');
    expect(component.error()).toBe('');
  });

  it('previsualiza_foto_seleccionada_antes_de_guardar_cuando_el_archivo_es_valido', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.componentRef.setInput('mostrarVistaPrevia', true);
    fixture.detectChanges();

    const urlMock = 'blob:http://localhost/foto-mock-1.jpg';
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue(urlMock);

    archivosClientMock.subirArchivo.mockReturnValue(of(mockArchivoDto));

    const archivoFoto = new File(['foto-bytes'], 'perfil.jpg', { type: 'image/jpeg' });
    Object.defineProperty(archivoFoto, 'size', { value: 2048 });

    const event = {
      target: {
        files: [archivoFoto],
        value: 'dummy',
      },
    } as unknown as Event;

    component.onArchivoSeleccionado(event);
    fixture.detectChanges();

    expect(component.vistaPreviaUrl()).toBe(urlMock);
    expect(component.esSeleccionPendiente()).toBe(true);

    const elementoImg = fixture.nativeElement.querySelector(
      '[data-testid="foto-vista-previa"]',
    ) as HTMLImageElement;
    expect(elementoImg).not.toBeNull();
    expect(elementoImg.src).toContain(urlMock);

    const badgePendiente = fixture.nativeElement.querySelector('[data-testid="badge-pendiente"]');
    expect(badgePendiente?.textContent).toContain('Foto seleccionada (sin guardar)');

    const btnCancelar = fixture.nativeElement.querySelector(
      '[data-testid="btn-cancelar-seleccion"]',
    );
    expect(btnCancelar).not.toBeNull();
  });

  it('reemplaza_la_foto_actualizando_la_vista_previa_con_la_nueva_seleccion', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.componentRef.setInput('mostrarVistaPrevia', true);
    fixture.detectChanges();

    archivosClientMock.subirArchivo.mockReturnValue(of(mockArchivoDto));

    const url1 = 'blob:http://localhost/foto1.jpg';
    const url2 = 'blob:http://localhost/foto2.png';
    globalThis.URL.createObjectURL = vi.fn().mockReturnValueOnce(url1).mockReturnValueOnce(url2);

    const archivo1 = new File(['bytes1'], 'foto1.jpg', { type: 'image/jpeg' });
    Object.defineProperty(archivo1, 'size', { value: 1024 });
    component.onArchivoSeleccionado({
      target: { files: [archivo1], value: '1' },
    } as unknown as Event);
    fixture.detectChanges();

    expect(component.vistaPreviaUrl()).toBe(url1);

    const archivo2 = new File(['bytes2'], 'foto2.png', { type: 'image/png' });
    Object.defineProperty(archivo2, 'size', { value: 2048 });
    component.onArchivoSeleccionado({
      target: { files: [archivo2], value: '2' },
    } as unknown as Event);
    fixture.detectChanges();

    expect(component.vistaPreviaUrl()).toBe(url2);
    expect(archivosClientMock.subirArchivo).toHaveBeenCalledTimes(2);
  });

  it('cancela_la_seleccion_y_restaura_la_foto_guardada_previa', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.componentRef.setInput('mostrarVistaPrevia', true);
    fixture.componentRef.setInput('archivoId', 'arch-guardada-1');
    fixture.componentRef.setInput('archivoIdGuardado', 'arch-guardada-1');
    fixture.detectChanges();

    const spyIdChange = vi.spyOn(component.archivoIdChange, 'emit');

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/nueva.jpg');
    archivosClientMock.subirArchivo.mockReturnValue(of({ ...mockArchivoDto, id: 'arch-nueva-2' }));

    const archivoNuevo = new File(['bytes'], 'nueva.jpg', { type: 'image/jpeg' });
    Object.defineProperty(archivoNuevo, 'size', { value: 1024 });

    component.onArchivoSeleccionado({
      target: { files: [archivoNuevo], value: 'x' },
    } as unknown as Event);
    expect(component.esSeleccionPendiente()).toBe(true);

    component.cancelarSeleccion();

    expect(component.esSeleccionPendiente()).toBe(false);
    expect(component.vistaPreviaUrl()).toBeNull();
    expect(spyIdChange).toHaveBeenCalledWith('arch-guardada-1');
  });

  it('cancela_la_seleccion_sin_foto_guardada_previa_y_limpia_la_vista_previa', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.componentRef.setInput('mostrarVistaPrevia', true);
    fixture.componentRef.setInput('archivoIdGuardado', undefined);
    fixture.detectChanges();

    const spyEliminado = vi.spyOn(component.archivoEliminado, 'emit');

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/nueva.jpg');
    archivosClientMock.subirArchivo.mockReturnValue(of(mockArchivoDto));

    const archivo = new File(['bytes'], 'nueva.jpg', { type: 'image/jpeg' });
    Object.defineProperty(archivo, 'size', { value: 1024 });

    component.onArchivoSeleccionado({
      target: { files: [archivo], value: 'x' },
    } as unknown as Event);
    expect(component.esSeleccionPendiente()).toBe(true);

    component.cancelarSeleccion();

    expect(component.esSeleccionPendiente()).toBe(false);
    expect(component.vistaPreviaUrl()).toBeNull();
    expect(spyEliminado).toHaveBeenCalled();
  });

  it('muestra_foto_persistida_con_enlace_de_descarga_cuando_ya_esta_guardada', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.componentRef.setInput('mostrarVistaPrevia', true);
    fixture.componentRef.setInput('archivoId', 'arch-guardada-100');
    fixture.componentRef.setInput('archivoIdGuardado', 'arch-guardada-100');
    fixture.detectChanges();

    expect(component.esSeleccionPendiente()).toBe(false);
    expect(component.vistaPreviaUrl()).toBeNull();

    const img = fixture.nativeElement.querySelector(
      '[data-testid="foto-persistida"]',
    ) as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('/api/archivos/arch-guardada-100/descargar');

    const badgeGuardada = fixture.nativeElement.querySelector('[data-testid="badge-guardada"]');
    expect(badgeGuardada?.textContent).toContain('Foto guardada');

    const enlaceDescarga = fixture.nativeElement.querySelector(
      '[data-testid="btn-descargar-foto"]',
    ) as HTMLAnchorElement;
    expect(enlaceDescarga).not.toBeNull();
    expect(enlaceDescarga.href).toContain('/api/archivos/arch-guardada-100/descargar');
  });

  it('permite_quitar_foto_persistida_emitiendo_archivoEliminado', () => {
    fixture.componentRef.setInput('soloImagenes', true);
    fixture.componentRef.setInput('mostrarVistaPrevia', true);
    fixture.componentRef.setInput('archivoId', 'arch-guardada-100');
    fixture.componentRef.setInput('archivoIdGuardado', 'arch-guardada-100');
    fixture.detectChanges();

    const spyEliminado = vi.spyOn(component.archivoEliminado, 'emit');

    const btnQuitar = fixture.nativeElement.querySelector(
      '[data-testid="btn-quitar-foto"]',
    ) as HTMLButtonElement;
    expect(btnQuitar).not.toBeNull();

    btnQuitar.click();

    expect(spyEliminado).toHaveBeenCalled();
  });
});
