import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { configurationSummaryText, describeConfiguration } from '../../core/configuration-summary';
import { orderTotals } from '../../core/pricing';
import { AppliedCoupon } from '../../models/coupon';
import { MIN_QUANTITY } from '../../models/pricing';
import { resolveEnvelopePrintOptions } from '../../models/product-options';
import { PaymentMethod, supportsCashOnDelivery } from '../../models/shipping';
import { PricePipe } from '../../pipes/price.pipe';
import { CartService } from '../../services/cart.service';
import { checkCoupon } from '../../services/coupons.service';
import { OrdersService } from '../../services/orders.service';
import { ProductsService } from '../../services/products.service';
import { ShippingService } from '../../services/shipping.service';

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
  protected readonly shipping = inject(ShippingService);

  protected readonly submitting = signal(false);
  protected readonly submitAttempted = signal(false);
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

  // Wybory poza formularzem trzymamy w sygnałach — komunikaty o brakach mają
  // znikać od razu po kliknięciu, a nie dopiero przy kolejnej próbie wysyłki.
  protected readonly pickupPoint = signal('');
  protected readonly acceptTerms = signal(false);
  protected readonly acceptWithdrawal = signal(false);

  // --- Dostawa i płatność -------------------------------------------------

  protected readonly methods = this.shipping.activeMethods;

  private readonly chosenCode = signal<string | null>(null);

  /** Dopóki klient nie wybierze sam, obowiązuje pierwsza metoda z listy. */
  protected readonly selectedMethod = computed(() => {
    const methods = this.methods();
    const chosen = methods.find((method) => method.code === this.chosenCode());
    return chosen ?? methods[0];
  });

  protected readonly needsPickupPoint = computed(() => !!this.selectedMethod()?.requires_point);
  protected readonly codAvailable = computed(() => supportsCashOnDelivery(this.selectedMethod()));

  private readonly chosenPayment = signal<PaymentMethod>('transfer');

  /** Zmiana metody na taką bez pobrania nie może zostawić wybranego pobrania. */
  protected readonly paymentMethod = computed<PaymentMethod>(() =>
    this.codAvailable() ? this.chosenPayment() : 'transfer',
  );

  protected selectMethod(code: string): void {
    this.chosenCode.set(code);
    this.pickupPoint.set('');
  }

  protected selectPayment(method: PaymentMethod): void {
    this.chosenPayment.set(method);
  }

  // --- Kupon rabatowy -----------------------------------------------------

  protected readonly couponInput = signal('');
  protected readonly couponChecking = signal(false);
  protected readonly couponError = signal<string | null>(null);
  private readonly appliedCoupon = signal<AppliedCoupon | null>(null);

  /**
   * Kupon przestaje działać, gdy koszyk spadnie poniżej progu — zostaje wtedy
   * wpisany, ale nie liczy się do kwoty, a klient dostaje o tym komunikat.
   */
  protected readonly activeCoupon = computed(() => {
    const coupon = this.appliedCoupon();
    if (!coupon) {
      return null;
    }
    return this.cart.totals().total >= coupon.minOrderValue ? coupon : null;
  });

  protected readonly couponBelowMinimum = computed(
    () => !!this.appliedCoupon() && !this.activeCoupon(),
  );

  protected readonly couponMinimum = computed(() => this.appliedCoupon()?.minOrderValue ?? 0);

  protected async applyCoupon(): Promise<void> {
    const code = this.couponInput().trim();
    if (!code) {
      return;
    }

    this.couponChecking.set(true);
    this.couponError.set(null);
    try {
      const result = await checkCoupon(code, this.cart.totals().total);
      if (result.ok) {
        this.appliedCoupon.set(result.coupon);
        this.couponInput.set(result.coupon.code);
      } else {
        this.appliedCoupon.set(null);
        this.couponError.set(result.message);
      }
    } finally {
      this.couponChecking.set(false);
    }
  }

  protected removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponInput.set('');
    this.couponError.set(null);
  }

  // --- Podsumowanie -------------------------------------------------------

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

  protected readonly cartTotals = this.cart.totals;

  protected readonly totals = computed(() =>
    orderTotals(
      this.cart.totals(),
      this.selectedMethod(),
      this.paymentMethod(),
      this.activeCoupon(),
    ),
  );

  protected readonly minQuantity = MIN_QUANTITY;

  /** Zapowiedź formularza pokazujemy tylko, gdy w koszyku jest zaproszenie na zamówienie. */
  protected readonly needsPersonalisation = computed(() =>
    this.cart
      .lines()
      .some(
        (line) =>
          line.mode !== 'sample' &&
          this.productsService.getById(line.productId)?.category === 'invitations',
      ),
  );

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

  /**
   * Produkty z Waszymi treściami są wykonywane na zamówienie, więc nie podlegają
   * zwrotowi (art. 38 ust. 1 pkt 3 ustawy o prawach konsumenta). Klient musi to
   * potwierdzić osobno, zanim zamówi — inaczej wyłączenie zwrotu nie działa.
   */
  protected readonly needsWithdrawalWaiver = computed(() =>
    this.cart.lines().some((line) => line.mode !== 'sample'),
  );

  protected readonly pickupPointMissing = computed(
    () => this.submitAttempted() && this.needsPickupPoint() && !this.pickupPoint().trim(),
  );

  protected readonly termsMissing = computed(() => this.submitAttempted() && !this.acceptTerms());

  protected readonly waiverMissing = computed(
    () => this.submitAttempted() && this.needsWithdrawalWaiver() && !this.acceptWithdrawal(),
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
    this.submitAttempted.set(true);

    const method = this.selectedMethod();
    if (this.form.invalid || this.cart.lines().length === 0 || !method) {
      this.form.markAllAsTouched();
      if (!method) {
        this.errorMessage.set('Wybierz sposób dostawy.');
      }
      return;
    }
    if (this.pickupPointMissing() || this.termsMissing() || this.waiverMissing()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const details = this.form.getRawValue();
      const orderId = await this.orders.createOrder(
        { ...details, notes: this.notesWithConfiguration(details.notes) },
        this.cart.lines(),
        {
          shippingMethodCode: method.code,
          paymentMethod: this.paymentMethod(),
          shippingPoint: this.pickupPoint().trim() || null,
          couponCode: this.activeCoupon()?.code ?? null,
          itemsSubtotal: this.cart.totals().total,
          termsAccepted: this.acceptTerms(),
          withdrawalWaiver: this.acceptWithdrawal(),
        },
      );

      // Potwierdzenie mailem jest miłym dodatkiem, nie warunkiem złożenia zamówienia.
      void this.orders.sendEmail(orderId, 'order-placed');

      this.placedOrderId.set(orderId);
      this.cart.clearCart();
      this.form.reset();
      this.removeCoupon();
      this.chosenPayment.set('transfer');
      this.pickupPoint.set('');
      this.acceptTerms.set(false);
      this.acceptWithdrawal.set(false);
      this.submitAttempted.set(false);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Nie udało się złożyć zamówienia.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
