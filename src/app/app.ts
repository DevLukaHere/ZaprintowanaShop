import { Component } from '@angular/core';
import { Navbar } from './components/navbar/navbar';
import { Hero } from './components/hero/hero';
import { ProductCarousel } from './components/product-carousel/product-carousel';
import { WhyUs } from './components/why-us/why-us';
import { Consultation } from './components/consultation/consultation';
import { Footer } from './components/footer/footer';

@Component({
  selector: 'app-root',
  imports: [Navbar, Hero, ProductCarousel, WhyUs, Consultation, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
