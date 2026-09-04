import { ProductConfiguration } from './product-options';
import { PaymentMethod } from './shipping';

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
  configuration: ProductConfiguration | null;
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
  /** Metoda dostawy zapisana w chwili zakupu — nazwa nie zmienia się z cennikiem. */
  shipping_method_code: string | null;
  shipping_method_name: string | null;
  shipping_cost: number;
  shipping_point: string | null;
  payment_method: PaymentMethod;
  /** Wartość produktów po rabatach ilościowych, przed kuponem i dostawą. */
  items_subtotal: number;
  coupon_code: string | null;
  discount_amount: number;
  total_amount: number;
  terms_accepted_at: string | null;
  withdrawal_waiver_accepted_at: string | null;
  /** Dane uroczystości z formularza wypełnianego po opłaceniu — jeden komplet na zamówienie. */
  personalisation: Record<string, string> | null;
  personalisation_submitted_at: string | null;
  /** Sekret w linku do formularza. Klient dostaje go mailem po opłaceniu. */
  personalisation_token: string;
  order_placed_email_sent_at: string | null;
  payment_email_sent_at: string | null;
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
