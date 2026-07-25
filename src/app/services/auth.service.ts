import { Injectable, computed, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../core/supabase-client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Session | null>(null);
  private readonly admin = signal(false);

  /** Resolves once the persisted session (if any) has been restored. */
  private readonly restored: Promise<void>;

  readonly currentSession = this.session.asReadonly();
  readonly isAdmin = this.admin.asReadonly();
  readonly userEmail = computed(() => this.session()?.user.email ?? null);

  constructor() {
    this.restored = supabase.auth.getSession().then(async ({ data }) => {
      this.session.set(data.session);
      await this.refreshAdminFlag();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      void this.refreshAdminFlag();
    });
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return error.message;
    }
    await this.refreshAdminFlag();
    return this.admin() ? null : 'To konto nie ma uprawnień administratora.';
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /** True only for a logged-in user listed in public.admins. */
  async checkIsAdmin(): Promise<boolean> {
    await this.restored;
    return this.admin();
  }

  private async refreshAdminFlag(): Promise<void> {
    if (!this.session()) {
      this.admin.set(false);
      return;
    }
    const { data, error } = await supabase.rpc('is_admin');
    this.admin.set(!error && data === true);
  }
}
