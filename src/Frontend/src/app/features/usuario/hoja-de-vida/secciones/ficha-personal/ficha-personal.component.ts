import {
  ValidacionHojaDeVidaService,
  fechaPolitica,
} from '../../servicios/validacion-hoja-de-vida.service';
import { fechaSinHora } from '../../servicios/fecha-sin-hora';
import { CommonModule } from '@angular/common';
import { DestroyRef, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ElementoCatalogoDto, GuardarFichaPersonalRequest } from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { UploaderRespaldoComponent } from '../../componentes/uploader-respaldo.component';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-ficha-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, UploaderRespaldoComponent, MarcaObservacionComponent],
  template: `
    @if (validacion.errorCarga()) {
      <p role="alert">
        {{ validacion.errorCarga() }}
        <button type="button" (click)="validacion.cargar()">Reintentar</button>
      </p>
    }

    <section class="seccion-ficha" data-testid="seccion-ficha-personal">
      <header class="seccion-header">
        <h2 class="seccion-titulo">1. Ficha y Datos Personales</h2>
        <p class="seccion-desc">
          Información básica de identificación, lugar de nacimiento, residencia y contacto. Los
          campos marcados con (*) son obligatorios para enviar a revisión.
        </p>
      </header>

      <!-- Marca de observación del supervisor si existe sobre la Ficha -->
      <app-marca-observacion [marca]="marcaFicha()"></app-marca-observacion>

      <form (ngSubmit)="guardarFicha()" class="formulario-ficha" data-testid="form-ficha">
        <!-- 1. IDENTIFICACIÓN Y NOMBRES -->
        <fieldset class="grupo-campos" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">Identificación y Nombres</legend>

          <div class="grid-cuatro">
            <div class="form-group">
              <label for="primerNombre">Primer Nombre <span class="text-danger">*</span></label>
              <input
                [attr.aria-describedby]="'error-modelo-primerNombre'"
                id="primerNombre"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.primerNombre"
                name="primerNombre"
                required
                data-testid="input-primer-nombre"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'primerNombre'); as mensaje) {
                <small id="error-modelo-primerNombre" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="segundoNombre">Segundo Nombre</label>
              <input
                [attr.aria-describedby]="'error-modelo-segundoNombre'"
                id="segundoNombre"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.segundoNombre"
                name="segundoNombre"
                data-testid="input-segundo-nombre"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'segundoNombre'); as mensaje) {
                <small id="error-modelo-segundoNombre" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="primerApellido">Primer Apellido <span class="text-danger">*</span></label>
              <input
                [attr.aria-describedby]="'error-modelo-primerApellido'"
                id="primerApellido"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.primerApellido"
                name="primerApellido"
                required
                data-testid="input-primer-apellido"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'primerApellido'); as mensaje) {
                <small id="error-modelo-primerApellido" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="segundoApellido">Segundo Apellido</label>
              <input
                [attr.aria-describedby]="'error-modelo-segundoApellido'"
                id="segundoApellido"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.segundoApellido"
                name="segundoApellido"
                data-testid="input-segundo-apellido"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'segundoApellido'); as mensaje) {
                <small id="error-modelo-segundoApellido" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-tres mt-3">
            <div class="form-group">
              <label for="sexo">Sexo *</label
              ><select
                [attr.aria-describedby]="'error-modelo-sexoId'"
                id="sexo"
                name="sexoId"
                [(ngModel)]="modelo.sexoId"
                class="form-control"
              >
                <option [ngValue]="undefined">Seleccione...</option>
                @for (item of sexos(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'sexoId'); as mensaje) {
                <small id="error-modelo-sexoId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
            <div class="form-group">
              <label for="paisNacimiento">País de nacimiento *</label
              ><select
                [attr.aria-describedby]="'error-modelo-paisNacimientoId'"
                id="paisNacimiento"
                name="paisNacimientoId"
                [(ngModel)]="modelo.paisNacimientoId"
                class="form-control"
              >
                <option [ngValue]="undefined">Seleccione...</option>
                @for (item of paises(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'paisNacimientoId'); as mensaje) {
                <small id="error-modelo-paisNacimientoId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
            <div class="form-group">
              <label for="fechaNacimiento"
                >Fecha de Nacimiento <span class="text-danger">*</span></label
              >
              <input
                [attr.aria-describedby]="'error-modelo-fechaNacimiento'"
                id="fechaNacimiento"
                type="date"
                class="form-control"
                [ngModel]="fechaNacimientoStr"
                (ngModelChange)="onFechaNacimientoChange($event)"
                name="fechaNacimiento"
                [min]="fechaPolitica(validacion.politica()?.fechaNacimientoMinima)"
                [max]="fechaPolitica(validacion.politica()?.fechaNacimientoMaxima)"
                required
                data-testid="input-fecha-nacimiento"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'fechaNacimiento'); as mensaje) {
                <small id="error-modelo-fechaNacimiento" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="estadoCivil">Estado Civil <span class="text-danger">*</span></label>
              <select
                [attr.aria-describedby]="'error-modelo-estadoCivilId'"
                id="estadoCivil"
                class="form-control"
                [(ngModel)]="modelo.estadoCivilId"
                name="estadoCivilId"
                required
                data-testid="select-estado-civil"
              >
                <option [ngValue]="undefined">Seleccione un estado civil...</option>
                @for (item of estadosCiviles(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'estadoCivilId'); as mensaje) {
                <small id="error-modelo-estadoCivilId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="tipoSangre">Tipo de Sangre</label>
              <select
                [attr.aria-describedby]="'error-modelo-tipoSangreId'"
                id="tipoSangre"
                class="form-control"
                [(ngModel)]="modelo.tipoSangreId"
                name="tipoSangreId"
                data-testid="select-tipo-sangre"
              >
                <option [ngValue]="undefined">Seleccione...</option>
                @for (item of tiposSangre(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'tipoSangreId'); as mensaje) {
                <small id="error-modelo-tipoSangreId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>
        </fieldset>

        <!-- 2. NACIONALIDAD Y ORIGEN -->
        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">Origen y Nacionalidad</legend>

          <div class="grid-tres">
            <div class="form-group">
              <label for="paisNacionalidad"
                >País de Nacionalidad <span class="text-danger">*</span></label
              >
              <select
                [attr.aria-describedby]="'error-modelo-paisNacionalidadId'"
                id="paisNacionalidad"
                class="form-control"
                [(ngModel)]="modelo.paisNacionalidadId"
                name="paisNacionalidadId"
                required
                data-testid="select-nacionalidad"
              >
                <option [ngValue]="undefined">Seleccione país...</option>
                @for (item of paises(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'paisNacionalidadId'); as mensaje) {
                <small id="error-modelo-paisNacionalidadId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="etnia">Autoidentificación Étnica</label>
              <select
                [attr.aria-describedby]="'error-modelo-etniaId'"
                id="etnia"
                class="form-control"
                [(ngModel)]="modelo.etniaId"
                name="etniaId"
                data-testid="select-etnia"
              >
                <option [ngValue]="undefined">Seleccione etnia...</option>
                @for (item of etnias(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'etniaId'); as mensaje) {
                <small id="error-modelo-etniaId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>
        </fieldset>

        <!-- 3. RESIDENCIA Y DIRECCIÓN (CASCADA GEOGRÁFICA) -->
        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">Lugar de Residencia (División Política INEC)</legend>

          <div class="grid-tres">
            <div class="form-group">
              <label for="provinciaResidencia">Provincia</label>
              <select
                id="provinciaResidencia"
                class="form-control"
                [ngModel]="provinciaResidenciaId()"
                (ngModelChange)="onProvinciaResidenciaChange($event)"
                name="provinciaResidencia"
                data-testid="select-provincia-residencia"
              >
                <option [ngValue]="undefined">Seleccione provincia...</option>
                @for (item of provinciasResidencia(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="cantonResidencia">Cantón</label>
              <select
                id="cantonResidencia"
                class="form-control"
                [ngModel]="cantonResidenciaId()"
                (ngModelChange)="onCantonResidenciaChange($event)"
                [disabled]="!provinciaResidenciaId()"
                name="cantonResidencia"
                data-testid="select-canton-residencia"
              >
                <option [ngValue]="undefined">Seleccione cantón...</option>
                @for (item of cantonesResidencia(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="parroquiaResidencia">Parroquia <span class="text-danger">*</span></label>
              <select
                [attr.aria-describedby]="'error-modelo-parroquiaResidenciaId'"
                id="parroquiaResidencia"
                class="form-control"
                [(ngModel)]="modelo.parroquiaResidenciaId"
                [disabled]="!cantonResidenciaId()"
                name="parroquiaResidenciaId"
                required
                data-testid="select-parroquia-residencia"
              >
                <option [ngValue]="undefined">Seleccione parroquia...</option>
                @for (item of parroquiasResidencia(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'ficha', 'parroquiaResidenciaId'); as mensaje) {
                <small id="error-modelo-parroquiaResidenciaId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-dos mt-3">
            <div class="form-group">
              <label for="callePrincipal">Calle Principal <span class="text-danger">*</span></label>
              <input
                [attr.aria-describedby]="'error-modelo-callePrincipal'"
                id="callePrincipal"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.callePrincipal"
                name="callePrincipal"
                required
                data-testid="input-calle-principal"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'callePrincipal'); as mensaje) {
                <small id="error-modelo-callePrincipal" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="calleSecundaria">Calle Secundaria</label>
              <input
                [attr.aria-describedby]="'error-modelo-calleSecundaria'"
                id="calleSecundaria"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.calleSecundaria"
                name="calleSecundaria"
                data-testid="input-calle-secundaria"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'calleSecundaria'); as mensaje) {
                <small id="error-modelo-calleSecundaria" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-tres mt-3">
            <div class="form-group">
              <label for="numeroCasa">Número de Casa / Lote</label>
              <input
                [attr.aria-describedby]="'error-modelo-numeroCasa'"
                id="numeroCasa"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.numeroCasa"
                name="numeroCasa"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'numeroCasa'); as mensaje) {
                <small id="error-modelo-numeroCasa" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="referenciaDomicilio">Referencia de Ubicación</label>
              <input
                [attr.aria-describedby]="'error-modelo-referenciaDomicilio'"
                id="referenciaDomicilio"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.referenciaDomicilio"
                name="referenciaDomicilio"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'referenciaDomicilio'); as mensaje) {
                <small id="error-modelo-referenciaDomicilio" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="codigoPostal">Código Postal</label>
              <input
                [attr.aria-describedby]="'error-modelo-codigoPostal'"
                id="codigoPostal"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.codigoPostal"
                name="codigoPostal"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'codigoPostal'); as mensaje) {
                <small id="error-modelo-codigoPostal" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>
        </fieldset>

        <!-- 4. CONTACTO -->
        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">Datos de Contacto</legend>

          <div class="grid-tres">
            <div class="form-group">
              <label for="celular">Teléfono Celular <span class="text-danger">*</span></label>
              <input
                [attr.aria-describedby]="'error-modelo-celular'"
                id="celular"
                type="tel"
                class="form-control"
                [(ngModel)]="modelo.celular"
                name="celular"
                placeholder="0999999999"
                required
                data-testid="input-celular"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'celular'); as mensaje) {
                <small id="error-modelo-celular" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="telefonoConvencional">Teléfono Convencional</label>
              <input
                [attr.aria-describedby]="'error-modelo-telefonoConvencional'"
                id="telefonoConvencional"
                type="tel"
                class="form-control"
                [(ngModel)]="modelo.telefonoConvencional"
                name="telefonoConvencional"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'telefonoConvencional'); as mensaje) {
                <small id="error-modelo-telefonoConvencional" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="correoInstitucional"
                >Correo Institucional <span class="text-danger">*</span></label
              >
              <input
                [attr.aria-describedby]="'error-modelo-correoInstitucional'"
                id="correoInstitucional"
                type="email"
                class="form-control"
                [(ngModel)]="modelo.correoInstitucional"
                name="correoInstitucional"
                required
                data-testid="input-correo-inst"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'correoInstitucional'); as mensaje) {
                <small id="error-modelo-correoInstitucional" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>
        </fieldset>

        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">Discapacidad (si corresponde)</legend>
          <div class="grid-dos">
            <div class="form-group">
              <label for="porcentajeDiscapacidad">Porcentaje de discapacidad</label
              ><input
                class="form-control"
                id="porcentajeDiscapacidad"
                name="porcentajeDiscapacidad"
                type="number"
                [(ngModel)]="modelo.porcentajeDiscapacidad"
                min="0"
                max="100"
                step="1"
                aria-describedby="error-porcentaje"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'porcentajeDiscapacidad'); as mensaje) {
                <small id="error-porcentaje" class="text-danger" role="alert">{{ mensaje }}</small>
              }
            </div>
            <div class="form-group">
              <label for="numeroCarnetDiscapacidad">Número de carné</label
              ><input
                class="form-control"
                id="numeroCarnetDiscapacidad"
                name="numeroCarnetDiscapacidad"
                [(ngModel)]="modelo.numeroCarnetDiscapacidad"
                aria-describedby="error-carnet"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'numeroCarnetDiscapacidad'); as mensaje) {
                <small id="error-carnet" class="text-danger" role="alert">{{ mensaje }}</small>
              }
            </div>
          </div>
        </fieldset>
        <!-- 5. FOTOGRAFÍA (spec-0007) -->
        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">Fotografía</legend>

          <p>
            El perfil profesional se genera automáticamente a partir de su formación y trayectoria
            al revisar y exportar la hoja de vida.
          </p>

          <div class="mt-3">
            <app-uploader-respaldo
              etiqueta="Foto de Perfil Personal"
              ayuda="Formatos permitidos: JPG, PNG (máx. 10 MB)"
              [soloImagenes]="true"
              [requerido]="false"
              [puedeEditar]="puedeEditar()"
              [archivoId]="modelo.fotoArchivoId"
              (archivoIdChange)="onFotoSubida($event)"
              (archivoEliminado)="onFotoEliminada()"
            ></app-uploader-respaldo>
          </div>
        </fieldset>

        <!-- Botón de Guardado -->
        @if (puedeEditar()) {
          <div class="acciones-form mt-4">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="guardando() || validacion.invalido(modelo, 'ficha')"
              data-testid="btn-guardar-ficha"
            >
              {{ guardando() ? 'Guardando cambios...' : 'Guardar Ficha Personal' }}
            </button>
          </div>
        }
      </form>
    </section>
  `,
  styles: [
    `
      .seccion-ficha {
        padding: 1.25rem 0;
      }
      .seccion-header {
        margin-bottom: 1.5rem;
      }
      .seccion-titulo {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem 0;
      }
      .seccion-desc {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
      }
      .grupo-campos {
        border: 1px solid var(--geist-border, #eaeaea);
        border-radius: var(--radius-md, 8px);
        padding: 1.35rem;
        background: var(--geist-surface, #ffffff);
      }
      .grupo-titulo {
        font-size: 0.95rem;
        font-weight: 700;
        color: #334155;
        padding: 0 0.5rem;
      }
      .grid-cuatro {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .grid-tres {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .grid-dos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-group label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #475569;
      }
      .form-control {
        padding: 0.5rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.875rem;
        color: #1e293b;
        background-color: #ffffff;
      }
      .form-control:focus {
        outline: none;
        border-color: var(--ammi-primary, #1d1e1c);
        box-shadow: 0 0 0 2px rgba(252, 234, 30, 0.45);
      }
      .form-control:disabled {
        background-color: #f8fafc;
        color: #64748b;
        cursor: not-allowed;
      }
      .acciones-form {
        display: flex;
        justify-content: flex-end;
      }
      .btn {
        padding: 0.625rem 1.25rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .btn-primary {
        background: var(--ammi-primary, #1d1e1c);
        border: 1px solid var(--ammi-primary, #1d1e1c);
        color: #ffffff;
      }
      .btn-primary:hover:not(:disabled) {
        background: var(--ammi-primary-hover, #0f100e);
        border-color: var(--ammi-gold, #fcea1e);
        color: var(--ammi-gold, #fcea1e);
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .mt-3 {
        margin-top: 0.75rem;
      }
      .mt-4 {
        margin-top: 1.25rem;
      }
      .text-danger {
        color: #dc2626;
      }
    `,
  ],
})
export class FichaPersonalComponent implements OnInit {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly registroValidacion = this.validacion.registrarFormulario(
    'ficha-personal',
    () => this.validacion.invalido(this.modelo, 'ficha'),
    inject(DestroyRef),
  );
  readonly fechaPolitica = fechaPolitica;
  private readonly state = inject(HojaDeVidaStateService);
  private readonly catalogos = inject(CatalogosCacheService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;

  // Catálogos
  readonly paises = signal<ElementoCatalogoDto[]>([]);
  readonly provinciasResidencia = signal<ElementoCatalogoDto[]>([]);
  readonly cantonesResidencia = signal<ElementoCatalogoDto[]>([]);
  readonly parroquiasResidencia = signal<ElementoCatalogoDto[]>([]);

  readonly sexos = signal<ElementoCatalogoDto[]>([]);
  readonly estadosCiviles = signal<ElementoCatalogoDto[]>([]);
  readonly tiposSangre = signal<ElementoCatalogoDto[]>([]);
  readonly etnias = signal<ElementoCatalogoDto[]>([]);

  // Cascada de residencia
  readonly provinciaResidenciaId = signal<number | undefined>(undefined);
  readonly cantonResidenciaId = signal<number | undefined>(undefined);

  fechaNacimientoStr = '';

  modelo: GuardarFichaPersonalRequest = {
    primerNombre: '',
    segundoNombre: undefined,
    primerApellido: '',
    segundoApellido: undefined,
    sexoId: undefined,
    fechaNacimiento: undefined,
    estadoCivilId: undefined,
    tipoSangreId: undefined,
    etniaId: undefined,
    nacionalidadIndigenaId: undefined,
    paisNacionalidadId: undefined,
    paisNacimientoId: undefined,
    parroquiaNacimientoId: undefined,
    parroquiaResidenciaId: undefined,
    callePrincipal: undefined,
    calleSecundaria: undefined,
    numeroCasa: undefined,
    referenciaDomicilio: undefined,
    codigoPostal: undefined,
    telefonoConvencional: undefined,
    celular: undefined,
    correoInstitucional: undefined,
    discapacidadId: undefined,
    porcentajeDiscapacidad: undefined,
    numeroCarnetDiscapacidad: undefined,
    fotoArchivoId: undefined,
  };

  readonly marcaFicha = signal(this.state.obtenerMarcaParaItem('ficha', 'datos_personales'));

  constructor() {
    effect(() => {
      const f = this.state.ficha();
      if (f) {
        this.modelo = {
          primerNombre: f.primerNombre ?? '',
          segundoNombre: f.segundoNombre,
          primerApellido: f.primerApellido ?? '',
          segundoApellido: f.segundoApellido,
          sexoId: f.sexoId,
          fechaNacimiento: f.fechaNacimiento,
          estadoCivilId: f.estadoCivilId,
          tipoSangreId: f.tipoSangreId,
          etniaId: f.etniaId,
          nacionalidadIndigenaId: f.nacionalidadIndigenaId,
          paisNacionalidadId: f.paisNacionalidadId,
          paisNacimientoId: f.paisNacimientoId,
          parroquiaNacimientoId: f.parroquiaNacimientoId,
          parroquiaResidenciaId: f.parroquiaResidenciaId,
          callePrincipal: f.callePrincipal,
          calleSecundaria: f.calleSecundaria,
          numeroCasa: f.numeroCasa,
          referenciaDomicilio: f.referenciaDomicilio,
          codigoPostal: f.codigoPostal,
          telefonoConvencional: f.telefonoConvencional,
          celular: f.celular,
          correoInstitucional: f.correoInstitucional,
          discapacidadId: f.discapacidadId,
          porcentajeDiscapacidad: f.porcentajeDiscapacidad,
          numeroCarnetDiscapacidad: f.numeroCarnetDiscapacidad,
          fotoArchivoId: f.fotoArchivoId,
        };

        if (f.fechaNacimiento) {
          const d = new Date(f.fechaNacimiento);
          this.fechaNacimientoStr = d.toISOString().split('T')[0];
        }
      }
    });
  }

  ngOnInit(): void {
    this.cargarCatalogosBase();
  }

  private cargarCatalogosBase(): void {
    this.catalogos.paises().subscribe((paises) => {
      this.paises.set(paises);
      const ecuador = paises.find((pais) => pais.codigo === '218');
      if (ecuador) {
        this.catalogos
          .provincias(ecuador.id)
          .subscribe((provincias) => this.provinciasResidencia.set(provincias));
      }
    });
    this.catalogos.obtener('Sexo').subscribe((s) => this.sexos.set(s));
    this.catalogos.estadosCiviles().subscribe((e) => this.estadosCiviles.set(e));
    this.catalogos.tiposSangre().subscribe((s) => this.tiposSangre.set(s));
    this.catalogos.etnias().subscribe((e) => this.etnias.set(e));
  }

  onProvinciaResidenciaChange(provinciaId?: number): void {
    this.provinciaResidenciaId.set(provinciaId);
    this.cantonResidenciaId.set(undefined);
    this.modelo.parroquiaResidenciaId = undefined;
    this.cantonesResidencia.set([]);
    this.parroquiasResidencia.set([]);

    if (provinciaId) {
      this.catalogos.cantones(provinciaId).subscribe((c) => this.cantonesResidencia.set(c));
    }
  }

  onCantonResidenciaChange(cantonId?: number): void {
    this.cantonResidenciaId.set(cantonId);
    this.modelo.parroquiaResidenciaId = undefined;
    this.parroquiasResidencia.set([]);

    if (cantonId) {
      this.catalogos.parroquias(cantonId).subscribe((p) => this.parroquiasResidencia.set(p));
    }
  }

  onFechaNacimientoChange(valor: string): void {
    this.fechaNacimientoStr = valor;
    this.modelo.fechaNacimiento = fechaSinHora(valor);
  }

  onFotoSubida(archivoId: string): void {
    this.modelo.fotoArchivoId = archivoId;
  }

  onFotoEliminada(): void {
    this.modelo.fotoArchivoId = undefined;
  }

  guardarFicha(): void {
    if (this.validacion.invalido(this.modelo, 'ficha')) return;
    if (!this.puedeEditar()) return;
    this.state
      .guardarFichaPersonal(this.modelo)
      .subscribe({ error: (error: unknown) => this.validacion.registrarError(error, this.modelo) });
  }
}
