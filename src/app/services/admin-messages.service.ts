import { Injectable, computed, resource } from '@angular/core';
import { supabase } from '../core/supabase-client';
import { ContactMessage } from './contact.service';

@Injectable({ providedIn: 'root' })
export class AdminMessagesService {
  private readonly messagesResource = resource({
    loader: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return (data ?? []) as ContactMessage[];
    },
  });

  readonly messages = this.messagesResource.value;
  readonly isLoading = this.messagesResource.isLoading;
  readonly error = this.messagesResource.error;

  readonly pendingCount = computed(
    () => (this.messages() ?? []).filter((message) => !message.handled).length,
  );

  reload(): void {
    this.messagesResource.reload();
  }

  async setHandled(id: string, handled: boolean): Promise<void> {
    const { error } = await supabase.from('contact_messages').update({ handled }).eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    this.reload();
  }
}
