import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export type AdminTab = 'orders' | 'products' | 'messages' | 'shipping';

@Component({
  selector: 'app-admin-header',
  imports: [RouterLink],
  templateUrl: './admin-header.html',
  styleUrl: './admin-header.scss',
})
export class AdminHeader {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly active = input.required<AdminTab>();

  protected readonly adminEmail = this.auth.userEmail;

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/admin/login']);
  }
}
