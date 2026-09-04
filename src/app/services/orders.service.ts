import { Injectable, resource } from '@angular/core';
import { OrderMode } from '../core/pricing';
import { supabase } from '../core/supabase-client';
import { CheckoutDetails, Order, OrderStatus, PaymentStatus } from '../models/order';
import { ProductConfiguration } from '../models/product-options';
import { PaymentMethod } from '../models/shipping';

export interface OrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  mode: OrderMode;
  configuration: ProductConfiguration;
}

/** Wybory z drugiej części formularza zamówienia: dostawa, płatność, kupon, zgody. */
export interface OrderCheckoutOptions {
  shippingMethodCode: string;
  paymentMethod: PaymentMethod;
  shippingPoint: string | null;
  couponCode: string | null;
  /** Wartość produktów, od której baza liczy rabat i próg darmowej dostawy. */
  itemsSubtotal: number;
  termsAccepted: boolean;
  withdrawalWaiver: boolean;
}

/** Maile transakcyjne wysyła Edge Function `send-order-email`. */
export type OrderEmailKind = 'order-placed' | 'payment-received';

export interface OrderEmailResult {
  sent: boolean;
  reason?: string;
}

/** Baza mówi po angielsku i technicznie — klientowi pokazujemy zdanie po polsku. */
function translateOrderError(message: string): string {
  if (message.includes('Coupon rejected')) {
    return 'Kod rabatowy przestał być ważny w trakcie składania zamówienia. Usuń go i spróbuj ponownie.';
  }
  if (message.includes('requires a pickup point')) {
    return 'Wybrana metoda dostawy wymaga wskazania punktu odbioru.';
  }
  if (message.includes('Cash on delivery')) {
    return 'Dla tej metody dostawy pobranie jest niedostępne.';
  }
  if (message.includes('Unknown shipping method')) {
    return 'Wybrana metoda dostawy jest już niedostępna. Wybierz inną.';
  }
  return message;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly ordersResource = resource({
    loader: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []) as Order[];
    },
  });

  readonly orders = this.ordersResource.value;
  readonly isLoading = this.ordersResource.isLoading;
  readonly error = this.ordersResource.error;

  reload(): void {
    this.ordersResource.reload();
  }

  /**
   * Koszt dostawy i wysokość rabatu wylicza baza — z tabeli metod i z kuponu.
   * Stąd przekazujemy sam kod metody i kod kuponu, a nie kwoty.
   */
  async createOrder(
    details: CheckoutDetails,
    items: readonly OrderLineInput[],
    options: OrderCheckoutOptions,
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_order', {
      p_customer_name: details.customerName,
      p_customer_email: details.customerEmail,
      p_customer_phone: details.customerPhone,
      p_shipping_address: details.shippingAddress,
      p_shipping_city: details.shippingCity,
      p_shipping_postcode: details.shippingPostcode,
      p_notes: details.notes,
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        mode: item.mode,
        configuration: item.configuration,
      })),
      p_shipping_method_code: options.shippingMethodCode,
      p_payment_method: options.paymentMethod,
      p_shipping_point: options.shippingPoint,
      p_coupon_code: options.couponCode,
      p_items_subtotal: options.itemsSubtotal,
      p_terms_accepted: options.termsAccepted,
      p_withdrawal_waiver: options.withdrawalWaiver,
    });

    if (error) {
      throw new Error(translateOrderError(error.message));
    }
    return data as string;
  }

  /**
   * Wysyłka nigdy nie blokuje głównej operacji — jeśli poczta nie jest skonfigurowana
   * albo dostawca odmówi, zamówienie i tak jest złożone, a panel pokazuje link
   * do formularza do wysłania ręcznie.
   */
  async sendEmail(orderId: string, kind: OrderEmailKind): Promise<OrderEmailResult> {
    try {
      const { data, error } = await supabase.functions.invoke<OrderEmailResult>(
        'send-order-email',
        { body: { orderId, kind } },
      );
      if (error) {
        return { sent: false, reason: error.message };
      }
      return data ?? { sent: false, reason: 'no_response' };
    } catch (invokeError) {
      return {
        sent: false,
        reason: invokeError instanceof Error ? invokeError.message : 'invoke_failed',
      };
    }
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }

  /** Oznaczenie jako opłacone uruchamia maila z linkiem do formularza. */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
  ): Promise<OrderEmailResult | null> {
    // `paid_at` ustawia trigger `orders_set_paid_at` — nie nadpisujemy go z klienta.
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId);
    if (error) {
      throw new Error(error.message);
    }

    const emailResult =
      paymentStatus === 'paid' ? await this.sendEmail(orderId, 'payment-received') : null;

    this.reload();
    return emailResult;
  }
}
