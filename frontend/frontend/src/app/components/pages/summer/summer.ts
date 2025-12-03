import { Component, OnInit, ViewChild, ElementRef, ViewEncapsulation, Renderer2, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DayData {
  day: number;
  topic: string;
  resource?: string;
  project?: string;
  youtube?: string;
}

@Component({
  selector: 'app-summer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summer.html',
  styleUrls: ['./summer.css'],
  encapsulation: ViewEncapsulation.None
})
export class SummerComponent implements OnInit {
  userEmail: string = '';
  category = 'summer';
  jobId = 'summer2025';
  apiBaseUrl = 'http://localhost:3000';
  language = 'english';

  programDays: DayData[] = [];
  progress: number[] = [];
  interested: number[] = [];
  goal: string = '';
  searchQuery: string = '';
  expandedDays: Set<number> = new Set<number>();
  currentTheme: string = '';
  themeToggleText: string = '';
  ariaLabel: string = '';
  toastMessage: string = '';
  toastIsError: boolean = false;
  showToastFlag: boolean = false;
  isLoading: boolean = false;
  showError: boolean = false;
  isBrowser: boolean = false;
  dataLoaded: boolean = false; // Add this flag to track when data is loaded

  @ViewChild('toast') toast!: ElementRef;

  constructor(
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.userEmail = localStorage.getItem('userEmail') || (window.location.href = '/login', '');
      this.currentTheme = localStorage.getItem('theme') || 'daylight';
      this.setTheme(this.currentTheme);
      this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          const focused = document.activeElement as HTMLElement;
          if (focused?.classList.contains('task-header') && !focused.querySelector('button')?.contains(event.target as Node)) {
            focused.click();
          }
        }
      });
      this.fetchProgramDays().then(() => this.fetchProgress());
    }
  }

  get filteredProgramDays(): DayData[] {
    // Only filter if data is loaded
    if (!this.dataLoaded) return [];
    return this.programDays.filter(({ topic }) => topic.toLowerCase().includes(this.searchQuery.toLowerCase()));
  }

  get sortedInterested(): number[] {
    return [...this.interested].sort((a, b) => a - b);
  }

  getTopic(day: number): string {
    return this.programDays[day - 1]?.topic || `Day ${day} Content`;
  }

  isCompleted(day: number): boolean {
    return this.progress.includes(day);
  }

  isInterested(day: number): boolean {
    return this.interested.includes(day);
  }

  isExpanded(day: number): boolean {
    return this.expandedDays.has(day);
  }

  toggleDetails(day: number, event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).closest('button')) {
      return;
    }
    if (this.expandedDays.has(day)) {
      this.expandedDays.delete(day);
    } else {
      this.expandedDays.add(day);
    }
    // Trigger change detection
    this.cdr.detectChanges();
  }

  async fetchProgramDays(): Promise<void> {
    this.isLoading = true;
    this.showError = false;
    try {
      this.programDays = [];
      for (let day = 1; day <= 25; day++) {
        const res = await fetch(`${this.apiBaseUrl}/api/summer/content/summer/${day}`);
        if (!res.ok && res.status === 404) continue;
        const content = await res.json();
        const videoRes = await fetch(`${this.apiBaseUrl}/api/summer/video/summer/${day}/english`);
        const video = await videoRes.json();
        this.programDays.push({
          day,
          topic: content.topic || `Day ${day} Content`,
          resource: content.resource_link || '',
          project: content.project_link || '',
          youtube: video.youtube_id ? `https://www.youtube.com/embed/${video.youtube_id}` : ''
        });
      }
      this.dataLoaded = true; // Set flag to indicate data is loaded
      this.renderTasks();
      // Explicitly trigger change detection
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error fetching program days:', err);
      this.showError = true;
      this.showToast('Failed to load tasks.', true);
    } finally {
      this.isLoading = false;
      // Trigger change detection again to ensure loading state is updated
      this.cdr.detectChanges();
    }
  }

  async fetchProgress(): Promise<void> {
    this.isLoading = true;
    this.showError = false;
    try {
      const response = await fetch(`${this.apiBaseUrl}/summer-progress/${encodeURIComponent(this.userEmail)}/${this.category}/${this.jobId}`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      this.progress = Array.isArray(data) ? data : [];
      this.interested = JSON.parse(localStorage.getItem(`summer_interested_${this.category}_${this.jobId}`) || '[]');
      this.goal = localStorage.getItem(`summer_goal_${this.category}_${this.jobId}`) || '';
      this.renderTasks();
      this.updateProgress();
      this.updateInterested();
      this.updateGoalDisplay();
      // Trigger change detection
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error fetching progress:', err);
      this.showError = true;
      this.showToast('Failed to load progress.', true);
    } finally {
      this.isLoading = false;
      // Trigger change detection again to ensure loading state is updated
      this.cdr.detectChanges();
    }
  }

  renderTasks(): void {
    // In Angular, rendering is handled by the template, no need for manual innerHTML
    // But we need to trigger change detection to ensure the view updates
    this.cdr.detectChanges();
  }

  async saveProgress(day: number): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/summer-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.userEmail, category: this.category, jobId: this.jobId, dayNumber: day })
      });
      if (!response.ok) throw new Error('Failed to save progress');
      const data = await response.json();
      this.progress = Array.isArray(data.completedDays) ? data.completedDays : this.progress;
      this.renderTasks();
      this.updateProgress();
      this.showToast(`Day ${day} ${this.progress.includes(day) ? 'marked as complete' : 'unmarked'}!`);
    } catch (err) {
      console.error('Error saving progress:', err);
      this.showToast('Failed to save progress.', true);
    }
  }

  saveInterested(day: number): void {
    try {
      const index = this.interested.indexOf(day);
      if (index === -1) {
        this.interested.push(day);
      } else {
        this.interested.splice(index, 1);
      }
      localStorage.setItem(`summer_interested_${this.category}_${this.jobId}`, JSON.stringify(this.interested));
      this.renderTasks();
      this.updateInterested();
      this.showToast(`Day ${day} ${this.interested.includes(day) ? 'marked as interested' : 'unmarked'}!`);
    } catch (err) {
      console.error('Error saving interested:', err);
      this.showToast('Failed to save interested.', true);
    }
  }

  saveGoalHandler(): void {
    const trimmedGoal = this.goal.trim();
    if (trimmedGoal) {
      this.goal = trimmedGoal;
      localStorage.setItem(`summer_goal_${this.category}_${this.jobId}`, this.goal);
      this.updateGoalDisplay();
      this.showToast('Goal saved successfully!');
    } else {
      this.showToast('Please enter a goal.', true);
    }
  }

  loadDay(nextDay: number): void {
    // Placeholder for loadDay functionality if needed
    // Implement based on existing logic, e.g., expand or navigate
    this.toggleDetails(nextDay);
  }

  setLoading(show: boolean): void {
    this.isLoading = show;
    // Trigger change detection to update loading state
    this.cdr.detectChanges();
  }

  updateProgress(): void {
    // Template handles display via bindings
    // Trigger change detection to ensure view updates
    this.cdr.detectChanges();
  }

  updateInterested(): void {
    // Template handles via *ngFor
    // Trigger change detection to ensure view updates
    this.cdr.detectChanges();
  }

  updateGoalDisplay(): void {
    // Template handles via {{goal ? ...}}
    // Trigger change detection to ensure view updates
    this.cdr.detectChanges();
  }

  setTheme(theme: string): void {
    document.body.dataset['theme'] = theme;
    this.themeToggleText = theme === 'night' ? '☀️ Daylight Mode' : '🌙 Night Mode';
    this.ariaLabel = `Switch to ${theme === 'night' ? 'daylight' : 'night'} mode`;
    localStorage.setItem('theme', theme);
    // Trigger change detection to ensure theme updates
    this.cdr.detectChanges();
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'daylight' ? 'night' : 'daylight';
    this.setTheme(this.currentTheme);
  }

  showToast(message: string, isError: boolean = false): void {
    this.toastMessage = message;
    this.toastIsError = isError;
    this.showToastFlag = true;
    // Trigger change detection to show toast
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showToastFlag = false;
      // Trigger change detection to hide toast
      this.cdr.detectChanges();
    }, 3000);
  }
}