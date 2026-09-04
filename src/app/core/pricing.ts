import { Collection } from '../models/collection';
import { AppliedCoupon } from '../models/coupon';
import {
  BELOW_MIN_QUANTITY_FEE,
  EXPRESS_SURCHARGE_RATE,
  FREE_SHIPPING_THRESHOLD,
  MIN_QUANTITY,
  discountRateFor,
  sampleOrderPrice,
} from '../models/pricing';
import { PaymentMethod, ShippingMethod, shippingCostFor } from '../models/shipping';
import {
  ProductConfiguration,
  ProductOption,
  resolveEnvelopePrintOptions,
} from '../models/product-options';

export type OrderMode = 'standard' | 'sample';

export interface PricedLine {
  quantity: number;
  mode: OrderMode;
  unitPrice: number;
}

export interface LineTotals {
  subtotal: number;
  belowMinimumFee: number;
  total: number;
}

export interface CartTotals {
  subtotal: number;
  belowMinimumFee: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  freeShipping: boolean;
  missingForFreeShipping: number;
}

function findOption(
  options: readonly ProductOption[] | undefined,
  id: string | undefined,
): ProductOption | undefined {
  return id ? options?.find((option) => option.id === id) : undefined;
}

export function optionSurcharge(product: Collection, configuration: ProductConfiguration): number {
  const paper = findOption(product.paper_options, configuration.paperId);
  const foil = findOption(product.foil_options, configuration.foilId);
  const envelope = findOption(product.envelope_options, configuration.envelopeId);

  const print = configuration.guestPersonalisation
    ? resolveEnvelopePrintOptions(product.envelope_print).find(
        (option) => option.id === configuration.envelopePrintId,
      )
    : undefined;

  return (paper?.price ?? 0) + (foil?.price ?? 0) + (envelope?.price ?? 0) + (print?.price ?? 0);
}

export function unitPrice(product: Collection, configuration: ProductConfiguration): number {
  const base = product.price + optionSurcharge(product, configuration);
  return configuration.express ? base * (1 + EXPRESS_SURCHARGE_RATE) : base;
}

export function lineTotals(line: PricedLine): LineTotals {
  if (line.mode === 'sample') {
    const subtotal = sampleOrderPrice(line.quantity);
    return { subtotal, belowMinimumFee: 0, total: subtotal };
  }

  const subtotal = line.unitPrice * line.quantity;
  const belowMinimumFee = line.quantity < MIN_QUANTITY ? BELOW_MIN_QUANTITY_FEE : 0;
  return { subtotal, belowMinimumFee, total: subtotal + belowMinimumFee };
}

export function cartTotals(lines: readonly PricedLine[]): CartTotals {
  let subtotal = 0;
  let belowMinimumFee = 0;

  for (const line of lines) {
    const totals = lineTotals(line);
    subtotal += totals.subtotal;
    belowMinimumFee += totals.belowMinimumFee;
  }

  const discountRate = discountRateFor(subtotal);
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount + belowMinimumFee;

  return {
    subtotal,
    belowMinimumFee,
    discountRate,
    discountAmount,
    total,
    freeShipping: subtotal >= FREE_SHIPPING_THRESHOLD,
    missingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
  };
}

/** Kwoty zamówienia: koszyk + wybrana dostawa + kupon. */
export interface OrderTotals {
  /** Wartość produktów do zapłaty — po rabacie ilościowym i dopłacie za małe zamówienie. */
  itemsSubtotal: number;
  couponDiscount: number;
  shippingCost: number;
  /** Czy dostawa wyszła gratis (z progu w metodzie albo z kuponu). */
  freeShipping: boolean;
  /** Ile brakuje do progu darmowej dostawy w wybranej metodzie; 0 gdy progu nie ma. */
  missingForFreeShipping: number;
  total: number;
}

/**
 * Rabat z kuponu liczony tak samo jak w bazie (funkcja `coupon_discount`) —
 * baza i tak przelicza go przy składaniu zamówienia, tu chodzi o zgodne podsumowanie.
 */
export function couponDiscountFor(coupon: AppliedCoupon | null, itemsSubtotal: number): number {
  if (!coupon) {
    return 0;
  }
  switch (coupon.kind) {
    case 'percent':
      return Math.round(itemsSubtotal * coupon.value) / 100;
    case 'amount':
      return Math.min(coupon.value, itemsSubtotal);
    case 'free_shipping':
      return 0;
  }
}

export function orderTotals(
  cart: CartTotals,
  method: ShippingMethod | undefined,
  payment: PaymentMethod,
  coupon: AppliedCoupon | null,
): OrderTotals {
  const itemsSubtotal = cart.total;
  const couponDiscount = couponDiscountFor(coupon, itemsSubtotal);
  const shippingCost = shippingCostFor(method, itemsSubtotal, payment, !!coupon?.freeShipping);

  const threshold = method?.free_from ?? null;
  const freeShipping = !!coupon?.freeShipping || (threshold !== null && itemsSubtotal >= threshold);

  return {
    itemsSubtotal,
    couponDiscount,
    shippingCost,
    freeShipping,
    missingForFreeShipping:
      threshold === null || freeShipping ? 0 : Math.max(0, threshold - itemsSubtotal),
    total: Math.max(0, itemsSubtotal - couponDiscount) + shippingCost,
  };
}
