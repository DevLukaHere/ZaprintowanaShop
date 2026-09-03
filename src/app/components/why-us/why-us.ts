import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DISCOUNT_TIERS,
  EXPRESS_SURCHARGE_RATE,
  FREE_SHIPPING_THRESHOLD,
  MIN_QUANTITY,
  PRODUCTION_LEAD_DAYS,
} from '../../models/pricing';

interface Feature {
  mark: string;
  label: string;
  description: string;
  link?: { label: string; commands: string[] };
}

const sortedTiers = [...DISCOUNT_TIERS].sort((a, b) => a.threshold - b.threshold);

const discounts = sortedTiers
  .map((tier) => `${tier.rate * 100}% od ${tier.threshold} zł`)
  .join(', ');

const maxDiscountPercent = Math.max(...sortedTiers.map((tier) => tier.rate)) * 100;

@Component({
  selector: 'app-why-us',
  imports: [RouterLink],
  templateUrl: './why-us.html',
  styleUrl: './why-us.scss',
})
export class WhyUs {
  protected readonly features: Feature[] = [
    {
      mark: '∞',
      label: 'Darmowy projekt i personalizacja',
      description: `Projekt i naniesienie Waszych danych są w cenie. Minimalna ilość to ${MIN_QUANTITY} szt.`,
    },
    {
      mark: '✦',
      label: 'Darmowa dostawa',
      description: `Zamówienia powyżej ${FREE_SHIPPING_THRESHOLD} zł wysyłamy na nasz koszt.`,
    },
    {
      mark: `${PRODUCTION_LEAD_DAYS} dni`,
      label: 'Czas realizacji',
      description: `Tyle roboczych dni zajmuje standardowe zamówienie. Realizacja express skraca ten czas za dopłatą ${EXPRESS_SURCHARGE_RATE * 100}%.`,
      link: { label: 'Etapy i czas realizacji', commands: ['/production-stages'] },
    },
    {
      mark: '✉',
      label: 'Sprawna obsługa',
      description:
        'Doradzimy przy wyborze papieru, kopert i układu tekstu. Odpowiadamy w dni robocze.',
      link: { label: 'Napisz do nas', commands: ['/contact'] },
    },
    {
      mark: '100%',
      label: 'Bez ukrytych kosztów',
      description: 'Cena widoczna przy produkcie zawiera wszystko, co niezbędne do wysyłki.',
    },
    {
      mark: `do ${maxDiscountPercent}%`,
      label: 'Rabaty ilościowe',
      description: `Im większe zamówienie, tym niższa cena: ${discounts}.`,
    },
  ];
}
