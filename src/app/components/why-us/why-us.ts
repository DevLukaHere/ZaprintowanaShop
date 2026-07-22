import { Component } from '@angular/core';

interface Feature {
  stat: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-why-us',
  imports: [],
  templateUrl: './why-us.html',
  styleUrl: './why-us.scss',
})
export class WhyUs {
  protected readonly features: Feature[] = [
    {
      stat: '100%',
      label: 'Rzemiosło',
      description: 'Ręczne wykończenie każdej karty',
    },
    {
      stat: '∞',
      label: 'Personalizacja',
      description: 'Bez limitów na zmiany i dostosowania',
    },
    {
      stat: '✦',
      label: 'Premium',
      description: 'Papiery najwyższej klasy',
    },
  ];
}
