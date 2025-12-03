// frontend/src/app/pages/home/home.component.ts

import { Component, OnInit, OnDestroy, HostListener, Renderer2, ElementRef, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {

  // --- Properties to hold state (signals for zoneless change detection) ---
  private isLoadingSignal = signal(true);
  private isScrolledSignal = signal(false);
  currentVote: string | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private loadListener: (() => void) | null = null;
  private fallbackTimeout: any = null;

  // Expose getters for template binding
  get isLoading(): boolean { return this.isLoadingSignal(); }
  get isScrolled(): boolean { return this.isScrolledSignal(); }

  // --- Constructor for Dependency Injection ---
  constructor(private renderer: Renderer2, private el: ElementRef) {}

  // --- Lifecycle Hook: Runs when the component is initialized ---
  ngOnInit(): void {
    // Set up scroll animations only in the browser
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.setupScrollAnimations();
    }
  }

  // --- Lifecycle Hook that runs after the view is fully initialized ---
  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      this.checkIfPageIsLoadedAndHideLoader();

      // Listen for the window's 'load' event as a backup (handles images/resources).
      this.loadListener = () => this.hideLoadingScreen();
      window.addEventListener('load', this.loadListener);

      // Fallback: hide the loader after a short delay to avoid indefinite loading
      this.fallbackTimeout = setTimeout(() => this.hideLoadingScreen(), 700);
    }
  }

  // --- Lifecycle Hook: Runs when the component is destroyed ---
  ngOnDestroy(): void {
    // Clean up the observer to prevent memory leaks
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    // Remove load listener and clear fallback timeout
    if (this.loadListener && typeof window !== 'undefined') {
      window.removeEventListener('load', this.loadListener);
      this.loadListener = null;
    }
    if (this.fallbackTimeout) {
      clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
  }

  // --- Private Helper Methods for Loading ---

  private checkIfPageIsLoadedAndHideLoader(): void {
    if (typeof document !== 'undefined' && document.readyState === 'complete') {
      this.hideLoadingScreen();
    }
  }

  private hideLoadingScreen(): void {
    // A tiny timeout gives the browser a moment to "paint" the styles.
    setTimeout(() => {
      this.isLoadingSignal.set(false);
    }, 100);
  }

  // --- HostListener: Listens to global window events ---
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    // Update signal so UI updates even with zoneless change detection
    this.isScrolledSignal.set(window.scrollY > 100 || document.documentElement.scrollTop > 100);

    // Parallax effect for hero section
    const hero = this.el.nativeElement.querySelector('.hero');
    if (hero) {
      const scrolled = window.pageYOffset || document.documentElement.scrollTop;
      this.renderer.setStyle(hero, 'transform', `translateY(${scrolled * 0.5}px)`);
    }
  }

  // --- Methods for User Interactions ---

  // Smooth scrolling for anchor links
  onSmoothScroll(event: Event, targetId: string): void {
    event.preventDefault();
    const targetElement = this.el.nativeElement.querySelector(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Poll functionality
  handlePoll(vote: string): void {
    this.currentVote = vote;
    alert('Thank you for your feedback!');
    // Here you would make an API call to your backend to save the vote
  }

  // Button loading state (example method)
  onButtonClick(button: HTMLButtonElement): void {
    const originalContent = button.innerHTML;
    this.renderer.setProperty(button, 'innerHTML', '<i class="fas fa-spinner fa-spin"></i> Loading...');
    this.renderer.setStyle(button, 'pointerEvents', 'none');

    setTimeout(() => {
      this.renderer.setProperty(button, 'innerHTML', originalContent);
      this.renderer.removeStyle(button, 'pointerEvents');
    }, 1000); // Simulate a network request
  }

  // Card click effect
  onCardClick(card: HTMLElement): void {
    this.renderer.setStyle(card, 'transform', 'scale(0.98)');
    setTimeout(() => {
      this.renderer.removeStyle(card, 'transform');
    }, 150);
  }

  // --- Private Helper Methods ---

  private setupScrollAnimations(): void {
    // Guard for environments (like SSR) where IntersectionObserver or window is not defined
    if (typeof window === 'undefined' || typeof (window as any).IntersectionObserver === 'undefined') {
      return;
    }
    // Scroll animations using IntersectionObserver
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'visible');
        }
      });
    }, options);

    // Find all elements with the 'scroll-fade' class within this component
    const fadeElements: NodeListOf<Element> = this.el.nativeElement.querySelectorAll('.scroll-fade');
    fadeElements.forEach((el: Element) => this.intersectionObserver?.observe(el));
  }
}