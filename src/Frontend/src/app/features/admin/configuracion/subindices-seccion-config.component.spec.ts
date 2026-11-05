import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ConfiguracionClient, SubindiceSeccionDto, TipoFuncionarioDto } from '../../../api-client';
import { SubindicesSeccionConfigComponent } from './subindices-seccion-config.component';

describe('SubindicesSeccionConfigComponent', () => {
  let component: SubindicesSeccionConfigComponent;
  let fixture: ComponentFixture<SubindicesSeccionConfigComponent>;

  let configClientMock: {
    listarSubindicesSeccion: Mock;
    crearSubindiceSeccion: Mock;
    actualizarSubindiceSeccion: Mock;
    eliminarSubindiceSeccion: Mock;
    listarTiposFuncionario: Mock;
  };

  const mockTipos: TipoFuncionarioDto[] = [
    { id: 'tf-doc', codigo: 'DOC', nombre: 'Docente', esDocente: true, activo: true },
  ];

  const mockSubindices: SubindiceSeccionDto[] = [
    {
      id: 'sub-1',
      seccion: 'experiencia',
      nombre: 'Títulos de 3er Nivel',
      descripcion: 'Certificado de tercer nivel',
      tipoFuncionarioId: 'tf-doc',
      esObligatorio: true,
      orden: 1,
      activo: true,
    },
    {
      id: 'sub-2',
      seccion: 'formacion',
      nombre: 'Título SENESCYT',
      descripcion: undefined,
      tipoFuncionarioId: undefined,
      esObligatorio: false,
      orden: 2,
      activo: true,
    },
  ];

  beforeEach(async () => {
    configClientMock = {
      listarSubindicesSeccion: vi.fn().mockReturnValue(of(mockSubindices)),
      crearSubindiceSeccion: vi.fn().mockReturnValue(of(mockSubindices[0])),
      actualizarSubindiceSeccion: vi.fn().mockReturnValue(of(mockSubindices[0])),
      eliminarSubindiceSeccion: vi.fn().mockReturnValue(of(undefined)),
      listarTiposFuncionario: vi.fn().mockReturnValue(of(mockTipos)),
    };

    await TestBed.configureTestingModule({
      imports: [SubindicesSeccionConfigComponent],
      providers: [{ provide: ConfiguracionClient, useValue: configClientMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SubindicesSeccionConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga_y_filtra_subindices_por_seccion', () => {
    expect(component.subindices().length).toBe(2);
    expect(component.subindicesFiltrados().length).toBe(2);

    component.filtroSeccion.set('experiencia');
    expect(component.subindicesFiltrados().length).toBe(1);
    expect(component.subindicesFiltrados()[0].nombre).toBe('Títulos de 3er Nivel');
  });

  it('crea_edita_y_desactiva_subindice_libre', () => {
    component.filtroSeccion.set('experiencia');
    component.abrirFormulario();
    component.modelo.nombre = 'Títulos de 4to Nivel';
    component.modelo.tipoFuncionarioId = 'tf-doc';
    component.modelo.esObligatorio = true;
    component.guardar();

    expect(configClientMock.crearSubindiceSeccion).toHaveBeenCalledWith(
      expect.objectContaining({
        seccion: 'experiencia',
        nombre: 'Títulos de 4to Nivel',
        tipoFuncionarioId: 'tf-doc',
        esObligatorio: true,
      }),
    );

    component.editar(mockSubindices[0]);
    component.modelo.nombre = 'Título SENESCYT Docente';
    component.guardar();
    expect(configClientMock.actualizarSubindiceSeccion).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ nombre: 'Título SENESCYT Docente' }),
    );

    component.desactivar(mockSubindices[0]);
    expect(configClientMock.eliminarSubindiceSeccion).toHaveBeenCalledWith('sub-1');
  });
});
