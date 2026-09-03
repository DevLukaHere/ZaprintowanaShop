import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { PERSONALISATION_FIELDS } from '../../models/product-options';
import { OrderDetailsService } from '../../services/order-details.service';

@Component({
  selector: 'app-order-details',
  imports: [ReactiveFormsModule, RouterLink, Navbar, Footer],
  templateUrl: './order-details.html',
  styleUrl: './order-details.scss',
})
export class OrderDetailsPage {
  readonly token = input.required<string>();

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly detailsService = inject(OrderDetailsService);

  protected readonly fields = PERSONALISATION_FIELDS;

  protected readonly submitting = signal(false);
  protected readonly saved = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group(
    Object.fromEntries(
      PERSONALISATION_FIELDS.map((field) => [
        field.key,
        ['', field.required ? [Validators.required] : []],
      ]),
    ),
  );

  private readonly detailsResource = resource({
    params: () => ({ token: this.token() }),
    loader: async ({ params }) => {
      const details = await this.detailsService.load(params.token);
      if (details.state === 'ready') {
        this.form.patchValue(details.personalisation ?? {}, { emitEvent: false });
        if (details.locked) {
          this.form.disable({ emitEvent: false });
        }
      }
      return details;
    },
  });

  protected readonly details = this.detailsResource.value;
  protected readonly isLoading = this.detailsResource.isLoading;
  protected readonly loadError = this.detailsResource.error;

  protected readonly alreadySubmitted = computed(() => !!this.details()?.submitted_at);
  protected readonly isLocked = computed(() => !!this.details()?.locked);

  protected isInvalid(key: string): boolean {
    const control = this.form.get(key);
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
      const values = Object.fromEntries(
        Object.entries(this.form.getRawValue())
          .map(([key, value]) => [key, String(value ?? '').trim()])
          .filter(([, value]) => !!value),
      );

      const state = await this.detailsService.save(this.token(), values);

      if (state === 'saved') {
        this.saved.set(true);
        this.detailsResource.reload();
        return;
      }
      this.errorMessage.set(
        state === 'locked'
          ? 'To zamówienie jest już zrealizowane — danych nie da się zmienić. Napisz do nas, jeśli coś wymaga poprawki.'
          : 'Ten link stracił ważność. Napisz do nas, wyślemy nowy.',
      );
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Nie udało się zapisać danych.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
