import { computed, Injectable, signal } from '@angular/core';
import { esRolValido, Rol, SesionUsuario } from './auth.models';

const CLAVE_STORAGE_SESION = 'istpet_actualizacion_datos_sesion';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly _sesion = signal<SesionUsuario | null>(this.recuperarSesionInicial());

  /**
   * Señal de solo lectura que expone la sesión actual del usuario.
   */
  readonly sesion = this._sesion.asReadonly();

  /**
   * Computado reactivo que indica si hay una sesión activa.
   */
  readonly estaAutenticado = computed(() => this._sesion() !== null);

  /**
   * Computado reactivo que expone el rol del usuario autenticado o null.
   */
  readonly rolActual = computed(() => this._sesion()?.rol ?? null);

  /**
   * Inicia la sesión del usuario, actualizando el estado reactivo y persistiendo en el almacenamiento de sesión.
   */
  iniciarSesion(sesion: SesionUsuario): void {
    if (!sesion || !esRolValido(sesion.rol)) {
      throw new Error(`No se puede iniciar sesión con un rol inválido: ${sesion?.rol}`);
    }

    this._sesion.set(sesion);
    this.guardarEnStorage(sesion);
  }

  /**
   * Cierra la sesión activa, limpiando el estado reactivo y el almacenamiento.
   */
  cerrarSesion(): void {
    this._sesion.set(null);
    this.guardarEnStorage(null);
  }

  /**
   * Comprueba si el usuario autenticado posee uno o más de los roles especificados.
   */
  tieneRol(roles: readonly Rol[] | Rol): boolean {
    const rolUsuario = this.rolActual();
    if (!rolUsuario) {
      return false;
    }

    if (Array.isArray(roles)) {
      return roles.includes(rolUsuario);
    }

    return roles === rolUsuario;
  }

  /**
   * Actualiza el token de autenticación en la sesión en curso si existe.
   */
  actualizarToken(token: string): void {
    const actual = this._sesion();
    if (!actual) {
      return;
    }

    const actualizada: SesionUsuario = { ...actual, token };
    this._sesion.set(actualizada);
    this.guardarEnStorage(actualizada);
  }

  private recuperarSesionInicial(): SesionUsuario | null {
    if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
      return null;
    }

    try {
      const serializado = window.sessionStorage.getItem(CLAVE_STORAGE_SESION);
      if (!serializado) {
        return null;
      }

      const datos = JSON.parse(serializado) as unknown;
      if (this.esSesionValida(datos)) {
        return datos;
      }

      // Si los datos están corruptos, limpiar para evitar estados inconsistentes
      window.sessionStorage.removeItem(CLAVE_STORAGE_SESION);
      return null;
    } catch {
      return null;
    }
  }

  private guardarEnStorage(sesion: SesionUsuario | null): void {
    if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
      return;
    }

    try {
      if (sesion) {
        window.sessionStorage.setItem(CLAVE_STORAGE_SESION, JSON.stringify(sesion));
      } else {
        window.sessionStorage.removeItem(CLAVE_STORAGE_SESION);
      }
    } catch {
      // Ignorar fallos de cuota o restricciones de almacenamiento en modo incógnito estricto
    }
  }

  private esSesionValida(datos: unknown): datos is SesionUsuario {
    if (typeof datos !== 'object' || datos === null) {
      return false;
    }

    const candidato = datos as Record<string, unknown>;
    return (
      typeof candidato['id'] === 'string' &&
      typeof candidato['cedula'] === 'string' &&
      typeof candidato['nombre'] === 'string' &&
      typeof candidato['institucionId'] === 'string' &&
      (candidato['token'] === undefined || typeof candidato['token'] === 'string') &&
      esRolValido(candidato['rol'])
    );
  }
}
