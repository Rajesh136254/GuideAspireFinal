// frontend/src/app/pages/signup/signup.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Renderer2 } from '@angular/core';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css'] // We will use this file for component-specific styles
})
export class SignupComponent implements OnInit, OnDestroy {

  isShowingSignup = true;
  isLoading = false;

  signupData = { name: '', email: '', password: '' };
  forgotPasswordData = { email: '', newPassword: '' };

  constructor(
    private http: HttpClient,
    private router: Router,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Add the generic auth-page-active class to the body (guard for SSR)
    if (typeof document !== 'undefined') {
      this.renderer.addClass(document.body, 'auth-page-active');
    }
  }

  ngOnDestroy(): void {
    // IMPORTANT: Remove the class when navigating away (guard for SSR)
    if (typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'auth-page-active');
    }
  }

  // --- The rest of your component logic remains the same ---
  showForgotPassword(): void { this.isShowingSignup = false; }
  showSignup(): void { this.isShowingSignup = true; }

  onSignup(): void {
    if (!this.signupData.name || !this.signupData.email || !this.signupData.password) {
      alert('Please fill in all fields.'); return;
    }
    this.isLoading = true;
  // Backend runs on port 3000
  this.http.post('http://localhost:3000/signup', this.signupData).subscribe({
      next: (response) => { alert('Signup successful! Redirecting to login...'); this.router.navigate(['/login']); },
      error: (err) => { const errorMessage = err.error?.message || 'An error occurred during signup. Please try again.'; alert(errorMessage); this.isLoading = false; },
      complete: () => { this.isLoading = false; }
    });
  }

  onForgotPassword(): void {
    if (!this.forgotPasswordData.email || !this.forgotPasswordData.newPassword) {
      alert('Please fill in all fields.'); return;
    }
    this.isLoading = true;
  this.http.post('http://localhost:3000/forgot-password', this.forgotPasswordData).subscribe({
      next: (response) => { alert('Password reset successful! Redirecting to login...'); this.router.navigate(['/login']); },
      error: (err) => { const errorMessage = err.error?.message || 'An error occurred. Please try again.'; alert(errorMessage); this.isLoading = false; },
      complete: () => { this.isLoading = false; }
    });
  }
}