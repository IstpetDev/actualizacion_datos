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
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f1f5f9;
      padding: 1.5rem;
      box-sizing: border-box;
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        sans-serif;
    }
    .auth-container {
      width: 100%;
      max-width: 440px;
    }
  `,
})
export class AuthLayoutComponent {}
