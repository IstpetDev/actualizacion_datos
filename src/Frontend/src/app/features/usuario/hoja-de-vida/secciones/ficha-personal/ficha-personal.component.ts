import {
  ValidacionHojaDeVidaService,
  fechaPolitica,
} from '../../servicios/validacion-hoja-de-vida.service';
import { fechaSinHora } from '../../servicios/fecha-sin-hora';
import { CommonModule } from '@angular/common';
import {
  DestroyRef,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, Subscription } from 'rxjs';
import { SeccionConCambios } from '../../servicios/seccion-con-cambios';
import { FormsModule } from '@angular/forms';
import {
  API_BASE_URL,
  ArchivosClient,
  ElementoCatalogoDto,
  GuardarFichaPersonalRequest,
} from '../../../../../api-client';
import { filtrarCatalogo } from '../../../../../core/util/filtro-busqueda.util';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { extraerDetalleError, mensajeError } from '../../../../../core/auth/mensaje-error';

@Component({
  selector: 'app-ficha-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, MarcaObservacionComponent],
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

      @if (errorResidencia()) {
        <p class="text-danger" role="alert">
          {{ errorResidencia() }}
          <button type="button" (click)="rehidratarResidencia()">Reintentar</button>
        </p>
      }

      <form (ngSubmit)="guardarFicha()" class="formulario-ficha" data-testid="form-ficha">
        <!-- 1. FOTOGRAFÍA FORMAL INSTITUCIONAL-->
        <fieldset
          class="grupo-campos card-foto-carnet-container mb-4"
          [disabled]="!puedeEditar()"
          data-testid="cuadro-foto-perfil"
        >
          <legend class="grupo-titulo">
            <span class="material-symbols-outlined icono-legend">photo_camera</span>
            Fotografía Formal Institucional
          </legend>

          <div class="foto-carnet-grid">
            <div class="foto-marco-carnet">
              @if (fotoPreviewUrl(); as prev) {
                <img
                  [src]="prev"
                  alt="Fotografía Formal"
                  class="foto-img-carnet"
                  data-testid="foto-persistida"
                />
              } @else if (modelo.fotoArchivoId; as fotoId) {
                <img
                  [src]="obtenerUrlFoto(fotoId)"
                  alt="Fotografía Formal"
                  class="foto-img-carnet"
                  data-testid="foto-persistida"
                />
              } @else {
                <div class="sin-foto-carnet">
                  <span class="material-symbols-outlined icono-placeholder-carnet"
                    >account_circle</span
                  >
                  <span class="texto-sin-foto-carnet">Sin Fotografía</span>
                </div>
              }
            </div>

            <div class="foto-detalles-carnet">
              <div class="foto-badge-row">
                @if (fotoPreviewUrl() || modelo.fotoArchivoId) {
                  <span class="badge-foto-estado badge-foto-registrada">
                    <span class="material-symbols-outlined icon-xs">check_circle</span>
                    Fotografía Cargada en Expediente
                  </span>
                } @else {
                  <span class="badge-foto-estado badge-sin-foto">
                    <span class="material-symbols-outlined icon-xs">info</span>
                    Fotografía Pendiente
                  </span>
                }
              </div>

              <p class="foto-instruccion-texto">
                Suba una fotografía formal para su carnet digital y ficha del expediente
                institucional:
              </p>
              <ul class="foto-reglas-lista">
                <li>
                  <span class="material-symbols-outlined icon-xs text-success">check</span> Fondo
                  claro/blanco y vestimenta formal.
                </li>
                <li>
                  <span class="material-symbols-outlined icon-xs text-success">check</span> Rostro y
                  hombros despejados (tipo carnet).
                </li>
                <li>
                  <span class="material-symbols-outlined icon-xs text-success">check</span> Formatos
                  admitidos: JPG, PNG o WEBP (máx. 10 MB).
                </li>
              </ul>

              <div class="foto-acciones-row">
                @if (puedeEditar()) {
                  <label class="btn btn-subir-foto" [class.btn-disabled]="subiendoFoto()">
                    <span class="material-symbols-outlined icon-sm">
                      {{ subiendoFoto() ? 'sync' : 'upload' }}
                    </span>
                    <span>
                      {{
                        subiendoFoto()
                          ? 'Subiendo fotografía...'
                          : fotoPreviewUrl() || modelo.fotoArchivoId
                            ? 'Cambiar Fotografía'
                            : 'Subir Fotografía'
                      }}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      (change)="onFotoSeleccionada($event)"
                      [disabled]="subiendoFoto()"
                      class="input-foto-file-hidden"
                      data-testid="input-subir-foto-perfil"
                    />
                  </label>

                  @if (fotoPreviewUrl() || modelo.fotoArchivoId) {
                    <button
                      type="button"
                      class="btn btn-quitar-foto"
                      (click)="eliminarFoto()"
                      [disabled]="subiendoFoto()"
                      data-testid="btn-eliminar-foto-perfil"
                    >
                      <span class="material-symbols-outlined icon-sm">delete</span>
                      <span>Quitar</span>
                    </button>
                  }
                }

                @if (modelo.fotoArchivoId; as fotoId) {
                  <a
                    [href]="obtenerUrlFoto(fotoId)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-ver-foto"
                    data-testid="btn-descargar-foto"
                  >
                    <span class="material-symbols-outlined icon-sm">visibility</span>
                    <span>Ver / Descargar</span>
                  </a>
                }
              </div>

              @if (errorFoto()) {
                <div class="alerta-error-foto mt-2" role="alert">
                  <span class="material-symbols-outlined icon-xs">error</span>
                  <span>{{ errorFoto() }}</span>
                </div>
              }
            </div>
          </div>
        </fieldset>

        <!-- 2. IDENTIFICACIÓN Y NOMBRES -->
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
              <label for="paisNacimiento">País de nacimiento *</label>
              <input
                type="search"
                class="form-control form-control-sm mb-1 input-busqueda-select"
                placeholder="Buscar país..."
                [ngModel]="filtroPaisNacimiento()"
                (ngModelChange)="filtroPaisNacimiento.set($event)"
                [disabled]="!puedeEditar()"
                name="buscarPaisNacimiento"
                data-testid="buscar-pais-nacimiento"
              />
              <select
                [attr.aria-describedby]="'error-modelo-paisNacimientoId'"
                id="paisNacimiento"
                name="paisNacimientoId"
                [(ngModel)]="modelo.paisNacimientoId"
                class="form-control"
              >
                <option [ngValue]="undefined">Seleccione...</option>
                @for (item of paisesNacimientoFiltrados(); track item.id) {
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
              <input
                type="search"
                class="form-control form-control-sm mb-1 input-busqueda-select"
                placeholder="Buscar país..."
                [ngModel]="filtroPaisNacionalidad()"
                (ngModelChange)="filtroPaisNacionalidad.set($event)"
                [disabled]="!puedeEditar()"
                name="buscarPaisNacionalidad"
                data-testid="buscar-pais-nacionalidad"
              />
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
                @for (item of paisesNacionalidadFiltrados(); track item.id) {
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
              <input
                type="search"
                class="form-control form-control-sm mb-1 input-busqueda-select"
                placeholder="Buscar provincia..."
                [ngModel]="filtroProvinciaResidencia()"
                (ngModelChange)="filtroProvinciaResidencia.set($event)"
                [disabled]="!puedeEditar()"
                name="buscarProvinciaResidencia"
                data-testid="buscar-provincia-residencia"
              />
              <select
                id="provinciaResidencia"
                class="form-control"
                [ngModel]="provinciaResidenciaId()"
                (ngModelChange)="onProvinciaResidenciaChange($event)"
                name="provinciaResidencia"
                data-testid="select-provincia-residencia"
              >
                <option [ngValue]="undefined">Seleccione provincia...</option>
                @for (item of provinciasResidenciaFiltradas(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="cantonResidencia">Cantón</label>
              <input
                type="search"
                class="form-control form-control-sm mb-1 input-busqueda-select"
                placeholder="Buscar cantón..."
                [ngModel]="filtroCantonResidencia()"
                (ngModelChange)="filtroCantonResidencia.set($event)"
                [disabled]="!puedeEditar() || !provinciaResidenciaId()"
                name="buscarCantonResidencia"
                data-testid="buscar-canton-residencia"
              />
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
                @for (item of cantonesResidenciaFiltrados(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="parroquiaResidencia">Parroquia <span class="text-danger">*</span></label>
              <input
                type="search"
                class="form-control form-control-sm mb-1 input-busqueda-select"
                placeholder="Buscar parroquia..."
                [ngModel]="filtroParroquiaResidencia()"
                (ngModelChange)="filtroParroquiaResidencia.set($event)"
                [disabled]="!puedeEditar() || !cantonResidenciaId()"
                name="buscarParroquiaResidencia"
                data-testid="buscar-parroquia-residencia"
              />
              <select
                [attr.aria-describedby]="'error-modelo-parroquiaResidenciaId'"
                id="parroquiaResidencia"
                class="form-control"
                [ngModel]="modelo.parroquiaResidenciaId"
                (ngModelChange)="onParroquiaChange($event)"
                [disabled]="!cantonResidenciaId()"
                name="parroquiaResidenciaId"
                required
                data-testid="select-parroquia-residencia"
              >
                <option [ngValue]="undefined">Seleccione parroquia...</option>
                @for (item of parroquiasResidenciaFiltradas(); track item.id) {
                  <option [ngValue]="item.id">{{ item.nombre }}</option>
                }
              </select>
              @if (
                errorParroquia() || validacion.mensaje(modelo, 'ficha', 'parroquiaResidenciaId');
                as mensaje
              ) {
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

          <div class="grid-cuatro">
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

            <div class="form-group">
              <label for="correoPersonal">Correo Personal</label>
              <input
                [attr.aria-describedby]="'error-modelo-correoPersonal'"
                id="correoPersonal"
                type="email"
                class="form-control"
                [(ngModel)]="modelo.correoPersonal"
                name="correoPersonal"
                placeholder="usuario@ejemplo.com"
                data-testid="input-correo-personal"
              />
              @if (validacion.mensaje(modelo, 'ficha', 'correoPersonal'); as mensaje) {
                <small id="error-modelo-correoPersonal" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>
        </fieldset>

        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">¿Posee alguna discapacidad?</legend>
          <div class="opciones-discapacidad">
            <label for="poseeDiscapacidadNo">
              <input
                id="poseeDiscapacidadNo"
                name="poseeDiscapacidad"
                type="radio"
                [value]="false"
                [ngModel]="poseeDiscapacidad()"
                (ngModelChange)="onPoseeDiscapacidadChange($event)"
              />
              No
            </label>
            <label for="poseeDiscapacidadSi">
              <input
                id="poseeDiscapacidadSi"
                name="poseeDiscapacidad"
                type="radio"
                [value]="true"
                [ngModel]="poseeDiscapacidad()"
                (ngModelChange)="onPoseeDiscapacidadChange($event)"
              />
              Sí
            </label>
          </div>
          @if (!poseeDiscapacidad()) {
            <p>
              No necesita llenar detalles. Al guardar, no se registrarán tipo, porcentaje ni carné
              de discapacidad.
            </p>
          } @else {
            <p>
              Seleccione el tipo de discapacidad. El porcentaje y el número de carné son opcionales.
            </p>
            @if (errorCargaDiscapacidades()) {
              <p class="text-danger" role="alert">
                {{ errorCargaDiscapacidades() }}
                <button type="button" (click)="cargarDiscapacidades()">Reintentar</button>
              </p>
            }
            <div class="grid-dos">
              <div class="form-group">
                <label for="discapacidadId">Tipo de discapacidad</label>
                <select
                  id="discapacidadId"
                  name="discapacidadId"
                  class="form-control"
                  [ngModel]="modelo.discapacidadId"
                  (ngModelChange)="onDiscapacidadChange($event)"
                  required
                  aria-describedby="error-discapacidad"
                  [attr.aria-invalid]="!!errorDiscapacidad()"
                >
                  <option [ngValue]="undefined">Seleccione un tipo de discapacidad</option>
                  @if (modelo.discapacidadId && !tipoDiscapacidadDisponible()) {
                    <option [ngValue]="modelo.discapacidadId" disabled>
                      Tipo guardado no disponible: seleccione uno vigente
                    </option>
                  }
                  @for (discapacidad of discapacidades(); track discapacidad.id) {
                    <option [ngValue]="discapacidad.id">{{ discapacidad.nombre }}</option>
                  }
                </select>
                @if (errorDiscapacidad(); as mensaje) {
                  <small id="error-discapacidad" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>
              <div class="form-group">
                <label for="porcentajeDiscapacidad">Porcentaje de discapacidad (opcional)</label
                ><input
                  class="form-control"
                  id="porcentajeDiscapacidad"
                  name="porcentajeDiscapacidad"
                  type="number"
                  [(ngModel)]="modelo.porcentajeDiscapacidad"
                  [disabled]="!modelo.discapacidadId"
                  min="0"
                  max="100"
                  step="1"
                  aria-describedby="error-porcentaje"
                />
                @if (validacion.mensaje(modelo, 'ficha', 'porcentajeDiscapacidad'); as mensaje) {
                  <small id="error-porcentaje" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>
              <div class="form-group">
                <label for="numeroCarnetDiscapacidad">Número de carné (opcional)</label
                ><input
                  class="form-control"
                  id="numeroCarnetDiscapacidad"
                  name="numeroCarnetDiscapacidad"
                  [(ngModel)]="modelo.numeroCarnetDiscapacidad"
                  [disabled]="!modelo.discapacidadId"
                  aria-describedby="error-carnet"
                />
                @if (validacion.mensaje(modelo, 'ficha', 'numeroCarnetDiscapacidad'); as mensaje) {
                  <small id="error-carnet" class="text-danger" role="alert">{{ mensaje }}</small>
                }
              </div>
            </div>
          }
        </fieldset>
        <!-- Perfil Profesional Institucional -->
        <fieldset class="grupo-campos mt-4" [disabled]="!puedeEditar()">
          <legend class="grupo-titulo">
            <span class="material-symbols-outlined icono-legend">badge</span>
            Perfil Profesional Institucional
          </legend>
          <p class="perfil-info-desc">
            El perfil profesional institucional se sintetiza automáticamente a partir de su
            formación académica, capacitaciones continuas y trayectoria laboral al revisar y
            exportar el expediente digital.
          </p>
        </fieldset>

        <!-- Botón de Guardado y Mensajes -->
        @if (mensajeExito()) {
          <div class="alerta-exito-guardado mt-3" role="status">
            <span class="material-symbols-outlined icon-sm">check_circle</span>
            <span>{{ mensajeExito() }}</span>
          </div>
        }
        @if (error()) {
          <div class="alerta-error-guardado mt-3" role="alert">
            <div class="alerta-header">
              <span class="material-symbols-outlined icon-sm">error</span>
              <strong>{{ error() }}</strong>
            </div>
            @if (listaErroresServidor().length > 0) {
              <ul class="lista-errores-servidor mt-2">
                @for (e of listaErroresServidor(); track e) {
                  <li>{{ e }}</li>
                }
              </ul>
            }
          </div>
        }
        @if (puedeEditar()) {
          <div class="acciones-form mt-4">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="guardando() || formularioInvalido()"
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
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .grupo-titulo {
        font-family: var(--font-display, 'Outfit', sans-serif);
        font-size: 1rem;
        font-weight: 700;
        color: #222c57;
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
        color: #334155;
      }
      .form-control {
        min-height: 42px;
        padding: 0.55rem 0.85rem;
        border: 1.5px solid #cbd5e1;
        border-radius: 12px;
        font-size: 0.875rem;
        color: #0f172a;
        background-color: #ffffff;
        transition: all 0.18s ease;
      }
      .form-control:focus {
        outline: none;
        border-color: #222c57;
        box-shadow: 0 0 0 3.5px rgba(34, 44, 87, 0.12);
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
        min-height: 42px;
        padding: 0.625rem 1.25rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        border: 1.5px solid transparent;
        transition: all 0.18s ease;
      }
      .btn-primary {
        background: #222c57;
        border-color: #222c57;
        color: #ffffff;
      }
      .btn-primary:hover:not(:disabled) {
        background: #1a2244;
        border-color: #1a2244;
        transform: translateY(-1px);
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
      .opciones-discapacidad {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1rem;
      }
      .opciones-discapacidad label {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        cursor: pointer;
      }
      .perfil-info-desc {
        font-size: 0.8125rem;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
      }

      /* Fotografía Carnet Formal */
      .card-foto-carnet-container {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .icono-legend {
        font-size: 18px;
        vertical-align: middle;
        margin-right: 0.35rem;
        color: #222c57;
      }
      .foto-carnet-grid {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .foto-marco-carnet {
        width: 120px;
        height: 156px;
        border-radius: 16px;
        border: 2.5px solid #c4a857;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(13, 27, 76, 0.08);
      }
      .foto-img-carnet {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .sin-foto-carnet {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        color: #94a3b8;
      }
      .icono-placeholder-carnet {
        font-size: 52px !important;
        color: #cbd5e1;
      }
      .texto-sin-foto-carnet {
        font-size: 0.6875rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .foto-detalles-carnet {
        flex: 1;
        min-width: 240px;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .foto-badge-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .badge-foto-estado {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.2rem 0.65rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .badge-foto-registrada {
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
      }
      .badge-sin-foto {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
      }
      .foto-instruccion-texto {
        font-size: 0.8125rem;
        color: #334155;
        font-weight: 600;
        margin: 0;
      }
      .foto-reglas-lista {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.75rem;
        color: #64748b;
      }
      .foto-reglas-lista li {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .foto-acciones-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.25rem;
      }
      .btn-subir-foto {
        background: #222c57;
        color: #ffffff;
        border: 1.5px solid #222c57;
        border-radius: 12px;
        padding: 0.55rem 1.15rem;
        font-size: 0.8125rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.18s ease;
      }
      .btn-subir-foto:hover {
        background: #1a2244;
        border-color: #1a2244;
      }
      .btn-quitar-foto {
        background: #fff1f2;
        color: #be123c;
        border: 1.5px solid #fecdd3;
        border-radius: 12px;
        padding: 0.55rem 0.95rem;
        font-size: 0.8125rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        transition: all 0.18s ease;
      }
      .btn-quitar-foto:hover:not(:disabled) {
        background: #ffe4e6;
      }
      .btn-disabled {
        opacity: 0.6;
        cursor: not-allowed !important;
        pointer-events: none;
      }
      .input-foto-file-hidden {
        display: none;
      }
      .alerta-error-foto {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: #dc2626;
        margin: 0;
      }
      .btn-ver-foto {
        background: #f8fafc;
        color: #222c57;
        border: 1.5px solid #c4a857;
        border-radius: 12px;
        padding: 0.55rem 0.95rem;
        font-size: 0.8125rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        text-decoration: none;
        transition: all 0.18s ease;
      }
      .btn-ver-foto:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
      .alerta-exito-guardado {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        color: #065f46;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.875rem;
      }
      .alerta-error-guardado {
        padding: 0.75rem 1rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        border-radius: 12px;
        font-size: 0.875rem;
      }
      .alerta-header {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 700;
      }
      .lista-errores-servidor {
        margin: 0.5rem 0 0 1.25rem;
        padding: 0;
        font-size: 0.8125rem;
        color: #b91c1c;
      }
      .mb-4 {
        margin-bottom: 1.25rem;
      }
    `,
  ],
})
export class FichaPersonalComponent implements OnInit, OnDestroy, SeccionConCambios {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly registroValidacion = this.validacion.registrarFormulario(
    'ficha-personal',
    () => this.formularioInvalido(),
    inject(DestroyRef),
  );
  readonly fechaPolitica = fechaPolitica;
  private readonly state = inject(HojaDeVidaStateService);
  private readonly catalogos = inject(CatalogosCacheService);
  private readonly archivosClient = inject(ArchivosClient);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  readonly subiendoFoto = signal<boolean>(false);
  readonly fotoPreviewUrl = signal<string | null>(null);
  readonly errorFoto = signal<string>('');

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;
  readonly mensajeExito = this.state.mensajeExito;
  readonly error = this.state.error;
  readonly errorResidencia = signal('');
  readonly errorParroquia = signal('');
  readonly erroresServidor = signal<Record<string, string[]>>({});
  private cargaResidencia?: Subscription;

  readonly listaErroresServidor = computed(() => {
    const errs = this.erroresServidor();
    const resultado: string[] = [];
    for (const [campo, mensajes] of Object.entries(errs)) {
      for (const m of mensajes) {
        resultado.push(`${campo}: ${m}`);
      }
    }
    return resultado;
  });

  obtenerErrorCampo(campo: string): string {
    const local = this.validacion.mensaje(this.modelo, 'ficha', campo);
    if (local) return local;
    const serv = this.erroresServidor()[campo];
    return serv?.length ? serv.join(' ') : '';
  }

  // Catálogos
  readonly paises = signal<ElementoCatalogoDto[]>([]);
  readonly provinciasResidencia = signal<ElementoCatalogoDto[]>([]);
  readonly cantonesResidencia = signal<ElementoCatalogoDto[]>([]);
  readonly parroquiasResidencia = signal<ElementoCatalogoDto[]>([]);

  readonly sexos = signal<ElementoCatalogoDto[]>([]);
  readonly estadosCiviles = signal<ElementoCatalogoDto[]>([]);
  readonly tiposSangre = signal<ElementoCatalogoDto[]>([]);
  readonly etnias = signal<ElementoCatalogoDto[]>([]);
  readonly discapacidades = signal<ElementoCatalogoDto[]>([]);
  readonly poseeDiscapacidad = signal(false);
  readonly errorCargaDiscapacidades = signal('');
  private readonly catalogoDiscapacidadesCargado = signal(false);
  private idsSinDiscapacidad = new Set<number>();
  private respuestaDiscapacidadModificada = false;
  private cargaDiscapacidades?: Subscription;

  // Cascada de residencia
  readonly provinciaResidenciaId = signal<number | undefined>(undefined);
  readonly cantonResidenciaId = signal<number | undefined>(undefined);

  // Filtros de búsqueda en selectores
  readonly filtroPaisNacimiento = signal('');
  readonly paisesNacimientoFiltrados = computed(() =>
    filtrarCatalogo(this.paises(), this.filtroPaisNacimiento(), this.modelo.paisNacimientoId),
  );

  readonly filtroPaisNacionalidad = signal('');
  readonly paisesNacionalidadFiltrados = computed(() =>
    filtrarCatalogo(this.paises(), this.filtroPaisNacionalidad(), this.modelo.paisNacionalidadId),
  );

  readonly filtroProvinciaResidencia = signal('');
  readonly provinciasResidenciaFiltradas = computed(() =>
    filtrarCatalogo(
      this.provinciasResidencia(),
      this.filtroProvinciaResidencia(),
      this.provinciaResidenciaId(),
    ),
  );

  readonly filtroCantonResidencia = signal('');
  readonly cantonesResidenciaFiltrados = computed(() =>
    filtrarCatalogo(
      this.cantonesResidencia(),
      this.filtroCantonResidencia(),
      this.cantonResidenciaId(),
    ),
  );

  readonly filtroParroquiaResidencia = signal('');
  readonly parroquiasResidenciaFiltradas = computed(() =>
    filtrarCatalogo(
      this.parroquiasResidencia(),
      this.filtroParroquiaResidencia(),
      this.modelo.parroquiaResidenciaId,
    ),
  );

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
    correoPersonal: undefined,
    discapacidadId: undefined,
    porcentajeDiscapacidad: undefined,
    numeroCarnetDiscapacidad: undefined,
    fotoArchivoId: undefined,
  };

  readonly marcaFicha = computed(() =>
    this.state.obtenerMarcaParaItem('ficha', 'datos_personales'),
  );
  readonly fotoGuardadaId = computed(() => this.state.ficha()?.fotoArchivoId);

  private snapshotModelo = '';
  private snapshotPoseeDiscapacidad = false;

  private guardarSnapshot(): void {
    this.snapshotModelo = JSON.stringify(this.modelo);
    this.snapshotPoseeDiscapacidad = this.poseeDiscapacidad();
  }

  tieneCambios(): boolean {
    if (!this.puedeEditar()) return false;
    return (
      JSON.stringify(this.modelo) !== this.snapshotModelo ||
      this.poseeDiscapacidad() !== this.snapshotPoseeDiscapacidad
    );
  }

  residenciaInvalida(): boolean {
    if (this.cantonResidenciaId() && !this.modelo.parroquiaResidenciaId) {
      return true;
    }
    return !!this.errorParroquia();
  }

  guardarCambios(): Observable<boolean> {
    if (this.residenciaInvalida()) {
      if (!this.errorParroquia()) {
        this.errorParroquia.set('Seleccione una parroquia correspondiente al cantón.');
      }
      return of(false);
    }
    if (!this.puedeEditar()) return of(true);
    if (this.formularioInvalido()) return of(false);
    this.erroresServidor.set({});
    const datos = this.datosParaGuardar();
    return this.state.guardarFichaPersonal(datos).pipe(
      map(() => {
        this.modelo = { ...this.modelo, ...datos };
        this.guardarSnapshot();
        this.erroresServidor.set({});
        this.state.actualizarEstadoCambios?.();
        return true;
      }),
      catchError((error: unknown) => {
        const detalle = extraerDetalleError(error);
        const errs = detalle.errores ?? {};
        this.erroresServidor.set(errs);
        this.validacion.registrarError(error, datos);
        this.validacion.registrarError(error, this.modelo);
        return of(false);
      }),
    );
  }

  descartarCambios(): void {
    if (this.snapshotModelo) {
      this.modelo = JSON.parse(this.snapshotModelo);
      this.poseeDiscapacidad.set(this.snapshotPoseeDiscapacidad);
      this.respuestaDiscapacidadModificada = false;
      if (this.modelo.fechaNacimiento) {
        this.fechaNacimientoStr = new Date(this.modelo.fechaNacimiento).toISOString().split('T')[0];
      } else {
        this.fechaNacimientoStr = '';
      }
      this.errorParroquia.set('');
      this.rehidratarResidencia();
    }
    this.state.actualizarEstadoCambios?.();
  }

  constructor() {
    effect(() => {
      const f = this.state.ficha();
      if (f) {
        untracked(() => {
          const parroquiaPrevia = this.modelo.parroquiaResidenciaId;
          const parroquiaNueva = f.parroquiaResidenciaId;
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
            correoPersonal: f.correoPersonal,
            discapacidadId: f.discapacidadId ?? undefined,
            porcentajeDiscapacidad: f.porcentajeDiscapacidad,
            numeroCarnetDiscapacidad: f.numeroCarnetDiscapacidad,
            fotoArchivoId: f.fotoArchivoId,
          };
          this.respuestaDiscapacidadModificada = false;
          this.poseeDiscapacidad.set(this.inferirPoseeDiscapacidad());

          this.fechaNacimientoStr = f.fechaNacimiento
            ? new Date(f.fechaNacimiento).toISOString().split('T')[0]
            : '';
          this.errorParroquia.set('');
          const yaCargada =
            !!parroquiaNueva &&
            parroquiaPrevia === parroquiaNueva &&
            !!this.cantonResidenciaId() &&
            !!this.provinciaResidenciaId() &&
            this.parroquiasResidencia().some((p) => p.id === parroquiaNueva);
          if (!yaCargada) {
            this.rehidratarResidencia();
          }
          this.guardarSnapshot();
          this.state.actualizarEstadoCambios?.();
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargarCatalogosBase();
    this.guardarSnapshot();
    this.state.registrarSeccion?.(this);
  }

  ngOnDestroy(): void {
    this.cargaResidencia?.unsubscribe();
    this.cargaDiscapacidades?.unsubscribe();
    this.state.desregistrarSeccion?.(this);
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
    this.cargarDiscapacidades();
  }

  cargarDiscapacidades(): void {
    this.cargaDiscapacidades?.unsubscribe();
    this.catalogoDiscapacidadesCargado.set(false);
    this.errorCargaDiscapacidades.set('');
    this.cargaDiscapacidades = this.catalogos.discapacidades().subscribe({
      next: (tipos) => {
        const sinDiscapacidad = (tipo: ElementoCatalogoDto): boolean =>
          [tipo.codigo, tipo.nombre].some((valor) =>
            ['NINGUNA', 'NINGUNO', 'SIN DISCAPACIDAD', 'NO APLICA'].includes(
              (valor ?? '').trim().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').toUpperCase(),
            ),
          );
        this.idsSinDiscapacidad = new Set(tipos.filter(sinDiscapacidad).map((tipo) => tipo.id));
        this.discapacidades.set(tipos.filter((tipo) => !sinDiscapacidad(tipo)));
        this.catalogoDiscapacidadesCargado.set(true);
        if (this.snapshotModelo) {
          this.snapshotPoseeDiscapacidad = this.inferirPoseeDiscapacidad(
            JSON.parse(this.snapshotModelo),
          );
        }
        if (!this.respuestaDiscapacidadModificada) {
          this.poseeDiscapacidad.set(this.inferirPoseeDiscapacidad());
        }
      },
      error: () =>
        this.errorCargaDiscapacidades.set(
          'No se pudieron cargar los tipos de discapacidad. Reintente la carga.',
        ),
    });
  }

  private inferirPoseeDiscapacidad(datos = this.modelo): boolean {
    const tieneDetalles =
      datos.porcentajeDiscapacidad != null || !!datos.numeroCarnetDiscapacidad?.trim();
    return (
      tieneDetalles ||
      (datos.discapacidadId != null && !this.idsSinDiscapacidad.has(datos.discapacidadId))
    );
  }

  tipoDiscapacidadDisponible(): boolean {
    return this.discapacidades().some((tipo) => tipo.id === this.modelo.discapacidadId);
  }

  errorDiscapacidad(): string {
    if (!this.poseeDiscapacidad()) return '';
    if (!this.catalogoDiscapacidadesCargado())
      return 'Cargue los tipos de discapacidad antes de guardar.';
    return this.tipoDiscapacidadDisponible()
      ? ''
      : 'Seleccione un tipo de discapacidad vigente para responder Sí.';
  }

  formularioInvalido(): boolean {
    return (
      !!this.errorDiscapacidad() ||
      this.residenciaInvalida() ||
      this.validacion.invalido(this.datosParaGuardar(), 'ficha')
    );
  }

  private datosParaGuardar(): GuardarFichaPersonalRequest {
    const res: Record<string, unknown> = { ...this.modelo };

    // ADR-0024 / Disallow: el backend rechaza propiedades no mapeadas en GuardarFichaPersonalRequest
    delete res['personaId'];
    delete res['fechaActualizacionUtc'];
    delete res['perfil'];

    if (!this.poseeDiscapacidad()) {
      if ('discapacidadId' in res) res['discapacidadId'] = undefined;
      if ('porcentajeDiscapacidad' in res) res['porcentajeDiscapacidad'] = undefined;
      if ('numeroCarnetDiscapacidad' in res) res['numeroCarnetDiscapacidad'] = undefined;
    }

    if (res['fechaNacimiento'] instanceof Date) {
      const d = res['fechaNacimiento'];
      const iso = d.toISOString().slice(0, 10);
      if (new Date(iso).toISOString().slice(0, 10) === iso) {
        res['fechaNacimiento'] = fechaSinHora(iso);
      }
    } else if (typeof res['fechaNacimiento'] === 'string') {
      const str = res['fechaNacimiento'] as string;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str) && new Date(str).toISOString().slice(0, 10) === str) {
        res['fechaNacimiento'] = fechaSinHora(str);
      }
    } else if (this.fechaNacimientoStr && !res['fechaNacimiento']) {
      const str = this.fechaNacimientoStr;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str) && new Date(str).toISOString().slice(0, 10) === str) {
        res['fechaNacimiento'] = fechaSinHora(str);
      }
    }

    return res as GuardarFichaPersonalRequest;
  }

  onPoseeDiscapacidadChange(posee: boolean): void {
    this.poseeDiscapacidad.set(posee);
    this.respuestaDiscapacidadModificada = true;
    this.state.actualizarEstadoCambios?.();
  }

  rehidratarResidencia(): void {
    this.cargaResidencia?.unsubscribe();
    this.errorResidencia.set('');
    this.errorParroquia.set('');
    this.provinciaResidenciaId.set(undefined);
    this.cantonResidenciaId.set(undefined);
    this.cantonesResidencia.set([]);
    this.parroquiasResidencia.set([]);
    const parroquiaId = this.modelo.parroquiaResidenciaId;
    if (!parroquiaId) return;

    this.cargaResidencia = forkJoin({
      parroquias: this.catalogos.obtener('Parroquia'),
      cantones: this.catalogos.obtener('Canton'),
    }).subscribe({
      next: ({ parroquias, cantones }) => {
        const parroquia = parroquias.find((p) => p.id === parroquiaId);
        const canton = cantones.find((c) => c.id === parroquia?.padreId);
        if (!canton?.padreId) {
          this.errorResidencia.set(
            'No se pudo recuperar la ubicación guardada. Seleccione su residencia.',
          );
          return;
        }
        this.provinciaResidenciaId.set(canton.padreId);
        this.cantonResidenciaId.set(canton.id);
        this.cantonesResidencia.set(cantones.filter((c) => c.padreId === canton.padreId));
        this.parroquiasResidencia.set(parroquias.filter((p) => p.padreId === canton.id));
        this.modelo.parroquiaResidenciaId = parroquiaId;
        this.errorParroquia.set('');
      },
      error: () =>
        this.errorResidencia.set('No se pudo cargar la ubicación guardada. Reintente la carga.'),
    });
  }

  onProvinciaResidenciaChange(provinciaId?: number): void {
    if (provinciaId === this.provinciaResidenciaId() && this.cantonesResidencia().length > 0) {
      return;
    }
    this.cargaResidencia?.unsubscribe();
    this.errorResidencia.set('');
    this.provinciaResidenciaId.set(provinciaId);
    this.cantonResidenciaId.set(undefined);
    const teniaParroquia = !!this.modelo.parroquiaResidenciaId;
    this.modelo.parroquiaResidenciaId = undefined;
    this.cantonesResidencia.set([]);
    this.parroquiasResidencia.set([]);

    if (provinciaId) {
      if (teniaParroquia) {
        this.errorParroquia.set('Seleccione cantón y parroquia para la provincia elegida.');
      } else {
        this.errorParroquia.set('');
      }
      this.cargaResidencia = this.catalogos
        .cantones(provinciaId)
        .subscribe((c) => this.cantonesResidencia.set(c));
    } else {
      this.errorParroquia.set(teniaParroquia ? 'Seleccione provincia, cantón y parroquia.' : '');
    }
  }

  onCantonResidenciaChange(cantonId?: number): void {
    if (cantonId === this.cantonResidenciaId() && this.parroquiasResidencia().length > 0) {
      return;
    }
    this.cargaResidencia?.unsubscribe();
    this.errorResidencia.set('');
    this.cantonResidenciaId.set(cantonId);
    const teniaParroquia = !!this.modelo.parroquiaResidenciaId;
    this.modelo.parroquiaResidenciaId = undefined;
    this.parroquiasResidencia.set([]);

    if (cantonId) {
      if (teniaParroquia) {
        this.errorParroquia.set('Seleccione una parroquia correspondiente al cantón.');
      } else {
        this.errorParroquia.set('');
      }
      this.cargaResidencia = this.catalogos
        .parroquias(cantonId)
        .subscribe((p) => this.parroquiasResidencia.set(p));
    } else {
      this.errorParroquia.set(teniaParroquia ? 'Seleccione cantón y parroquia.' : '');
    }
  }

  onParroquiaChange(parroquiaId?: number): void {
    this.modelo.parroquiaResidenciaId = parroquiaId;
    if (parroquiaId) {
      this.errorParroquia.set('');
    } else if (this.cantonResidenciaId()) {
      this.errorParroquia.set('Seleccione una parroquia correspondiente al cantón.');
    } else {
      this.errorParroquia.set('');
    }
  }

  onFechaNacimientoChange(valor: string): void {
    this.fechaNacimientoStr = valor;
    this.modelo.fechaNacimiento = fechaSinHora(valor);
  }

  onDiscapacidadChange(discapacidadId?: number): void {
    this.modelo.discapacidadId = discapacidadId;
    this.respuestaDiscapacidadModificada = true;
  }

  obtenerUrlFoto(id?: string): string | null {
    if (!id) return null;
    return `${this.baseUrl}/api/archivos/${encodeURIComponent(id)}/descargar`;
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    this.errorFoto.set('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(archivo.type)) {
      this.errorFoto.set('Formato no permitido. Utilice únicamente imágenes JPG, PNG o WEBP.');
      input.value = '';
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (archivo.size > maxBytes) {
      this.errorFoto.set('La fotografía supera el límite máximo permitido de 10 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.fotoPreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(archivo);

    this.subiendoFoto.set(true);
    const parametroArchivo = {
      data: archivo,
      fileName: archivo.name,
    };

    this.archivosClient
      .subirArchivo(undefined, undefined, parametroArchivo)
      .pipe(
        finalize(() => {
          this.subiendoFoto.set(false);
          input.value = '';
        }),
      )
      .subscribe({
        next: (res) => {
          if (res?.id) {
            this.modelo.fotoArchivoId = res.id;
            this.state.actualizarEstadoCambios?.();
            if (!this.validacion.invalido(this.modelo, 'ficha')) {
              this.state.guardarFichaPersonal(this.modelo).subscribe({
                error: (err) => {
                  this.errorFoto.set(
                    mensajeError(err, 'Error al guardar la fotografía en la ficha.'),
                  );
                },
              });
            }
          }
        },
        error: (err) => {
          this.errorFoto.set(mensajeError(err, 'Error al subir la fotografía al servidor.'));
        },
      });
  }

  eliminarFoto(): void {
    this.modelo.fotoArchivoId = undefined;
    this.fotoPreviewUrl.set(null);
    this.errorFoto.set('');
    this.state.actualizarEstadoCambios?.();
    if (this.puedeEditar() && !this.validacion.invalido(this.modelo, 'ficha')) {
      this.state.guardarFichaPersonal(this.modelo).subscribe();
    }
  }

  onFotoSubida(archivoId: string): void {
    this.modelo.fotoArchivoId = archivoId;
  }

  onFotoEliminada(): void {
    this.modelo.fotoArchivoId = undefined;
  }

  guardarFicha(): void {
    if (this.residenciaInvalida()) {
      if (!this.errorParroquia()) {
        this.errorParroquia.set('Seleccione una parroquia correspondiente al cantón.');
      }
      return;
    }
    if (this.formularioInvalido()) return;
    if (!this.puedeEditar()) return;
    this.guardarCambios().subscribe();
  }
}
