import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import {
  COMPLAINT_RESPONSE_DAYS,
  CONFORMITY_YEARS,
  LEGAL_UPDATED_AT,
  SELLER,
  WITHDRAWAL_DAYS,
  fullSellerAddress,
  hasPlaceholders,
  placeholderFields,
} from '../../models/legal';
import { MIN_QUANTITY, PRODUCTION_LEAD_DAYS } from '../../models/pricing';
import { PricePipe } from '../../pipes/price.pipe';
import { ShippingService } from '../../services/shipping.service';

@Component({
  selector: 'app-terms',
  imports: [RouterLink, Navbar, Footer, PricePipe],
  templateUrl: './terms.html',
  styleUrl: '../legal.scss',
})
export class TermsPage {
  private readonly shipping = inject(ShippingService);

  protected readonly seller = SELLER;
  protected readonly sellerAddress = fullSellerAddress();
  protected readonly updatedAt = LEGAL_UPDATED_AT;
  protected readonly hasPlaceholders = hasPlaceholders;
  protected readonly placeholderFields = placeholderFields.join(', ');

  protected readonly withdrawalDays = WITHDRAWAL_DAYS;
  protected readonly complaintDays = COMPLAINT_RESPONSE_DAYS;
  protected readonly conformityYears = CONFORMITY_YEARS;
  protected readonly leadDays = PRODUCTION_LEAD_DAYS;
  protected readonly minQuantity = MIN_QUANTITY;

  /** Cennik dostawy bierzemy z tej samej tabeli co koszyk — nie da się rozjechać. */
  protected readonly methods = this.shipping.activeMethods;
}
