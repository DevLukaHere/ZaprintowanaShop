import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const AUTO_DISMISS_MS = 3000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  private nextId = 0;

  readonly toasts = this.toastsSignal.asReadonly();

  show(message: string, type: ToastType = 'success'): void {
    const id = this.nextId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, message, type }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
