import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase-client';

/**
 * Formularz z danymi do zaproszeń, otwierany z prywatnego linku wysłanego mailem.
 * Dostęp daje wyłącznie token — obie operacje idą przez funkcje `security definer`,
 * które nie ujawniają niczego poza tym jednym zamówieniem.
 */
export type OrderDetailsState = 'ready' | 'not_found' | 'not_paid' | 'cancelled';

export interface OrderDetailsItem {
  name: string;
  quantity: number;
}

export interface OrderDetailsForm {
  state: OrderDetailsState;
  order_id?: string;
  customer_name?: string;
  created_at?: string;
  locked?: boolean;
  submitted_at?: string | null;
  personalisation?: Record<string, string>;
  items?: OrderDetailsItem[];
}

export type SaveDetailsState = 'saved' | 'not_found' | 'not_paid' | 'locked';

@Injectable({ providedIn: 'root' })
export class OrderDetailsService {
  async load(token: string): Promise<OrderDetailsForm> {
    const { data, error } = await supabase.rpc('get_order_details_form', { p_token: token });
    if (error) {
      throw new Error(error.message);
    }
    return data as OrderDetailsForm;
  }

  async save(token: string, personalisation: Record<string, string>): Promise<SaveDetailsState> {
    const { data, error } = await supabase.rpc('save_order_details', {
      p_token: token,
      p_personalisation: personalisation,
    });
    if (error) {
      throw new Error(error.message);
    }
    return (data as { state: SaveDetailsState }).state;
  }
}
