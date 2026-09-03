import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AdminHeader } from '../../components/admin-header/admin-header';
import { AdminMessagesService } from '../../services/admin-messages.service';

type MessageFilter = 'pending' | 'all';

@Component({
  selector: 'app-admin-messages',
  imports: [DatePipe, AdminHeader],
  templateUrl: './admin-messages.html',
  styleUrl: './admin-messages.scss',
})
export class AdminMessagesPage {
  protected readonly messagesService = inject(AdminMessagesService);

  protected readonly filter = signal<MessageFilter>('pending');
  protected readonly updateError = signal<string | null>(null);

  protected readonly visibleMessages = computed(() => {
    const messages = this.messagesService.messages() ?? [];
    return this.filter() === 'pending' ? messages.filter((message) => !message.handled) : messages;
  });

  protected setFilter(value: MessageFilter): void {
    this.filter.set(value);
  }

  protected async toggleHandled(id: string, handled: boolean): Promise<void> {
    this.updateError.set(null);
    try {
      await this.messagesService.setHandled(id, handled);
    } catch (error) {
      this.updateError.set(
        error instanceof Error ? error.message : 'Nie udało się zapisać zmiany.',
      );
    }
  }
}
