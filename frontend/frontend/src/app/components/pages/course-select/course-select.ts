// frontend/src/app/pages/course-select/course-select.component.ts

import { Component, OnInit, OnDestroy, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Renderer2 } from '@angular/core';

// Define an interface for our class level data for type safety
export interface ClassLevel {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  imageUrl: string;
}

@Component({
  selector: 'app-course-select',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './course-select.html',
  styleUrls: ['./course-select.css'] // This file can be empty
})
export class CourseSelectComponent implements OnInit, OnDestroy, AfterViewInit {

  // Use a signal so changes are picked up when provideZonelessChangeDetection() is enabled
  private isLoadingSignal = signal(true);

  // Expose a getter for template binding
  get isLoading(): boolean { return this.isLoadingSignal(); }
  classLevels: ClassLevel[] = [
    {
      id: "class1-5",
      title: "1st - 5th Grade",
      subtitle: "Foundation Building",
      description: "Building strong fundamentals and curiosity",
      gradient: "gradient-pink",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
    },
    {
      id: "class6-10",
      title: "6th - 10th Grade",
      subtitle: "Skill Development",
      description: "Developing practical skills and career awareness",
      gradient: "gradient-blue",
      imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
    },
    {
      id: "summer",
      title: "Summer Special",
      subtitle: "Intensive Growth",
      description: "Accelerated learning and skill enhancement",
      gradient: "gradient-amber",
      imageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
    },
    {
      id: "class11-12",
      title: "11th - 12th Grade",
      subtitle: "Career Preparation",
      description: "Strategic career planning and college readiness",
      gradient: "gradient-purple",
      imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
    },
    {
      id: "grad",
      title: "Graduation Level",
      subtitle: "Professional Readiness",
      description: "Job readiness and industry skills",
      gradient: "gradient-emerald",
      imageUrl: "https://images.pexels.com/photos/267885/pexels-photo-267885.jpeg?auto=compress&cs=tinysrgb&w=500&h=750&dpr=1"
    },
    {
      id: "life",
      title: "Life Beyond Academics",
      subtitle: "Holistic Success",
      description: "Life skills and entrepreneurial mindset",
      gradient: "gradient-cyan",
      imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
    }
  ];

  private intersectionObserver: IntersectionObserver | null = null;

  constructor(
    private router: Router,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Add the theme class to the body (guard for SSR)
    if (typeof document !== 'undefined') {
      this.renderer.addClass(document.body, 'course-select-active');
    }

    // Simulate loading time and clear loading signal (use signal API)
    setTimeout(() => {
      this.isLoadingSignal.set(false);
    }, 1500); // 1.5 second loading screen
  }

  ngOnDestroy(): void {
    // Clean up the class and observer (guard for SSR)
    if (typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'course-select-active');
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  ngAfterViewInit(): void {
    // Set up scroll animations for the cards
    this.setupScrollAnimations();
  }

  // Method to handle navigation when a "Start Learning" button is clicked
  startLearning(levelId: string): void {
    // The original code has specific routing logic
    let url = `/${levelId}`;
    if (levelId === 'life') {
      url = '/life-skills'; // Assuming you'll have a route for this
    }
    try {
      console.debug('[CourseSelect] startLearning called, levelId=', levelId, 'navigating to', url);
      // Use navigateByUrl to be explicit about the URL and provide a fallback
      this.router.navigateByUrl(url).then(success => {
        if (!success) {
          console.warn('[CourseSelect] Navigation to', url, 'returned false — falling back to full page navigation');
          if (typeof window !== 'undefined') { window.location.href = url; }
        }
      }).catch(err => {
        console.error('[CourseSelect] Navigation error:', err, ' — falling back to full page navigation');
        if (typeof window !== 'undefined') { window.location.href = url; }
      });
    } catch (err) {
      console.error('[CourseSelect] startLearning sync error:', err, ' — falling back to full page navigation');
      if (typeof window !== 'undefined') { window.location.href = url; }
    }
  }

  private setupScrollAnimations(): void {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    // Guard for environments without window/IntersectionObserver (SSR)
    if (typeof window === 'undefined' || typeof (window as any).IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'slide-up');
        }
      });
    }, options);

    // We need to wait a tick for the *ngFor elements to be rendered
    setTimeout(() => {
      if (typeof document === 'undefined') { return; }
      const cards = document.querySelectorAll('.course-select-active .card');
      cards.forEach((card, index) => {
        // Add a staggered animation delay
        setTimeout(() => {
          this.intersectionObserver?.observe(card);
        }, index * 100);
      });
    }, 0);
  }

  
}

