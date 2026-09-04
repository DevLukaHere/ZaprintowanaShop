import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminHeader } from '../../components/admin-header/admin-header';
import { slugify } from '../../models/category';
import { COUPON_KIND_LABELS, Coupon, CouponKind, couponValueLabel } from '../../models/coupon';
import { ShippingMethod } from '../../models/shipping';
import { PricePipe } from '../../pipes/price.pipe';
import { CouponsService } from '../../services/coupons.service';
import { ShippingService } from '../../services/shipping.service';

const COUPON_KINDS: CouponKind[] = ['percent', 'amount', 'free_shipping'];

/** Puste pole liczbowe znaczy „brak wartości”, a nie zero — stąd null zamiast 0. */
function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: string): string | null {
  return value.trim() || null;
}

/** `datetime-local` nie przyjmuje ISO ze strefą — obcinamy do minut w czasie lokalnym. */
function toLocalInput(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(local: string): string | null {
  if (!local.trim()) {
    return null;
  }
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

@Component({
  selector: 'app-admin-shipping',
  imports: [DatePipe, ReactiveFormsModule, AdminHeader, PricePipe],
  templateUrl: './admin-shipping.html',
  styleUrl: './admin-shipping.scss',
})
export class AdminShippingPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly shippingService = inject(ShippingService);
  protected readonly couponsService = inject(CouponsService);

  protected readonly couponKinds = COUPON_KINDS;
  protected readonly couponKindLabels = COUPON_KIND_LABELS;

  // --- Sposoby dostawy ----------------------------------------------------

  protected readonly methods = this.shippingService.methods;

  protected readonly showMethodForm = signal(false);
  protected readonly editingMethodId = signal<string | null>(null);
  protected readonly methodSubmitting = signal(false);
  protected readonly methodError = signal<string | null>(null);

  protected readonly methodForm = this.formBuilder.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    carrier: ['', Validators.required],
    description: [''],
    price: ['0', Validators.required],
    freeFrom: [''],
    codSurcharge: [''],
    requiresPoint: [false],
    pointHint: [''],
    leadTime: [''],
    sortOrder: ['0'],
    active: [true],
  });

  protected openMethodCreate(): void {
    this.editingMethodId.set(null);
    this.methodError.set(null);
    this.methodForm.reset({
      code: '',
      name: '',
      carrier: '',
      description: '',
      price: '0',
      freeFrom: '',
      codSurcharge: '',
      requiresPoint: false,
      pointHint: '',
      leadTime: '',
      // Nowa metoda ląduje na końcu listy.
      sortOrder: String((this.methods().at(-1)?.sort_order ?? 0) + 10),
      active: true,
    });
    this.showMethodForm.set(true);
  }

  protected editMethod(method: ShippingMethod): void {
    this.editingMethodId.set(method.id);
    this.methodError.set(null);
    this.methodForm.reset({
      code: method.code,
      name: method.name,
      carrier: method.carrier,
      description: method.description ?? '',
      price: String(method.price),
      freeFrom: method.free_from === null ? '' : String(method.free_from),
      codSurcharge: method.cod_surcharge === null ? '' : String(method.cod_surcharge),
      requiresPoint: method.requires_point,
      pointHint: method.point_hint ?? '',
      leadTime: method.lead_time ?? '',
      sortOrder: String(method.sort_order),
      active: method.active,
    });
    this.showMethodForm.set(true);
  }

  protected closeMethodForm(): void {
    this.showMethodForm.set(false);
    this.editingMethodId.set(null);
  }

  protected async saveMethod(): Promise<void> {
    if (this.methodForm.invalid) {
      this.methodForm.markAllAsTouched();
      return;
    }

    const raw = this.methodForm.getRawValue();
    const input = {
      code: slugify(raw.code),
      name: raw.name.trim(),
      carrier: raw.carrier.trim(),
      description: textOrNull(raw.description),
      price: numberOrNull(raw.price) ?? 0,
      free_from: numberOrNull(raw.freeFrom),
      cod_surcharge: numberOrNull(raw.codSurcharge),
      requires_point: raw.requiresPoint,
      point_hint: textOrNull(raw.pointHint),
      lead_time: textOrNull(raw.leadTime),
      sort_order: numberOrNull(raw.sortOrder) ?? 0,
      active: raw.active,
    };

    this.methodSubmitting.set(true);
    this.methodError.set(null);
    try {
      const id = this.editingMethodId();
      if (id) {
        await this.shippingService.update(id, input);
      } else {
        await this.shippingService.create(input);
      }
      this.closeMethodForm();
    } catch (error) {
      this.methodError.set(
        error instanceof Error ? error.message : 'Nie udało się zapisać metody dostawy.',
      );
    } finally {
      this.methodSubmitting.set(false);
    }
  }

  protected async toggleMethodActive(method: ShippingMethod): Promise<void> {
    this.methodError.set(null);
    try {
      await this.shippingService.update(method.id, { active: !method.active });
    } catch (error) {
      this.methodError.set(
        error instanceof Error ? error.message : 'Nie udało się zmienić metody dostawy.',
      );
    }
  }

  protected async removeMethod(method: ShippingMethod): Promise<void> {
    // Złożone zamówienia mają zapisaną nazwę metody u siebie, więc usunięcie
    // nie psuje historii — ale i tak lepiej wyłączyć niż skasować.
    if (!confirm(`Usunąć metodę „${method.name}”? Wyłączenie jej zwykle wystarczy.`)) {
      return;
    }
    this.methodError.set(null);
    try {
      await this.shippingService.remove(method.id);
    } catch (error) {
      this.methodError.set(
        error instanceof Error ? error.message : 'Nie udało się usunąć metody dostawy.',
      );
    }
  }

  // --- Kupony rabatowe ----------------------------------------------------

  protected readonly coupons = this.couponsService.coupons;

  protected readonly showCouponForm = signal(false);
  protected readonly editingCouponId = signal<string | null>(null);
  protected readonly couponSubmitting = signal(false);
  protected readonly couponError = signal<string | null>(null);

  protected readonly couponForm = this.formBuilder.group({
    code: ['', Validators.required],
    kind: ['percent' as CouponKind, Validators.required],
    value: ['10'],
    minOrderValue: ['0'],
    startsAt: [''],
    expiresAt: [''],
    maxUses: [''],
    description: [''],
    active: [true],
  });

  /** Rodzaj kuponu steruje widocznością pola „wysokość” — stąd kopia w sygnale. */
  private readonly couponKindValue = signal<CouponKind>('percent');

  protected readonly couponNeedsValue = computed(() => this.couponKindValue() !== 'free_shipping');

  protected readonly couponValueUnit = computed(() =>
    this.couponKindValue() === 'percent' ? '%' : 'zł',
  );

  protected onCouponKindChange(kind: string): void {
    this.couponKindValue.set(kind as CouponKind);
    this.couponForm.controls.kind.setValue(kind as CouponKind);
  }

  protected openCouponCreate(): void {
    this.editingCouponId.set(null);
    this.couponError.set(null);
    this.couponKindValue.set('percent');
    this.couponForm.reset({
      code: '',
      kind: 'percent',
      value: '10',
      minOrderValue: '0',
      startsAt: '',
      expiresAt: '',
      maxUses: '',
      description: '',
      active: true,
    });
    this.showCouponForm.set(true);
  }

  protected editCoupon(coupon: Coupon): void {
    this.editingCouponId.set(coupon.id);
    this.couponError.set(null);
    this.couponKindValue.set(coupon.kind);
    this.couponForm.reset({
      code: coupon.code,
      kind: coupon.kind,
      value: String(coupon.value),
      minOrderValue: String(coupon.min_order_value),
      startsAt: toLocalInput(coupon.starts_at),
      expiresAt: toLocalInput(coupon.expires_at),
      maxUses: coupon.max_uses === null ? '' : String(coupon.max_uses),
      description: coupon.description ?? '',
      active: coupon.active,
    });
    this.showCouponForm.set(true);
  }

  protected closeCouponForm(): void {
    this.showCouponForm.set(false);
    this.editingCouponId.set(null);
  }

  protected async saveCoupon(): Promise<void> {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    const raw = this.couponForm.getRawValue();
    const kind = raw.kind;
    const value = kind === 'free_shipping' ? 0 : (numberOrNull(raw.value) ?? 0);

    if (kind === 'percent' && (value <= 0 || value > 100)) {
      this.couponError.set('Rabat procentowy musi mieścić się w przedziale 1–100%.');
      return;
    }
    if (kind === 'amount' && value <= 0) {
      this.couponError.set('Podaj kwotę rabatu większą od zera.');
      return;
    }

    const startsAt = toIso(raw.startsAt);
    const expiresAt = toIso(raw.expiresAt);
    if (startsAt && expiresAt && new Date(expiresAt) <= new Date(startsAt)) {
      this.couponError.set('Koniec ważności musi wypadać po jej początku.');
      return;
    }

    const input = {
      code: raw.code.trim().toUpperCase(),
      kind,
      value,
      min_order_value: numberOrNull(raw.minOrderValue) ?? 0,
      starts_at: startsAt,
      expires_at: expiresAt,
      max_uses: numberOrNull(raw.maxUses),
      description: textOrNull(raw.description),
      active: raw.active,
    };

    this.couponSubmitting.set(true);
    this.couponError.set(null);
    try {
      const id = this.editingCouponId();
      if (id) {
        await this.couponsService.update(id, input);
      } else {
        await this.couponsService.create(input);
      }
      this.closeCouponForm();
    } catch (error) {
      this.couponError.set(
        error instanceof Error ? error.message : 'Nie udało się zapisać kuponu.',
      );
    } finally {
      this.couponSubmitting.set(false);
    }
  }

  protected async toggleCouponActive(coupon: Coupon): Promise<void> {
    this.couponError.set(null);
    try {
      await this.couponsService.update(coupon.id, { active: !coupon.active });
    } catch (error) {
      this.couponError.set(
        error instanceof Error ? error.message : 'Nie udało się zmienić kuponu.',
      );
    }
  }

  protected async removeCoupon(coupon: Coupon): Promise<void> {
    if (!confirm(`Usunąć kupon „${coupon.code}”? Historia jego użyć zniknie razem z nim.`)) {
      return;
    }
    this.couponError.set(null);
    try {
      await this.couponsService.remove(coupon.id);
    } catch (error) {
      this.couponError.set(error instanceof Error ? error.message : 'Nie udało się usunąć kuponu.');
    }
  }

  protected couponValueLabel(coupon: Coupon): string {
    return couponValueLabel(coupon.kind, coupon.value);
  }

  /** Krótki opis stanu kuponu — ważny, zużyty, nieaktywny, po terminie. */
  protected couponStatus(coupon: Coupon): { label: string; tone: 'ok' | 'warn' | 'off' } {
    if (!coupon.active) {
      return { label: 'Wyłączony', tone: 'off' };
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { label: 'Po terminie', tone: 'warn' };
    }
    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
      return { label: 'Jeszcze nieaktywny', tone: 'warn' };
    }
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return { label: 'Limit wyczerpany', tone: 'warn' };
    }
    return { label: 'Aktywny', tone: 'ok' };
  }

  protected couponUsage(coupon: Coupon): string {
    return coupon.max_uses === null
      ? `${coupon.used_count} / bez limitu`
      : `${coupon.used_count} / ${coupon.max_uses}`;
  }
}
