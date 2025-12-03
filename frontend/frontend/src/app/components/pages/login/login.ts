// frontend/src/app/pages/login/login.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Renderer2 } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  isLoading = false;
  loginData = { email: '', password: '' };

  constructor(
    private http: HttpClient,
    private router: Router,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Reuse the same auth-page-active class for the theme (guard for SSR)
    if (typeof document !== 'undefined') {
      this.renderer.addClass(document.body, 'auth-page-active');
    }
  }

  ngOnDestroy(): void {
    // Clean up the class when navigating away (guard for SSR)
    if (typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'auth-page-active');
    }
  }

  onLogin(): void {
    if (!this.loginData.email || !this.loginData.password) {
      alert('Please fill in all fields.');
      return;
    }

    this.isLoading = true;
    const apiUrl = 'http://localhost:3000/login';

    this.http.post(apiUrl, this.loginData).subscribe({
      next: (response) => {
        console.log('Login successful!', response);
        // Store user info in localStorage (as per your original code)
        localStorage.setItem('userEmail', this.loginData.email);
        alert('Login successful! Redirecting...');
  // Navigate to the course selection page
  this.router.navigate(['/course-select']);
      },
      error: (err) => {
        console.error('Login error:', err);
        const errorMessage = err.error?.message || 'An error occurred during login. Please try again.';
        alert(errorMessage);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}