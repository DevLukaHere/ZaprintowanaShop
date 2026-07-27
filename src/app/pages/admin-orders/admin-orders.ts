import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AdminHeader } from '../../components/admin-header/admin-header';
import {
  ORDER_STATUS_LABELS,
  Order,
  OrderStatus,
  PAYMENT_STATUS_LABELS,
  PaymentStatus,
} from '../../models/order';
import { OrdersService } from '../../services/orders.service';

const ALL_STATUSES: OrderStatus[] = ['new', 'in_progress', 'done', 'cancelled'];
const ALL_PAYMENT_STATUSES: PaymentStatus[] = ['unpaid', 'paid'];

type SortColumn = 'created_at' | 'customer_name' | 'shipping_city' | 'payment_status' | 'status';
type SortDirection = 'asc' | 'desc';

const STATUS_ORDER: Record<OrderStatus, number> = { new: 0, in_progress: 1, done: 2, cancelled: 3 };
const PAYMENT_ORDER: Record<PaymentStatus, number> = { unpaid: 0, paid: 1 };

@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, AdminHeader],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
})
export class AdminOrdersPage {
  protected readonly ordersService = inject(OrdersService);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly statuses = ALL_STATUSES;
  protected readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;

  protected readonly statusFilter = signal<OrderStatus | 'all'>('all');
  protected readonly paymentFilter = signal<PaymentStatus | 'all'>('all');
  protected readonly query = signal('');
  protected readonly statusError = signal<string | null>(null);

  protected readonly sortColumn = signal<SortColumn>('created_at');
  protected readonly sortDirection = signal<SortDirection>('desc');

  protected readonly visibleOrders = computed(() => {
    const orders = this.ordersService.orders() ?? [];
    const status = this.statusFilter();
    const payment = this.paymentFilter();
    const needle = this.query().trim().toLowerCase();
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    const filtered = orders.filter((order) => {
      if (status !== 'all' && order.status !== status) {
        return false;
      }
      if (payment !== 'all' && order.payment_status !== payment) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return (
        order.customer_name.toLowerCase().includes(needle) ||
        order.customer_email.toLowerCase().includes(needle) ||
        order.shipping_city.toLowerCase().includes(needle) ||
        order.id.toLowerCase().includes(needle)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (column) {
        case 'created_at':
          return direction * (Date.parse(a.created_at) - Date.parse(b.created_at));
        case 'customer_name':
          return direction * a.customer_name.localeCompare(b.customer_name, 'pl');
        case 'shipping_city':
          return direction * a.shipping_city.localeCompare(b.shipping_city, 'pl');
        case 'payment_status':
          return direction * (PAYMENT_ORDER[a.payment_status] - PAYMENT_ORDER[b.payment_status]);
        case 'status':
          return direction * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
      }
    });
  });

  protected readonly countsByStatus = computed(() => {
    const orders = this.ordersService.orders() ?? [];
    return ALL_STATUSES.reduce<Record<string, number>>(
      (counts, status) => {
        counts[status] = orders.filter((order) => order.status === status).length;
        return counts;
      },
      { all: orders.length },
    );
  });

  protected readonly countsByPayment = computed(() => {
    const orders = this.ordersService.orders() ?? [];
    return ALL_PAYMENT_STATUSES.reduce<Record<string, number>>(
      (counts, payment) => {
        counts[payment] = orders.filter((order) => order.payment_status === payment).length;
        return counts;
      },
      { all: orders.length },
    );
  });

  protected refresh(): void {
    this.statusFilter.set('all');
    this.paymentFilter.set('all');
    this.query.set('');
    this.ordersService.reload();
  }

  protected toggleSort(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set(column === 'created_at' ? 'desc' : 'asc');
  }

  protected sortIndicator(column: SortColumn): '↑' | '↓' | '↕' {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  protected itemCount(order: Order): number {
    return order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected formatPrice(value: number): string {
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2).replace('.', ',');
    return `${formatted} zł`;
  }

  protected async changeStatus(orderId: string, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value as OrderStatus;
    this.statusError.set(null);
    try {
      await this.ordersService.updateStatus(orderId, status);
    } catch (error) {
      this.statusError.set(
        error instanceof Error ? error.message : 'Nie udało się zmienić statusu zamówienia.',
      );
    }
  }

  protected async togglePaymentStatus(order: Order): Promise<void> {
    const next: PaymentStatus = order.payment_status === 'paid' ? 'unpaid' : 'paid';
    this.statusError.set(null);
    try {
      await this.ordersService.updatePaymentStatus(order.id, next);
    } catch (error) {
      this.statusError.set(
        error instanceof Error ? error.message : 'Nie udało się zmienić statusu płatności.',
      );
    }
  }
}
