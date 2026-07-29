import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { configurationSummaryText, describeConfiguration } from '../../core/configuration-summary';
import { MIN_QUANTITY } from '../../models/pricing';
import { resolveEnvelopePrintOptions } from '../../models/product-options';
import { PricePipe } from '../../pipes/price.pipe';
import { CartService } from '../../services/cart.service';
import { OrdersService } from '../../services/orders.service';
import { ProductsService } from '../../services/products.service';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, Navbar, Footer, PricePipe],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly orders = inject(OrdersService);

  protected readonly cart = inject(CartService);
  protected readonly productsService = inject(ProductsService);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly placedOrderId = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    customerName: ['', Validators.required],
    customerEmail: ['', [Validators.required, Validators.email]],
    customerPhone: [''],
    shippingAddress: ['', Validators.required],
    shippingCity: ['', Validators.required],
    shippingPostcode: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{3}$/)]],
    notes: [''],
  });

  protected readonly lines = computed(() => {
    return this.cart.lines().map((line) => {
      const product = this.productsService.getById(line.productId);
      return {
        line,
        name: product?.name ?? line.productId,
        imageUrl: product?.imageUrl,
        details: describeConfiguration(product, line.configuration, line.mode),
        totals: this.cart.lineTotals(line),
      };
    });
  });

  protected readonly totals = this.cart.totals;
  protected readonly minQuantity = MIN_QUANTITY;

  protected readonly needsGuestList = computed(() =>
    this.cart.lines().some((line) => {
      if (!line.configuration.guestPersonalisation || line.mode === 'sample') {
        return false;
      }
      const product = this.productsService.getById(line.productId);
      return resolveEnvelopePrintOptions(product?.envelope_print).some(
        (option) => option.id === line.configuration.envelopePrintId && option.requiresGuestList,
      );
    }),
  );

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

  private notesWithConfiguration(notes: string): string {
    const summaries = this.cart
      .lines()
      .map((line) => {
        const product = this.productsService.getById(line.productId);
        const summary = configurationSummaryText(product, line.configuration, line.mode);
        const name = product?.name ?? line.productId;
        return summary ? `• ${name} × ${line.quantity} — ${summary}` : '';
      })
      .filter(Boolean);

    if (summaries.length === 0) {
      return notes;
    }
    return [notes.trim(), 'Konfiguracja:', ...summaries].filter(Boolean).join('\n');
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.cart.lines().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const details = this.form.getRawValue();
      const orderId = await this.orders.createOrder(
        { ...details, notes: this.notesWithConfiguration(details.notes) },
        this.cart.lines(),
      );
      this.placedOrderId.set(orderId);
      this.cart.clearCart();
      this.form.reset();
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Nie udało się złożyć zamówienia.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
