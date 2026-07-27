import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
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

  /** Cart entries joined with product details for display. */
  protected readonly lines = computed(() => {
    const products = this.productsService.products() ?? [];
    return this.cart.cartEntries().map((entry) => {
      const product = products.find((candidate) => candidate.id === entry.id);
      return {
        id: entry.id,
        qty: entry.qty,
        name: product?.name ?? entry.id,
        price: product?.price ?? 0,
        image: product?.image,
      };
    });
  });

  protected isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.cart.cartEntries().length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const orderId = await this.orders.createOrder(
        this.form.getRawValue(),
        this.cart.cartEntries(),
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
