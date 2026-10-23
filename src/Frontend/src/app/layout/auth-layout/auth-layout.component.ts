import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <main class="auth-container" role="main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .auth-shell {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
      box-sizing: border-box;
    }
    .auth-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 400px;
    }
  `,
})
export class AuthLayoutComponent {}
