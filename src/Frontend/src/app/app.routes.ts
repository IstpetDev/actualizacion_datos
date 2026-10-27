import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard, AuthService, publicGuard, roleGuard } from './core/auth';
import { cambiosSinGuardarGuard } from './features/usuario/hoja-de-vida/servicios/cambios-sin-guardar.guard';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  // Rutas públicas (Login) bajo AuthLayoutComponent
  {
    path: 'login',
    component: AuthLayoutComponent,
    canActivate: [publicGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
    ],
  },

  {
    path: 'proteccion-datos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/aviso-proteccion-datos.component').then(
        (m) => m.AvisoProteccionDatosComponent,
      ),
  },

  // Vista de acceso denegado (HTTP 403 visual)
  {
    path: 'no-autorizado',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/no-autorizado/no-autorizado.component').then(
            (m) => m.NoAutorizadoComponent,
          ),
      },
    ],
  },

  // Rutas privadas protegidas por authGuard y envueltas en MainLayoutComponent
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'cambiar-clave',
        loadComponent: () =>
          import('./features/auth/cambiar-clave.component').then((m) => m.CambiarClaveComponent),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const authService = inject(AuthService);
          const rol = authService.rolActual();
          return rol ? `/${rol}` : '/login';
        },
      },
      {
        path: 'usuario',
        canActivate: [roleGuard('usuario')],
        canDeactivate: [cambiosSinGuardarGuard],
        loadComponent: () =>
          import('./features/usuario/hoja-de-vida/hoja-de-vida.component').then(
            (m) => m.HojaDeVidaComponent,
          ),
      },
      {
        path: 'supervisor',
        canActivate: [roleGuard(['supervisor', 'admin'])],
        loadComponent: () =>
          import('./features/supervisor/supervisor-dashboard.component').then(
            (m) => m.SupervisorDashboardComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'admin/configuracion',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/configuracion/configuracion-requisitos.component').then(
            (m) => m.ConfiguracionRequisitosComponent,
          ),
      },
      {
        path: 'admin/configuracion/secciones',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/configuracion/secciones.component').then(
            (m) => m.SeccionesComponent,
          ),
      },
      {
        path: 'superadmin',
        canActivate: [roleGuard('superadmin')],
        loadComponent: () =>
          import('./features/superadmin/superadmin-dashboard.component').then(
            (m) => m.SuperadminDashboardComponent,
          ),
      },
    ],
  },

  // Fallback para cualquier ruta no mapeada
  {
    path: '**',
    redirectTo: '',
  },
];
