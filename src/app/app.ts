import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { ToastContainer } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly meta = inject(Meta);

  constructor() {
    // Dopóki sklep jest zamknięty, nie ma po co trafiać do wyszukiwarek.
    // Znacznik znika sam po ustawieniu SITE_LOCKED=false — nie trzeba o nim pamiętać.
    if (environment.siteLocked) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    }
  }
}
