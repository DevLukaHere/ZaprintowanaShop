import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Hero } from '../../components/hero/hero';
import { ProductCarousel } from '../../components/product-carousel/product-carousel';
import { WhyUs } from '../../components/why-us/why-us';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-home',
  imports: [Navbar, Hero, ProductCarousel, WhyUs, Footer],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {}
