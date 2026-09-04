import { Injectable, computed, resource } from '@angular/core';
import { supabase } from '../core/supabase-client';
import { AppliedCoupon, Coupon, CouponInput, couponRejectionMessage } from '../models/coupon';

export type CouponCheck = { ok: true; coupon: AppliedCoupon } | { ok: false; message: string };

/**
 * Sprawdzenie kodu wpisanego w koszyku.
 *
 * Celowo poza serwisem panelu: tabela kuponów jest zamknięta dla klienta (inaczej
 * anon key wystarczyłby do pobrania listy wszystkich kodów), a jedyne wejście dla
 * niezalogowanych to funkcja `check_coupon`. Serwis panelu odpytuje tabelę od razu
 * po utworzeniu, więc wstrzykiwanie go w koszyku kończyłoby się błędem RLS.
 */
export async function checkCoupon(code: string, subtotal: number): Promise<CouponCheck> {
  const { data, error } = await supabase.rpc('check_coupon', {
    p_code: code.trim(),
    p_subtotal: subtotal,
  });

  if (error) {
    return { ok: false, message: 'Nie udało się sprawdzić kodu. Spróbuj ponownie.' };
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result['state'] !== 'ok') {
    return {
      ok: false,
      message: couponRejectionMessage(
        String(result['state'] ?? 'not_found'),
        Number(result['min_order_value']) || undefined,
      ),
    };
  }

  return {
    ok: true,
    coupon: {
      code: String(result['code']),
      kind: result['kind'] as AppliedCoupon['kind'],
      value: Number(result['value']),
      description: (result['description'] as string | null) ?? null,
      minOrderValue: Number(result['min_order_value'] ?? 0),
      discount: Number(result['discount'] ?? 0),
      freeShipping: !!result['free_shipping'],
    },
  };
}

@Injectable({ providedIn: 'root' })
export class CouponsService {
  private readonly couponsResource = resource({
    loader: async () => {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []) as Coupon[];
    },
  });

  readonly isLoading = this.couponsResource.isLoading;
  readonly error = this.couponsResource.error;
  readonly coupons = computed(() => this.couponsResource.value() ?? []);

  reload(): void {
    this.couponsResource.reload();
  }

  async create(input: CouponInput): Promise<void> {
    const { error } = await supabase.from('discount_coupons').insert(input);
    if (error) {
      throw new Error(error.code === '23505' ? 'Taki kod już istnieje.' : error.message);
    }
    this.reload();
  }

  async update(id: string, input: Partial<CouponInput>): Promise<void> {
    const { error } = await supabase.from('discount_coupons').update(input).eq('id', id);
    if (error) {
      throw new Error(error.code === '23505' ? 'Taki kod już istnieje.' : error.message);
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('discount_coupons').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }
}
