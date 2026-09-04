/** Sposób dostawy — rekord z tabeli `shipping_methods`. */
export interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  carrier: string;
  description: string | null;
  price: number;
  /** Próg wartości koszyka, od którego dostawa jest gratis. `null` = zawsze płatna. */
  free_from: number | null;
  /** Dopłata za pobranie. `null` = pobranie niedostępne, `0` = bez dopłaty. */
  cod_surcharge: number | null;
  requires_point: boolean;
  point_hint: string | null;
  lead_time: string | null;
  sort_order: number;
  active: boolean;
}

export type ShippingMethodInput = Omit<ShippingMethod, 'id'>;

export type PaymentMethod = 'transfer' | 'cod';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Przelew z góry',
  cod: 'Płatność przy odbiorze (pobranie)',
};

/** Nowa metoda startuje z sensownymi wartościami — panel podmienia tylko to, co trzeba. */
export function emptyShippingMethod(): ShippingMethodInput {
  return {
    code: '',
    name: '',
    carrier: '',
    description: null,
    price: 0,
    free_from: null,
    cod_surcharge: null,
    requires_point: false,
    point_hint: null,
    lead_time: null,
    sort_order: 0,
    active: true,
  };
}

/** Ile kosztuje wysyłka przy tej wartości koszyka i tej formie płatności. */
export function shippingCostFor(
  method: ShippingMethod | undefined,
  itemsSubtotal: number,
  payment: PaymentMethod,
  freeShippingCoupon = false,
): number {
  if (!method) {
    return 0;
  }
  const free =
    freeShippingCoupon || (method.free_from !== null && itemsSubtotal >= method.free_from);
  const base = free ? 0 : method.price;
  // Dopłata za pobranie zostaje nawet przy darmowej dostawie — to koszt formy płatności.
  const surcharge = payment === 'cod' ? (method.cod_surcharge ?? 0) : 0;
  return base + surcharge;
}

export function supportsCashOnDelivery(method: ShippingMethod | undefined): boolean {
  return !!method && method.cod_surcharge !== null;
}
