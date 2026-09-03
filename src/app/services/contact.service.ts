import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase-client';

export interface ContactMessageInput {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export interface ContactMessage {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  handled: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  async send(input: ContactMessageInput): Promise<void> {
    const { error } = await supabase.from('contact_messages').insert({
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim() || null,
      subject: input.subject.trim() || null,
      message: input.message.trim(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
