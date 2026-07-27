import { Component, inject } from '@angular/core';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { Collection } from '../../models/collection';
import { PricePipe } from '../../pipes/price.pipe';
import { CartService } from '../../services/cart.service';
import { ProductsService } from '../../services/products.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-gallery',
  imports: [Navbar, Footer, PricePipe],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class GalleryPage {
  protected readonly cart = inject(CartService);
  protected readonly productsService = inject(ProductsService);
  private readonly toast = inject(ToastService);

  protected addToCart(product: Collection): void {
    this.cart.addToCart(product.id);
    this.toast.show(`Dodano „${product.name}” do koszyka!`);
  }
}
