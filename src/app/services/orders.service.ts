import { Injectable, resource } from '@angular/core';
import { OrderMode } from '../core/pricing';
import { supabase } from '../core/supabase-client';
import { CheckoutDetails, Order, OrderStatus, PaymentStatus } from '../models/order';
import { ProductConfiguration } from '../models/product-options';

export interface OrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  mode: OrderMode;
  configuration: ProductConfiguration;
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

  async createOrder(details: CheckoutDetails, items: readonly OrderLineInput[]): Promise<string> {
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
    });

    if (error) {
      throw new Error(error.message);
    }
    return data as string;
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }
}
