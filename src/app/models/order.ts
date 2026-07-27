export type OrderStatus = 'new' | 'in_progress' | 'done' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nowe',
  in_progress: 'W realizacji',
  done: 'Zrealizowane',
  cancelled: 'Anulowane',
};

export type PaymentStatus = 'unpaid' | 'paid';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Nieopłacone',
  paid: 'Opłacone',
};

export interface OrderItem {
  id: number;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

export interface Order {
  id: string;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  paid_at: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_postcode: string;
  notes: string | null;
  order_items: OrderItem[];
}

/** Shipping/contact details collected at checkout. */
export interface CheckoutDetails {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostcode: string;
  notes: string;
}
