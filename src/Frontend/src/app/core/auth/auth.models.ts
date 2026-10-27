/**
 * Roles del sistema en orden jerárquico acordado en las especificaciones.
 */
export type Rol = 'usuario' | 'supervisor' | 'admin' | 'superadmin';

export const ROLES_VALIDOS: readonly Rol[] = [
  'usuario',
  'supervisor',
  'admin',
  'superadmin',
] as const;

/**
 * Representa los datos inmutables de la sesión de un usuario autenticado.
 */
export interface SesionUsuario {
  readonly id: string;
  readonly cedula: string;
  readonly nombre: string;
  readonly rol: Rol;
  readonly institucionId: string;
  readonly token?: string;
  readonly debeCambiarContrasena?: boolean;
  readonly correo?: string;
  readonly correoVerificado?: boolean;
  readonly requiereAceptarProteccionDatos?: boolean;
}

/** El servidor decide el paso pendiente; una respuesta antigua no habilita el acceso. */
export function rutaDeAcceso(sesion: SesionUsuario): string {
  if (sesion.debeCambiarContrasena) return '/cambiar-clave';
  if (sesion.requiereAceptarProteccionDatos !== false) return '/proteccion-datos';
  return `/${sesion.rol}`;
}

/**
 * Validador de tipo (type guard) para asegurar que un valor corresponde a un Rol del sistema.
 */
export function esRolValido(valor: unknown): valor is Rol {
  return typeof valor === 'string' && ROLES_VALIDOS.includes(valor as Rol);
}
