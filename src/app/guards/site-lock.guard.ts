import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Blokada sklepu na czas developmentu: dopóki `SITE_LOCKED` jest włączone, każda
 * strona wymaga zalogowania na konto administratora. Po starcie sklepu wystarczy
 * ustawić `SITE_LOCKED=false` w `.env` — kodu ani tras nie trzeba ruszać.
 *
 * To zapora przed przypadkowym gościem, nie zabezpieczenie danych. Aplikacja jest
 * statyczna, więc jej kod pobierze każdy, kto zna adres; tym, co naprawdę chroni
 * zamówienia i wiadomości, są reguły RLS po stronie bazy.
 */
export const siteLockGuard: CanActivateFn = async (_route, state) => {
  if (!environment.siteLocked) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (await auth.checkIsAdmin()) {
    return true;
  }

  // `next` odsyła po zalogowaniu tam, dokąd ktoś pierwotnie szedł.
  return router.createUrlTree(['/admin/login'], { queryParams: { next: state.url } });
};
