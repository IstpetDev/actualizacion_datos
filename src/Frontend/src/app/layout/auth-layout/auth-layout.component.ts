import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <div class="auth-shell">
      <div class="auth-orb auth-orb-gold" aria-hidden="true"></div>
      <div class="auth-orb auth-orb-dark" aria-hidden="true"></div>
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
      overflow: hidden;
      box-sizing: border-box;
    }
    .auth-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(64px);
      pointer-events: none;
      z-index: 0;
    }
    .auth-orb-gold {
      width: 360px;
      height: 360px;
      top: 10%;
      left: calc(50% - 280px);
      background: radial-gradient(circle, rgba(252, 234, 30, 0.35) 0%, transparent 70%);
    }
    .auth-orb-dark {
      width: 340px;
      height: 340px;
      bottom: 10%;
      right: calc(50% - 280px);
      background: radial-gradient(circle, rgba(29, 30, 28, 0.12) 0%, transparent 70%);
    }
    .auth-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
    }
  `,
})
export class AuthLayoutComponent {}
