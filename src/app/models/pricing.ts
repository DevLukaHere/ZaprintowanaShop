export const EXPRESS_SURCHARGE_RATE = 0.3;

export const MIN_QUANTITY = 20;
export const BELOW_MIN_QUANTITY_FEE = 100;

export interface DiscountTier {
  threshold: number;
  rate: number;
}

export const DISCOUNT_TIERS: readonly DiscountTier[] = [
  { threshold: 800, rate: 0.08 },
  { threshold: 500, rate: 0.05 },
];

export const FREE_SHIPPING_THRESHOLD = 500;

export const SAMPLE_PRICING = {
  smallMaxQty: 3,
  smallPrice: 40,
  mediumMaxQty: 7,
  mediumPrice: 60,
  extraPiecePrice: 10,
} as const;

export function sampleOrderPrice(quantity: number): number {
  const qty = Math.max(1, Math.floor(quantity));
  if (qty <= SAMPLE_PRICING.smallMaxQty) {
    return SAMPLE_PRICING.smallPrice;
  }
  if (qty <= SAMPLE_PRICING.mediumMaxQty) {
    return SAMPLE_PRICING.mediumPrice;
  }
  return (
    SAMPLE_PRICING.mediumPrice +
    (qty - SAMPLE_PRICING.mediumMaxQty) * SAMPLE_PRICING.extraPiecePrice
  );
}

export function discountRateFor(amount: number): number {
  return DISCOUNT_TIERS.find((tier) => amount >= tier.threshold)?.rate ?? 0;
}
