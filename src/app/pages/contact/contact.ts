import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { PRODUCTION_LEAD_DAYS } from '../../models/pricing';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, RouterLink, Navbar, Footer],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class ContactPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly contact = inject(ContactService);

  protected readonly leadDays = PRODUCTION_LEAD_DAYS;

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: [''],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.contact.send(this.form.getRawValue());
      this.sent.set(true);
      this.form.reset();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error
          ? `Nie udało się wysłać wiadomości: ${error.message}`
          : 'Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
