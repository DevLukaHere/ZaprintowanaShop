import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

function safeInternalPath(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Adres, z którego odbiła blokada developerska — po zalogowaniu tam wracamy.
   * Przyjmujemy wyłącznie ścieżki wewnątrz aplikacji: `//zly.serwis` w parametrze
   * zamieniłoby logowanie w przekierowanie na obcą stronę.
   */
  private readonly next = safeInternalPath(this.route.snapshot.queryParamMap.get('next'));

  protected readonly siteLocked = environment.siteLocked;

  /** Widok logowania tłumaczy, dlaczego ktoś tu wylądował, zamiast sklepu. */
  protected readonly lockedNotice = environment.siteLocked && !!this.next;

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    const error = await this.auth.signIn(email, password);
    this.submitting.set(false);

    if (error) {
      this.errorMessage.set(error);
      return;
    }
    await this.router.navigateByUrl(this.next ?? '/admin');
  }
}
