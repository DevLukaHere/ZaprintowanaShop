import { Injectable, computed, resource } from '@angular/core';
import { supabase } from '../core/supabase-client';
import { ShippingMethod, ShippingMethodInput } from '../models/shipping';

@Injectable({ providedIn: 'root' })
export class ShippingService {
  // RLS oddaje klientowi wyłącznie metody włączone; zalogowany administrator
  // dostaje z tego samego zapytania także wyłączone.
  private readonly methodsResource = resource({
    loader: async () => {
      const { data, error } = await supabase
        .from('shipping_methods')
        .select('*')
        .order('sort_order')
        .order('name');
      if (error) {
        throw error;
      }
      return (data ?? []) as ShippingMethod[];
    },
  });

  readonly isLoading = this.methodsResource.isLoading;
  readonly error = this.methodsResource.error;

  /** Wszystko, co przyszło z bazy — na potrzeby panelu. */
  readonly methods = computed(() => this.methodsResource.value() ?? []);

  /** Do wyboru w koszyku. */
  readonly activeMethods = computed(() => this.methods().filter((method) => method.active));

  byCode(code: string | null | undefined): ShippingMethod | undefined {
    return code ? this.methods().find((method) => method.code === code) : undefined;
  }

  reload(): void {
    this.methodsResource.reload();
  }

  async create(input: ShippingMethodInput): Promise<void> {
    const { error } = await supabase.from('shipping_methods').insert(input);
    if (error) {
      throw new Error(
        error.code === '23505' ? 'Metoda o takim identyfikatorze już istnieje.' : error.message,
      );
    }
    this.reload();
  }

  async update(id: string, input: Partial<ShippingMethodInput>): Promise<void> {
    const { error } = await supabase.from('shipping_methods').update(input).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('shipping_methods').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }
}
