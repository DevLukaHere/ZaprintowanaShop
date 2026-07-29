import { Component, ElementRef, computed, inject, input, linkedSignal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryBar } from '../../components/category-bar/category-bar';
import { EnvelopePrintPicker } from '../../components/envelope-print-picker/envelope-print-picker';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { OptionPicker } from '../../components/option-picker/option-picker';
import { ProductCard } from '../../components/product-card/product-card';
import { ProductGallery } from '../../components/product-gallery/product-gallery';
import { OrderMode, lineTotals, unitPrice } from '../../core/pricing';
import {
  BELOW_MIN_QUANTITY_FEE,
  DISCOUNT_TIERS,
  EXPRESS_SURCHARGE_RATE,
  FREE_SHIPPING_THRESHOLD,
  MIN_QUANTITY,
  SAMPLE_PRICING,
} from '../../models/pricing';
import {
  ENVELOPE_TEXT_MAX_LENGTH,
  EnvelopePrintId,
  PERSONALISATION_FIELDS,
  ProductConfiguration,
  resolveEnvelopePrintOptions,
} from '../../models/product-options';
import { PricePipe } from '../../pipes/price.pipe';
import { CartService } from '../../services/cart.service';
import { ProductsService } from '../../services/products.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-product',
  imports: [
    RouterLink,
    Navbar,
    Footer,
    CategoryBar,
    ProductGallery,
    OptionPicker,
    EnvelopePrintPicker,
    ProductCard,
    PricePipe,
  ],
  templateUrl: './product.html',
  styleUrl: './product.scss',
})
export class ProductPage {
  readonly id = input.required<string>();
  readonly mode = input<OrderMode>('standard');

  protected readonly productsService = inject(ProductsService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);

  private readonly descriptionSection = viewChild<ElementRef<HTMLElement>>('fullDescription');

  protected readonly minQuantity = MIN_QUANTITY;
  protected readonly belowMinimumFee = BELOW_MIN_QUANTITY_FEE;
  protected readonly expressPercent = EXPRESS_SURCHARGE_RATE * 100;
  protected readonly freeShippingThreshold = FREE_SHIPPING_THRESHOLD;
  protected readonly discountTiers = [...DISCOUNT_TIERS].sort(
    (a, b) => a.threshold - b.threshold,
  );
  protected readonly samplePricing = SAMPLE_PRICING;
  protected readonly personalisationFields = PERSONALISATION_FIELDS;
  protected readonly envelopeTextMaxLength = ENVELOPE_TEXT_MAX_LENGTH;

  protected readonly product = computed(() => this.productsService.getById(this.id()));
  protected readonly isSample = computed(() => this.mode() === 'sample');

  protected readonly paperId = linkedSignal<string | undefined>(() => (this.id(), undefined));
  protected readonly foilId = linkedSignal<string | undefined>(() => (this.id(), undefined));
  protected readonly envelopeId = linkedSignal<string | undefined>(() => (this.id(), undefined));
  protected readonly guestPersonalisation = linkedSignal<boolean>(() => (this.id(), false));
  protected readonly envelopePrintId = linkedSignal<EnvelopePrintId | undefined>(
    () => (this.id(), undefined),
  );
  protected readonly envelopeText = linkedSignal<string>(() => (this.id(), ''));
  protected readonly express = linkedSignal<boolean>(() => (this.id(), false));
  protected readonly personalisation = linkedSignal<Record<string, string>>(
    () => (this.id(), {}),
  );
  protected readonly quantity = linkedSignal<number>(() => (this.isSample() ? 1 : MIN_QUANTITY));

  protected readonly paperOptions = computed(() => this.product()?.paper_options ?? []);
  protected readonly foilOptions = computed(() => this.product()?.foil_options ?? []);
  protected readonly envelopeOptions = computed(() => this.product()?.envelope_options ?? []);
  protected readonly printOptions = computed(() =>
    resolveEnvelopePrintOptions(this.product()?.envelope_print),
  );

  protected readonly selectedPrint = computed(() =>
    this.printOptions().find((option) => option.id === this.envelopePrintId()),
  );

  protected readonly showEnvelopeText = computed(
    () => !this.isSample() && !!this.selectedPrint()?.requiresText,
  );

  protected readonly showGuestListNote = computed(
    () => !this.isSample() && !!this.selectedPrint()?.requiresGuestList,
  );

  protected readonly showPersonalisation = computed(
    () => !this.isSample() && this.product()?.category === 'zaproszenia',
  );

  protected readonly configuration = computed<ProductConfiguration>(() => ({
    paperId: this.paperId(),
    foilId: this.foilId(),
    envelopeId: this.envelopeId(),
    guestPersonalisation: this.guestPersonalisation(),
    envelopePrintId: this.guestPersonalisation() ? this.envelopePrintId() : undefined,
    envelopeText: this.showEnvelopeText() ? this.envelopeText().trim() || undefined : undefined,
    express: this.express(),
    personalisation: this.showPersonalisation() ? this.personalisation() : {},
  }));

  protected readonly unitPrice = computed(() => {
    const product = this.product();
    return product ? unitPrice(product, this.configuration()) : 0;
  });

  protected readonly totals = computed(() =>
    lineTotals({
      quantity: this.quantity(),
      mode: this.mode(),
      unitPrice: this.unitPrice(),
    }),
  );

  protected readonly displayUnitPrice = computed(() =>
    this.isSample() ? this.totals().subtotal / this.quantity() : this.unitPrice(),
  );

  protected readonly missingSelections = computed(() => {
    const missing: string[] = [];
    if (this.paperOptions().length && !this.paperId()) {
      missing.push('papier');
    }
    if (this.foilOptions().length && !this.foilId()) {
      missing.push('folię');
    }
    if (this.envelopeOptions().length && !this.envelopeId()) {
      missing.push('kopertę');
    }
    if (this.guestPersonalisation() && this.printOptions().length && !this.envelopePrintId()) {
      missing.push('rodzaj nadruku na kopercie');
    }
    return missing;
  });

  protected readonly canAddToCart = computed(
    () => !!this.product() && this.missingSelections().length === 0,
  );

  protected readonly related = computed(() => {
    const product = this.product();
    return product ? this.productsService.related(product) : [];
  });

  protected setPersonalisation(key: string, value: string): void {
    this.personalisation.update((current) => ({ ...current, [key]: value }));
  }

  protected setQuantity(value: number): void {
    this.quantity.set(Math.max(1, Math.min(9999, Math.floor(value) || 1)));
  }

  protected scrollToDescription(): void {
    this.descriptionSection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected addToCart(): void {
    const product = this.product();
    if (!product || !this.canAddToCart()) {
      return;
    }
    this.cart.add(product, this.configuration(), this.quantity(), this.mode());
    this.toast.show(
      this.isSample()
        ? `Dodano próbki „${product.name}” do koszyka!`
        : `Dodano „${product.name}” do koszyka!`,
    );
  }
}
