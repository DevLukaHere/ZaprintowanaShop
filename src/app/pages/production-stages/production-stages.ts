import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { EXPRESS_SURCHARGE_RATE, PRODUCTION_LEAD_DAYS } from '../../models/pricing';

interface Stage {
  title: string;
  duration: string;
  description: string;
}

@Component({
  selector: 'app-production-stages',
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './production-stages.html',
  styleUrl: './production-stages.scss',
})
export class ProductionStagesPage {
  protected readonly leadDays = PRODUCTION_LEAD_DAYS;
  protected readonly expressPercent = EXPRESS_SURCHARGE_RATE * 100;

  protected readonly stages: Stage[] = [
    {
      title: 'Zamówienie i dane',
      duration: 'ten sam dzień',
      description:
        'Składacie zamówienie w sklepie i wypełniacie formularz — imiona, data, godzina i miejsca. Jeśli wybraliście personalizację kopert, dosyłacie listę gości. Potwierdzenie z numerem zamówienia dostajecie e-mailem od razu.',
    },
    {
      title: 'Projekt',
      duration: '1–2 dni robocze',
      description:
        'Nanosimy Wasze treści na wybrany wzór, dobieramy łamanie tekstu i sprawdzamy pisownię nazw własnych. Gotowy projekt w PDF wysyłamy na podany adres e-mail.',
    },
    {
      title: 'Akceptacja',
      duration: 'zależy od Was',
      description:
        'Sprawdzacie projekt i zgłaszacie poprawki — poprawki są bezpłatne i bez limitu. Do druku trafia dopiero wersja, którą zaakceptujecie pisemnie. Ten etap nie wlicza się do czasu realizacji.',
    },
    {
      title: 'Druk i wykończenie',
      duration: '2–3 dni robocze',
      description:
        'Drukujemy, a następnie wykańczamy ręcznie: złocenie na gorąco, bigowanie, sznurki, opaski i kompletowanie zestawów z kopertami.',
    },
    {
      title: 'Wysyłka',
      duration: '1–2 dni robocze',
      description:
        'Pakujemy w karton zabezpieczony przed zgnieceniem i nadajemy przesyłkę. Numer do śledzenia wysyłamy e-mailem w dniu nadania.',
    },
  ];
}
