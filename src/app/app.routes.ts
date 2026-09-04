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
  {
    path: 'order/:token',
    title: 'Dane do zaproszeń — Zaprintowana',
    loadComponent: () =>
      import('./pages/order-details/order-details').then((m) => m.OrderDetailsPage),
  },
  {
    path: 'production-stages',
    title: 'Etapy i czas realizacji — Zaprintowana',
    loadComponent: () =>
      import('./pages/production-stages/production-stages').then((m) => m.ProductionStagesPage),
  },
  {
    path: 'contact',
    title: 'Kontakt — Zaprintowana',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.ContactPage),
  },
  {
    path: 'terms',
    title: 'Regulamin — Zaprintowana',
    loadComponent: () => import('./pages/terms/terms').then((m) => m.TermsPage),
  },
  {
    path: 'privacy-policy',
    title: 'Polityka prywatności — Zaprintowana',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicyPage),
  },
  {
    path: 'gdpr',
    title: 'RODO — Zaprintowana',
    loadComponent: () => import('./pages/gdpr/gdpr').then((m) => m.GdprPage),
  },
  { path: 'shop', title: 'Wszystkie produkty — Zaprintowana', loadComponent: catalog },
  { path: 'category/:category', title: 'Kategoria — Zaprintowana', loadComponent: catalog },
  {
    path: 'category/:category/:subcategory',
    title: 'Kategoria — Zaprintowana',
    loadComponent: catalog,
  },
  { path: 'product/:id', title: 'Produkt — Zaprintowana', loadComponent: product },
  {
    path: 'product/:id/sample',
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
  {
    path: 'admin/messages',
    title: 'Panel — wiadomości',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-messages/admin-messages').then((m) => m.AdminMessagesPage),
  },
  {
    path: 'admin/shipping',
    title: 'Panel — dostawa i kupony',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin-shipping/admin-shipping').then((m) => m.AdminShippingPage),
  },
  { path: '**', redirectTo: '' },
];
