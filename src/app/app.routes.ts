import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Zaprintowana - serio fajne kartki' },
  {
    path: 'checkout',
    title: 'Zamówienie — Zaprintowana',
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.CheckoutPage),
  },
  {
    path: 'gallery',
    title: 'Galeria produktów — Zaprintowana',
    loadComponent: () => import('./pages/gallery/gallery').then((m) => m.GalleryPage),
  },
  {
    path: 'admin/login',
    title: 'Panel — logowanie',
    loadComponent: () => import('./pages/admin-login/admin-login').then((m) => m.AdminLoginPage),
  },
  {
    path: 'admin',
    title: 'Panel — zamówienia',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin-orders/admin-orders').then((m) => m.AdminOrdersPage),
  },
  {
    path: 'admin/products',
    title: 'Panel — produkty',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-products/admin-products').then((m) => m.AdminProductsPage),
  },
  { path: '**', redirectTo: '' },
];
