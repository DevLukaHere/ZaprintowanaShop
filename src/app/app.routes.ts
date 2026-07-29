import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';
import { adminGuard } from './guards/admin.guard';

const catalog = () => import('./pages/catalog/catalog').then((m) => m.CatalogPage);
const product = () => import('./pages/product/product').then((m) => m.ProductPage);

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Zaprintowana - serio fajne kartki' },
  {
    path: 'checkout',
    title: 'Zamówienie — Zaprintowana',
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.CheckoutPage),
  },
  { path: 'gallery', redirectTo: 'sklep', pathMatch: 'full' },
  { path: 'sklep', title: 'Wszystkie produkty — Zaprintowana', loadComponent: catalog },
  { path: 'kategoria/:category', title: 'Kategoria — Zaprintowana', loadComponent: catalog },
  {
    path: 'kategoria/:category/:subcategory',
    title: 'Kategoria — Zaprintowana',
    loadComponent: catalog,
  },
  { path: 'produkt/:id', title: 'Produkt — Zaprintowana', loadComponent: product },
  {
    path: 'produkt/:id/probka',
    title: 'Zamów próbne zaproszenie — Zaprintowana',
    data: { mode: 'sample' },
    loadComponent: product,
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
