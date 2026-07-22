import { Component, inject } from '@angular/core';
import { COLLECTIONS, Collection } from '../../models/collection';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly cart = inject(CartService);

  protected getCollection(id: string): Collection | undefined {
    return COLLECTIONS.find((collection) => collection.id === id);
  }
}
