export type CouponKind = 'percent' | 'amount' | 'free_shipping';

export const COUPON_KIND_LABELS: Record<CouponKind, string> = {
  percent: 'Rabat procentowy',
  amount: 'Rabat kwotowy',
  free_shipping: 'Darmowa dostawa',
};

/** Kupon w panelu. Klient nigdy nie dostaje tego rekordu — tylko wynik sprawdzenia kodu. */
export interface Coupon {
  id: string;
  code: string;
  kind: CouponKind;
  value: number;
  min_order_value: number;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  description: string | null;
  created_at: string;
}

export type CouponInput = Omit<Coupon, 'id' | 'used_count' | 'created_at'>;

/** Kupon przyjęty w koszyku — tyle, ile zwraca `check_coupon`. */
export interface AppliedCoupon {
  code: string;
  kind: CouponKind;
  value: number;
  description: string | null;
  minOrderValue: number;
  discount: number;
  freeShipping: boolean;
}

export type CouponRejection = 'not_found' | 'not_started' | 'expired' | 'used_up' | 'below_minimum';

export function couponRejectionMessage(
  state: CouponRejection | string,
  minOrderValue?: number,
): string {
  switch (state) {
    case 'not_started':
      return 'Ten kupon nie jest jeszcze aktywny.';
    case 'expired':
      return 'Ten kupon stracił ważność.';
    case 'used_up':
      return 'Ten kupon został już wykorzystany.';
    case 'below_minimum':
      return minOrderValue
        ? `Kupon działa od ${minOrderValue} zł wartości koszyka.`
        : 'Wartość koszyka jest za niska dla tego kuponu.';
    default:
      return 'Nie znamy takiego kodu rabatowego.';
  }
}

/** Krótki opis wysokości rabatu — do listy w panelu i do podsumowania koszyka. */
export function couponValueLabel(kind: CouponKind, value: number): string {
  switch (kind) {
    case 'percent':
      return `−${value}%`;
    case 'amount':
      return `−${value} zł`;
    case 'free_shipping':
      return 'darmowa dostawa';
  }
}
