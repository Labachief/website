import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { hasAuthToken, setAuthToken } from '../auth/auth-token';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected name = '';
  protected pwd = '';
  protected isLoggingIn = false;
  protected errorMessage = '';

  constructor() {
    if (hasAuthToken()) {
      void this.router.navigate(['/']);
    }
  }

  protected async submit(): Promise<void> {
    if (!this.name.trim() || !this.pwd.trim()) {
      this.errorMessage = '請輸入帳號和密碼';
      return;
    }

    this.errorMessage = '';
    this.isLoggingIn = true;
    this.cdr.detectChanges();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: this.name.trim(),
          pwd: this.pwd,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const payload = (await response.json()) as Partial<{ token: string }>;
      const token = (payload.token ?? '').trim();
      if (!token) {
        throw new Error('TOKEN_MISSING');
      }

      setAuthToken(token);
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl')?.trim() || '/';
      void this.router.navigateByUrl(returnUrl);
    } catch (error) {
      console.error('Login failed:', error);
      this.errorMessage = '登入失敗，請確認帳號密碼';
    } finally {
      this.isLoggingIn = false;
      this.cdr.detectChanges();
    }
  }
}
