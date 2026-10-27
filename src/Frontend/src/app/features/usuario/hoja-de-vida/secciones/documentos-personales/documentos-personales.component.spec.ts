import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivosClient, DocumentoRequeridoDto } from '../../../../../api-client';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { DocumentosPersonalesComponent } from './documentos-personales.component';

describe('DocumentosPersonalesComponent', () => {
  let component: DocumentosPersonalesComponent;
  let fixture: ComponentFixture<DocumentosPersonalesComponent>;

  let stateMock: {
    puedeEditar: ReturnType<typeof vi.fn>;
    documentosRequeridos: ReturnType<typeof vi.fn>;
    guardarDocumentoPersonal: Mock;
    obtenerMarcaParaItem: Mock;
  };

  const mockDocs: DocumentoRequeridoDto[] = [
    {
      tipoDocumentoId: 'doc-cedula',
      codigo: 'CEDULA',
      nombre: 'Cédula de Identidad',
      descripcion: 'Copia a color de cédula',
      tieneVencimiento: true,
      esObligatorio: true,
      registrado: {
        id: 'reg-1',
        tipoDocumentoId: 'doc-cedula',
        numeroDocumento: '1712345678',
        entidadEmisora: 'Registro Civil',
        fechaEmision: undefined,
        fechaVencimiento: undefined,
        categoriaLicencia: undefined,
        puntosLicencia: undefined,
        archivoId: 'arch-cedula',
        fechaActualizacionUtc: new Date(),
      },
    },
    {
      tipoDocumentoId: 'doc-mecanizado',
      codigo: 'MECANIZADO',
      nombre: 'Mecanizado IESS',
      descripcion: 'Historial laboral',
      tieneVencimiento: false,
      esObligatorio: true,
      registrado: undefined,
    },
  ];

  beforeEach(async () => {
    stateMock = {
      puedeEditar: vi.fn().mockReturnValue(true),
      documentosRequeridos: vi.fn().mockReturnValue(mockDocs),
      guardarDocumentoPersonal: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DocumentosPersonalesComponent],
      providers: [
        { provide: HojaDeVidaStateService, useValue: stateMock },
        { provide: ArchivosClient, useValue: { subirArchivo: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosPersonalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_renderizar_lista_de_requisitos', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('[data-testid="card-doc-requerido"]');
    expect(cards.length).toBe(2);
    expect(compiled.querySelector('[data-testid="badge-doc-cargado"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="badge-doc-obligatorio"]')).toBeTruthy();
  });

  it('guardarArchivo_invoca_state_guardarDocumentoPersonal', () => {
    component.guardarArchivo(mockDocs[1], 'nuevo-arch-id');

    expect(stateMock.guardarDocumentoPersonal).toHaveBeenCalledWith(
      'doc-mecanizado',
      expect.objectContaining({
        archivoId: 'nuevo-arch-id',
      }),
    );
  });

  it('muestra_mensaje_de_error_si_falla_guardado', () => {
    stateMock.guardarDocumentoPersonal.mockReturnValue(
      throwError(() => ({ mensaje: 'Error de conexión con el servidor.' })),
    );

    component.guardarArchivo(mockDocs[1], 'nuevo-arch-id');
    fixture.detectChanges();

    expect(component.errorMensaje()).toBe('Error de conexión con el servidor.');
  });
});
