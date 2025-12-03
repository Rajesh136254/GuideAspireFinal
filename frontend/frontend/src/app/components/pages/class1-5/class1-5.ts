import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ViewEncapsulation, Renderer2, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SafePipe } from '../../../pipes/safe.pipe';
import { DataService } from '../../../services/data';
import { firstValueFrom } from 'rxjs';
import { Profile, Content, Video, ProgressPayload, ProfileUpdatePayload } from '../../../interfaces/profile.interface';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-class1-5',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterLink
  ],
  templateUrl: './class1-5.html',
  styleUrls: ['./class1-5.css'],
  encapsulation: ViewEncapsulation.None
})
export class Class1_5Component implements OnInit, AfterViewInit {
  // Template references
  @ViewChild('sidebar') sidebar!: ElementRef;
  @ViewChild('mobileMenuToggle') mobileMenuToggle!: ElementRef;
  @ViewChild('daysContainer') daysContainer!: ElementRef;
  @ViewChild('videoFrame') videoFrame!: ElementRef;
  @ViewChild('topicName') topicName!: ElementRef;
  @ViewChild('exerciseLink') exerciseLink!: ElementRef;
  @ViewChild('projectLink') projectLink!: ElementRef;
  @ViewChild('languageSelect') languageSelect!: ElementRef;
  @ViewChild('profileDropdown') profileDropdown!: ElementRef;
  @ViewChild('profileIcon') profileIcon!: ElementRef;
  @ViewChild('userName') userName!: ElementRef;
  @ViewChild('userEmailDisplay') userEmailDisplay!: ElementRef;
  @ViewChild('progressSummary') progressSummary!: ElementRef;
  @ViewChild('editProfileModal') editProfileModal!: ElementRef;
  @ViewChild('editName') editName!: ElementRef;
  @ViewChild('editEmail') editEmail!: ElementRef;
  @ViewChild('editPassword') editPassword!: ElementRef;
  @ViewChild('profilePictureInput') profilePictureInput!: ElementRef;

  // Component state
  selectedClass = 1;
  selectedDay = 1;
  progress: { [key: number]: number[] } = {}; // This line should be correct
  currentRangeStart = 1;
  userEmail = '';
  isInitialized = false;
  isBrowser: boolean;

  constructor(
    private router: Router,
    private dataService: DataService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // Check if we're running in browser
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Initialize progress for all classes
    for (let i = 1; i <= 5; i++) {
      this.progress[i] = [];
    }

    // Get user email from localStorage only if we're in browser
    if (this.isBrowser) {
      this.userEmail = localStorage.getItem('userEmail') || '';

      if (!this.userEmail || this.userEmail.trim() === '') {
        console.error('No valid user email found in localStorage.');
        alert('Please log in to track your progress.');
        this.router.navigate(['/login']);
      }
    }
  }

  ngAfterViewInit(): void {
    // Only initialize if we're in browser
    if (this.isBrowser) {
      // Use setTimeout to ensure all DOM elements are fully rendered
      setTimeout(() => {
        this.initialize();
      }, 100);
    }
  }

  // Initialize the component
  // Initialize the component
  // Initialize the component
  async initialize(): Promise<void> {
    try {
      // Check if user is logged in
      if (!this.userEmail || this.userEmail.trim() === '') {
        this.router.navigate(['/login']);
        return;
      }

      // Fetch user profile
      await this.fetchUserProfile();

      // Initialize progress for all classes
      for (let classNum = 1; classNum <= 5; classNum++) {
        this.selectedClass = classNum;
        await this.fetchProgress();
      }

      // Set Class 1 as default
      this.selectedClass = 1;
      this.selectedDay = 1;
      this.currentRangeStart = 1;

      // Update UI to show Class 1 as selected
      const firstClassItem = document.querySelector('.class-item[data-class="1"]');
      if (firstClassItem) {
        firstClassItem.classList.add('selected');
      }

      // Fetch progress for Class 1
      await this.fetchProgress();
      console.log('initialize: Initial progress:', this.progress);

      // Fetch progress summary
      await this.fetchProgressSummary();

      // Load Day 1 content
      this.loadDay(1);

      // Setup fullscreen handling
      this.setupFullscreenHandling();

      // Handle window resize
      window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
          this.sidebar.nativeElement.classList.remove('active');
        }
      });

      // Mark as initialized
      this.isInitialized = true;
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error during initialization:', error);
      alert('Failed to initialize the application. Please try again.');
    }
  }

  // Mobile menu toggle
  toggleMobileMenu(): void {
    if (this.isBrowser && this.sidebar) {
      this.sidebar.nativeElement.classList.toggle('active');
    }
  }

  // Close sidebar when clicking outside on mobile
  closeSidebarOnClickOutside(event: Event): void {
    if (!this.isBrowser) return;

    if (window.innerWidth <= 768 &&
      this.sidebar &&
      !this.sidebar.nativeElement.contains(event.target) &&
      !this.mobileMenuToggle.nativeElement.contains(event.target)) {
      this.sidebar.nativeElement.classList.remove('active');
    }
  }

  // Toggle profile dropdown
  toggleProfileDropdown(event: Event): void {
    if (this.isBrowser && this.profileDropdown) {
      event.stopPropagation();
      this.profileDropdown.nativeElement.classList.toggle('active');
    }
  }

  // Close dropdown when clicking outside
  closeProfileDropdown(event: Event): void {
    if (!this.isBrowser || !this.profileDropdown) return;

    if (!this.profileDropdown.nativeElement.contains(event.target)) {
      this.profileDropdown.nativeElement.classList.remove('active');
    }
  }

  // Fetch and display user profile
  async fetchUserProfile(): Promise<void> {
    try {
      if (!this.userEmail) {
        throw new Error('User email is not available');
      }

      const profile = await firstValueFrom(this.dataService.getProfile());

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update UI elements if they exist
      if (this.userName) {
        this.userName.nativeElement.textContent = profile.name || 'User';
      }

      if (this.userEmailDisplay) {
        this.userEmailDisplay.nativeElement.textContent = profile.email || this.userEmail;
      }

      if (this.editName) {
        this.editName.nativeElement.value = profile.name || '';
      }

      if (this.editEmail) {
        this.editEmail.nativeElement.value = profile.email || this.userEmail;
      }

      // Update profile picture
      if (this.profileIcon) {
        if (profile.profilePicture) {
          this.profileIcon.nativeElement.src = profile.profilePicture;
          this.profileIcon.nativeElement.onerror = () => {
            const initials = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
            this.profileIcon.nativeElement.src = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&rounded=true&size=48`;
          };
        } else {
          const initials = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
          this.profileIcon.nativeElement.src = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&rounded=true&size=48`;
        }
      }

      // Ensure progress stored locally for initial render
      if (Array.isArray(profile.progress)) {
        this.progress[1] = profile.progress.map(Number).filter(n => !isNaN(n));
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);

      // Set default values
      if (this.userName) {
        this.userName.nativeElement.textContent = 'User';
      }

      if (this.userEmailDisplay) {
        this.userEmailDisplay.nativeElement.textContent = this.userEmail;
      }

      if (this.profileIcon) {
        const initials = this.userEmail ? this.userEmail.charAt(0).toUpperCase() : 'U';
        this.profileIcon.nativeElement.src = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&rounded=true&size=48`;
      }

      // Initialize with empty progress
      this.progress[1] = [];
    }
  }

  // Handle profile picture change
  changeProfilePicture(): void {
    if (this.isBrowser && this.profilePictureInput) {
      this.profilePictureInput.nativeElement.click();
    }
  }

  // Handle profile picture input change
  async onProfilePictureChange(event: Event): Promise<void> {
    if (!this.isBrowser) return;

    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('email', this.userEmail);

    try {
      // Use DataService to upload picture
      const updatedProfile = await firstValueFrom(this.dataService.uploadProfilePicture(formData));
      if (updatedProfile && updatedProfile.profilePicture && this.profileIcon) {
        this.profileIcon.nativeElement.src = updatedProfile.profilePicture;
      }
      if (this.profileDropdown) {
        this.profileDropdown.nativeElement.classList.remove('active');
      }
      alert('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to update profile picture. Please try again.');
    }
  }

  // Edit profile modal
  openEditProfileModal(): void {
    if (this.isBrowser && this.editProfileModal && this.profileDropdown) {
      this.editProfileModal.nativeElement.classList.add('active');
      this.profileDropdown.nativeElement.classList.remove('active');
    }
  }

  closeEditProfileModal(): void {
    if (this.isBrowser && this.editProfileModal) {
      this.editProfileModal.nativeElement.classList.remove('active');
    }
  }

  // Close modal when clicking outside
  closeEditProfileModalOnClickOutside(event: Event): void {
    if (!this.isBrowser || !this.editProfileModal) return;

    if (event.target === this.editProfileModal.nativeElement) {
      this.editProfileModal.nativeElement.classList.remove('active');
    }
  }

  // Handle profile form submission
  async saveProfile(event: Event): Promise<void> {
    if (!this.isBrowser) return;

    event.preventDefault();

    const name = this.editName.nativeElement.value.trim();
    const password = this.editPassword.nativeElement.value.trim();

    if (!name) {
      alert('Name is required.');
      return;
    }

    try {
      // Retrieve current profile so we can include the existing progress array
      const currentProfile = await firstValueFrom(this.dataService.getProfile());
      const payload: ProfileUpdatePayload = {
        email: this.userEmail,
        progress: Array.isArray(currentProfile.progress) ? currentProfile.progress : [],
        name,
      };
      if (password) payload.password = password;

      await firstValueFrom(this.dataService.updateProfile(payload));

      alert('Profile updated successfully!');
      this.editProfileModal.nativeElement.classList.remove('active');
      await this.fetchUserProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile. Please try again.');
    }
  }

  // Handle logout
  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('userEmail');
      window.location.href = '/login';
    }
  }

  // Fetch Progress Summary
  // Fetch Progress Summary
  async fetchProgressSummary(): Promise<void> {
    try {
      let summary = 'Your Progress:<br><br>';

      // Get progress for each class separately
      for (let classNum = 1; classNum <= 5; classNum++) {
        let completedDays: number[] = [];

        try {
          // Try to get specific class progress
          const classProgress = await firstValueFrom(this.dataService.getProgress(this.userEmail, classNum));

          if (classProgress && Array.isArray(classProgress)) {
            completedDays = classProgress.map(Number).filter(day => !isNaN(day) && day >= 1 && day <= 50);
          }
        } catch (error) {
          // Fall back to stored progress if specific fetch fails
          completedDays = this.progress[classNum] || [];
        }

        // Update the stored progress
        this.progress[classNum] = completedDays;

        const completedCount = completedDays.length;
        summary += `Class ${classNum}: ${completedCount}/50 days completed<br>`;
      }

      if (this.progressSummary) {
        this.progressSummary.nativeElement.innerHTML = summary;
      }
    } catch (error: any) {
      console.error('Error fetching progress summary:', error);
      if (this.progressSummary) {
        this.progressSummary.nativeElement.textContent = 'Error loading progress. Please try again.';
      }
    }
  }

  // Fetch Progress for a specific class
  // Fetch Progress for a specific class
  async fetchProgress(): Promise<void> {
    try {
      console.log(`Fetching progress for class ${this.selectedClass}`);

      // Try to get progress for this specific class first
      try {
        const classProgress = await firstValueFrom(this.dataService.getProgress(this.userEmail, this.selectedClass));

        if (classProgress && Array.isArray(classProgress)) {
          this.progress[this.selectedClass] = classProgress.map(Number).filter(day => !isNaN(day) && day >= 1 && day <= 50);
        } else {
          this.progress[this.selectedClass] = [];
        }
      } catch (classError) {
        // If specific class progress fails, fall back to profile progress
        console.log('Falling back to profile progress for class', this.selectedClass);

        const profile = await firstValueFrom(this.dataService.getProfile());

        if (profile && profile.progress && Array.isArray(profile.progress)) {
          this.progress[this.selectedClass] = profile.progress
            .map(Number)
            .filter(day => !isNaN(day) && day >= 1 && day <= 50);
        } else {
          this.progress[this.selectedClass] = [];
        }
      }

      console.log(`Fetched progress for class ${this.selectedClass}:`, this.progress[this.selectedClass]);

      // Update UI
      this.updateDays();
    } catch (error: any) {
      console.error('Error fetching progress:', error);

      // Initialize with empty array if there's an error
      if (!this.progress[this.selectedClass]) {
        this.progress[this.selectedClass] = [];
      }

      // Still update UI
      this.updateDays();
    }
  }

  // Update the updateDays function
  updateDays(): void {
    if (!this.isBrowser || !this.daysContainer) return;

    const sectionHeader = document.querySelector('.section-header');
    const subSectionHeader = document.querySelector('.sub-section-header');
    const completedDays = this.progress[this.selectedClass] || [];

    console.log(`Updating days for class ${this.selectedClass}, completed days:`, completedDays);

    this.daysContainer.nativeElement.innerHTML = '';

    const rangeStart = this.currentRangeStart;
    const rangeEnd = Math.min(rangeStart + 9, 50);

    if (sectionHeader) {
      sectionHeader.textContent = `Day ${rangeStart}-${rangeEnd}: ${this.getSectionTitle(rangeStart)}`;
    }

    if (subSectionHeader) {
      const subRangeStart = Math.floor((this.selectedDay - 1) / 2) * 2 + 1;
      const subRangeEnd = Math.min(subRangeStart + 1, rangeEnd);
      subSectionHeader.textContent = `• Day ${subRangeStart}-${subRangeEnd}: ${this.getSubSectionTitle(subRangeStart)}`;
    }

    for (let i = rangeStart; i <= rangeEnd; i++) {
      const day = document.createElement('div');
      day.classList.add('day-item');
      day.textContent = `Day ${i}`;

      // Clear previous classes
      day.classList.remove('completed', 'unlocked', 'locked');

      if (completedDays.includes(i)) {
        day.classList.add('completed');
        console.log(`Day ${i}: Marked as completed`);
      } else if (i === 1 || (completedDays.length > 0 && i === Math.max(...completedDays) + 1)) {
        day.classList.add('unlocked');
        console.log(`Day ${i}: Marked as unlocked (next available)`);
      } else {
        day.classList.add('locked');
        console.log(`Day ${i}: Marked as locked`);
      }

      day.addEventListener('click', () => {
        if (day.classList.contains('completed') || day.classList.contains('unlocked')) {
          this.selectedDay = i;
          this.loadDay(i);
          this.updateDays();
          // Close mobile menu after selection
          if (window.innerWidth <= 768 && this.sidebar) {
            this.sidebar.nativeElement.classList.remove('active');
          }
        } else {
          console.log(`Day ${i} is locked and cannot be selected`);
        }
      });

      this.daysContainer.nativeElement.appendChild(day);
    }

    this.addNavigationButtons();
  }

  addNavigationButtons(): void {
    if (!this.isBrowser) return;

    const navButtonsContainer = document.querySelector('.nav-buttons-container');
    if (!navButtonsContainer) return;

    navButtonsContainer.innerHTML = '';

    if (this.currentRangeStart > 1) {
      const prevButton = document.createElement('button');
      prevButton.classList.add('nav-button', 'prev-button');
      prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
      prevButton.addEventListener('click', () => {
        this.currentRangeStart = Math.max(1, this.currentRangeStart - 10);
        this.updateDays();
      });
      navButtonsContainer.appendChild(prevButton);
    }

    if (this.currentRangeStart + 10 <= 50) {
      const nextButton = document.createElement('button');
      nextButton.classList.add('nav-button', 'next-button');
      nextButton.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
      nextButton.addEventListener('click', () => {
        this.currentRangeStart = Math.min(41, this.currentRangeStart + 10);
        this.updateDays();
      });
      navButtonsContainer.appendChild(nextButton);
    }
  }

  getSectionTitle(day: number): string {
    if (day >= 1 && day <= 10) return 'Analytical and Logical Skills';
    if (day >= 11 && day <= 20) return 'Communication Skills';
    if (day >= 21 && day <= 30) return 'Creative Thinking';
    if (day >= 31 && day <= 40) return 'Technology Skills';
    if (day >= 41 && day <= 50) return 'Life Skills';
    return '';
  }

  getSubSectionTitle(day: number): string {
    if (day % 2 === 1) {
      if (day >= 1 && day <= 2) return 'Problem-Solving (real-life scenarios)';
      if (day >= 3 && day <= 4) return 'Critical Thinking (evaluating simple choices)';
      if (day >= 5 && day <= 6) return 'Data Analysis (basic concepts)';
      if (day >= 7 && day <= 8) return 'Logical Reasoning (simple puzzles)';
      if (day >= 9 && day <= 10) return 'Decision-Making (simple choices)';
      if (day >= 11 && day <= 12) return 'Verbal Communication (speaking clearly)';
      if (day >= 13 && day <= 14) return 'Written Communication (basic writing)';
      if (day >= 15 && day <= 16) return 'Active Listening (following instructions)';
      if (day >= 17 && day <= 18) return 'Public Speaking (basic confidence-building)';
      if (day >= 19 && day <= 20) return 'Non-Verbal Communication (body language)';
      if (day >= 21 && day <= 22) return 'Innovation (simple problem-solving)';
      if (day >= 23 && day <= 24) return 'Design Thinking (basic creativity)';
      if (day >= 25 && day <= 26) return 'Artistic Expression (drawing and coloring)';
      if (day >= 27 && day <= 28) return 'Storytelling (basic narratives)';
      if (day >= 29 && day <= 30) return 'Creative Problem-Solving (simple challenges)';
      if (day >= 31 && day <= 32) return 'Digital Literacy (basic computer use)';
      if (day >= 33 && day <= 34) return 'Coding Basics (logical thinking)';
      if (day >= 35 && day <= 36) return 'Data Analysis Tools (basic concepts)';
      if (day >= 37 && day <= 38) return 'AI Basics (introduction to robots)';
      if (day >= 39 && day <= 40) return 'Cybersecurity Awareness (basic safety)';
      if (day >= 41 && day <= 42) return 'Time Management (basic routines)';
      if (day >= 43 && day <= 44) return 'Emotional Intelligence (EQ)';
      if (day >= 45 && day <= 46) return 'Adaptability (simple changes)';
      if (day >= 47 && day <= 48) return 'Financial Literacy (basic concepts)';
      if (day >= 49 && day <= 50) return 'Teamwork and Collaboration (group activities)';
    }
    return '';
  }

  async loadDay(day: number): Promise<void> {
    if (!this.isBrowser) return;

    this.selectedDay = day;
    try {
      // Use DataService which already targets the correct backend paths
      const lang = this.languageSelect?.nativeElement?.value || 'english';
      const content: Content = await firstValueFrom(this.dataService.getContent(this.selectedClass, day));
      const video: Video = await firstValueFrom(this.dataService.getVideo(this.selectedClass, day, lang));

      // Update UI
      if (this.topicName) {
        this.topicName.nativeElement.textContent = content?.topic || `Class ${this.selectedClass} - Day ${day}`;
      }

      if (this.videoFrame) {
        this.videoFrame.nativeElement.src = video?.youtube_id ?
          `https://www.youtube.com/embed/${video.youtube_id}?rel=0&modestbranding=1&autohide=1&showinfo=0&controls=1` : '';
      }

      if (this.exerciseLink) {
        this.exerciseLink.nativeElement.href = content?.quiz_link || '#';
        this.exerciseLink.nativeElement.style.pointerEvents = content?.quiz_link ? 'auto' : 'none';
        this.exerciseLink.nativeElement.style.opacity = content?.quiz_link ? '1' : '0.5';
      }

      if (this.projectLink) {
        this.projectLink.nativeElement.href = content?.project_link || '#';
        this.projectLink.nativeElement.style.pointerEvents = content?.project_link ? 'auto' : 'none';
        this.projectLink.nativeElement.style.opacity = content?.project_link ? '1' : '0.5';
      }
    } catch (err: any) {
      console.error('Error loading day content:', err);

      if (this.topicName) {
        this.topicName.nativeElement.textContent = `Class ${this.selectedClass} - Day ${day}`;
      }

      if (this.videoFrame) {
        this.videoFrame.nativeElement.src = '';
      }

      if (this.exerciseLink) {
        this.exerciseLink.nativeElement.href = '#';
        this.exerciseLink.nativeElement.style.pointerEvents = 'none';
        this.exerciseLink.nativeElement.style.opacity = '0.5';
      }

      if (this.projectLink) {
        this.projectLink.nativeElement.href = '#';
        this.projectLink.nativeElement.style.pointerEvents = 'none';
        this.projectLink.nativeElement.style.opacity = '0.5';
      }
      // Keep console error; avoid user alert for each 404 in normal UX
    }
  }

  // Mark day as complete
  // Mark day as complete
  async markDayComplete(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      console.log('Marking day as complete:', {
        email: this.userEmail,
        classNumber: this.selectedClass,
        dayNumber: this.selectedDay,
      });

      const progressPayload: ProgressPayload = {
        email: this.userEmail,
        classNumber: this.selectedClass,
        dayNumber: this.selectedDay,
      };

      // Update progress on the server
      await firstValueFrom(this.dataService.updateProgress(progressPayload));

      // Initialize progress array if it doesn't exist
      if (!this.progress[this.selectedClass]) {
        this.progress[this.selectedClass] = [];
      }

      // Add the completed day to the local progress array if not already there
      if (!this.progress[this.selectedClass].includes(this.selectedDay)) {
        this.progress[this.selectedClass].push(this.selectedDay);
        // Sort the array to maintain order
        this.progress[this.selectedClass].sort((a: number, b: number) => a - b);
      }

      // Update the UI immediately
      this.updateDays();

      // Show feedback to user
      alert('Day marked as completed!');

      // Move to next day if available
      if (this.selectedDay < 50) {
        this.selectedDay += 1;
        this.loadDay(this.selectedDay);
      }

      // Refresh progress from server to ensure consistency
      await this.fetchProgress();

      // Update progress summary
      await this.fetchProgressSummary();
    } catch (error: any) {
      console.error('Error saving progress:', error);
      alert('Failed to mark day as completed: ' + error.message);
    }
  }

  // Select class
  async selectClass(classNumber: number): Promise<void> {
    if (!this.isBrowser) return;

    // Remove selected class from all items
    const classItems = document.querySelectorAll('.class-item');
    classItems.forEach((item) => item.classList.remove('selected'));

    // Add selected class to clicked item
    const selectedItem = document.querySelector(`.class-item[data-class="${classNumber}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }

    this.selectedClass = classNumber;
    this.selectedDay = 1;
    this.currentRangeStart = 1;
    await this.fetchProgress();
    this.loadDay(1);
    await this.fetchProgressSummary();

    // Close mobile menu after selection
    if (window.innerWidth <= 768 && this.sidebar) {
      this.sidebar.nativeElement.classList.remove('active');
    }
  }

  // Handle language change
  onLanguageChange(): void {
    if (this.isBrowser) {
      this.loadDay(this.selectedDay);
    }
  }

  // Setup fullscreen handling
  setupFullscreenHandling(): void {
    if (!this.isBrowser) return;

    const handleFullscreenChange = () => {
      const videoContainer = document.querySelector('.video-container');
      if (document.fullscreenElement) {
        videoContainer?.classList.add('fullscreen');
      } else {
        videoContainer?.classList.remove('fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  }
}