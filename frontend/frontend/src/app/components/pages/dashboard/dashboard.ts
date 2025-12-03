import { Component, OnInit, ElementRef, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';
import { Section, Class, Day, Category, Job, Skill, LearningPathDay } from '../../../models/models';

declare var XLSX: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Core state - exactly as in original JS
  sections: Section[] = [];
  classes: Class[] = [];
  days: Day[] = [];

  currentSectionId: number | null = null;
  currentClassId: number | null = null;
  currentDayId: string | null = null;

  // Career management state - exactly as in original JS
  sectionId: number = 0;
  categories: Category[] = [];
  jobs: Job[] = [];
  skills: Skill[] = [];
  learningPathDays: LearningPathDay[] = [];

  currentSelectedCategoryId: number | null = null;
  currentSelectedJobId: number | null = null;
  currentSelectedSkillId: number | null = null;
  // FIXED: Changed currentSelectedDayId from string to number to match LearningPathDay.id type
  currentSelectedDayId: number | null = null;

  // UI state properties - exactly as in original JS
  showClassSelection: boolean = false;
  showDaySelection: boolean = false;
  showContentForm: boolean = false;

  // Form fields - exactly as in original JS
  topic: string = '';
  quizLink: string = '';
  projectLink: string = '';
  resourceLink: string = '';
  englishYoutube: string = '';
  teluguYoutube: string = '';

  newCategoryName: string = '';
  newJobId: string = '';
  newJobTitle: string = '';
  newJobDays: number = 80;
  newJobRole: string = '';
  newJobIndustries: string = '';
  newJobDesc: string = '';
  newSkillName: string = '';

  dayTitle: string = '';
  materialLink: string = '';

  // FIXED: Changed editDayId from string to number to match LearningPathDay.id type
  editDayId: number = 0;
  editDayTitle: string = '';
  editMaterialLink: string = '';
  editExerciseLink: string = '';
  editProjectLink: string = '';
  showEditModal: boolean = false;

  showCareerManagement: boolean = false;

  private apiBase = 'http://localhost:3000/api/admin';
  private apiBaseNoAdmin = 'http://localhost:3000/api';
  private isDestroyed: boolean = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    this.isDestroyed = false;
    // Use service with subscribe (no await needed)
    this.apiService.getSections().subscribe({
      next: (sections) => {
        if (!this.checkIfDestroyed()) {
          // FIXED: Sort sections in the desired order
          this.sections = this.sortSections(sections);
          console.log('[DEBUG] All sections loaded:', sections);
          const class1_5Section = sections.find(s => s.name.toLowerCase().replace(/\s+/g, '') === 'class1-5');
          const defaultSection = class1_5Section || sections[0];
          this.currentSectionId = defaultSection.id;
          setTimeout(() => {
            if (!this.checkIfDestroyed()) {
              this.loadClasses(defaultSection.id);
            }
          }, 0);
        }
      },
      error: (err) => {
        console.error('Error loading sections:', err);
        this.showError(`Failed to load sections: ${err.message}`);
      }
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
  }

  // Helper methods to check if component is destroyed before making HTTP requests
  private checkIfDestroyed(): boolean {
    if (this.isDestroyed) {
      console.warn('Component is destroyed, skipping HTTP request');
      return true;
    }
    return false;
  }

  // Helper methods for showing messages
  private showSuccess(message: string): void {
    if (!this.checkIfDestroyed()) {
      alert(message);
    }
  }

  private showError(message: string): void {
    if (!this.checkIfDestroyed()) {
      alert(message);
    }
  }

  // FIXED: Add method to sort sections in the desired order
  private sortSections(sections: Section[]): Section[] {
    // Define the desired order
    const desiredOrder = ['class1-5', 'class6-10', 'class11-12', 'grad', 'life-beyond-academics', 'summer special'];

    // Create a map of section names to their positions in the desired order
    const orderMap: { [key: string]: number } = {};
    desiredOrder.forEach((name, index) => {
      orderMap[name] = index;
    });

    // Sort the sections based on the desired order
    return sections.sort((a, b) => {
      const aName = a.name.toLowerCase().replace(/\s+/g, '');
      const bName = b.name.toLowerCase().replace(/\s+/g, '');

      // If both sections are in the desired order, sort by their positions
      if (orderMap[aName] !== undefined && orderMap[bName] !== undefined) {
        return orderMap[aName] - orderMap[bName];
      }

      // If only one section is in the desired order, prioritize it
      if (orderMap[aName] !== undefined) return -1;
      if (orderMap[bName] !== undefined) return 1;

      // If neither section is in the desired order, sort alphabetically
      return aName.localeCompare(bName);
    });
  }

  // FIXED: Add method to sort classes in ascending order
  private sortClasses(classes: Class[]): Class[] {
    return classes.sort((a, b) => {
      // Extract the numeric part from the class name (e.g., "Class 6" -> 6)
      const aNum = parseInt(a.name.replace(/[^0-9]/g, ''), 10);
      const bNum = parseInt(b.name.replace(/[^0-9]/g, ''), 10);

      // Sort by the numeric part
      return aNum - bNum;
    });
  }

  get currentSectionName(): string {
    const section = this.sections.find(s => s.id === this.currentSectionId);
    return section?.name.toLowerCase() || '';
  }

  // FIXED: Changed parameter type to accept both number and string, and convert to number
  onSectionChange(sectionId: number | string): void {
    console.log(`[DEBUG] onSectionChange fired with ID: ${sectionId} (type: ${typeof sectionId})`);
    if (this.checkIfDestroyed()) return;

    // Convert string ID to number if needed
    const id = typeof sectionId === 'string' ? parseInt(sectionId, 10) : sectionId;

    if (id && id !== this.currentSectionId) {
      console.log(`[DEBUG] User switched section ID: ${id}`);
      this.currentSectionId = id;
      this.cdr.detectChanges();
      Promise.resolve().then(() => {
        if (!this.checkIfDestroyed()) {
          this.loadClasses(id);
        }
      });
    }
  }

  async loadClasses(sectionId: number): Promise<void> {
    if (this.checkIfDestroyed()) return;
    this.currentSectionId = sectionId;
    this.sectionId = sectionId;
    const section = this.sections.find(s => s.id === sectionId);
    const sectionName = section?.name.toLowerCase() || '';
    const normalizedSectionName = sectionName.replace(/\s+/g, '');
    console.log(`[DEBUG] loadClasses called for: ${sectionName} (norm: ${normalizedSectionName}), ID: ${sectionId}`);

    // Reset all UI flags first
    this.showClassSelection = false;
    this.showDaySelection = false;
    this.showContentForm = false;
    this.showCareerManagement = false;
    this.cdr.detectChanges();

    if (!this.checkIfDestroyed()) {
      if (normalizedSectionName === 'class11-12') {
        console.log('[DEBUG] Triggering career management');
        this.showCareerManagement = true;
        this.cdr.detectChanges();
        this.loadCareerManagement();
      } else if (sectionName === 'summer special') {
        console.log('[DEBUG] Triggering summer special');
        this.showDaySelection = true;
        this.showContentForm = true;
        this.cdr.detectChanges();
        this.loadDays(null, sectionName);
      } else {
        console.log('[DEBUG] Triggering generic class load');
        this.showClassSelection = true;
        this.showDaySelection = true;
        this.showContentForm = true;
        this.cdr.detectChanges();
        // UPDATED: Use ApiService instead of direct http
        this.apiService.getClasses(sectionId.toString()).subscribe({
          next: (classes) => {
            console.log('[DEBUG] Classes loaded for', sectionId, ':', classes.length, classes);
            if (!this.checkIfDestroyed()) {
              // FIXED: Sort classes in ascending order
              this.classes = this.sortClasses(classes);
              this.cdr.detectChanges();
              if (classes.length > 0) {
                this.currentClassId = classes[0].id;
                this.cdr.detectChanges();
                this.loadDays(classes[0].id, sectionName);
              } else {
                console.log('[DEBUG] No classes—showing empty UI');
                this.showError('No classes found for this section. Add classes in the backend/DB first.');
              }
            }
          },
          error: (err) => {
            console.error('Error loading classes:', err);
            this.showError('Failed to load classes');
          }
        });
      }
    }
  }

  async loadDays(classId: number | null, sectionName: string): Promise<void> {
    if (this.checkIfDestroyed()) return;

    this.currentClassId = classId;
    this.cdr.detectChanges();

    try {
      if (sectionName === 'summer special') {
        const res = await fetch(`${this.apiBase}/summer/content/summer`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const days = await res.json();
        this.days = Array.isArray(days) ? days : [];
        this.cdr.detectChanges();
        if (this.days.length > 0) {
          this.currentDayId = (this.days[0] as any).day_number.toString();
          this.cdr.detectChanges();
          this.loadContent(this.currentDayId, sectionName);
        }
      } else if (classId) {
        const res = await fetch(`${this.apiBase}/days/${classId}`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const days = await res.json();
        this.days = days;
        this.cdr.detectChanges();
        if (days.length > 0) {
          this.currentDayId = days[0].id;
          this.cdr.detectChanges();
          this.loadContent(days[0].id, sectionName);
        }
      }
    } catch (err) {
      console.error('Error loading days:', err);
      this.showError('Failed to load days.');
    }
  }

  async loadContent(dayId: string, sectionName: string): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      let res, content, videos;
      if (sectionName === 'summer special') {
        res = await fetch(`${this.apiBase}/summer/content/${dayId}`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        content = data.day || {};
        videos = data.videos || [];
      } else {
        res = await fetch(`${this.apiBase}/content/${dayId}`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        content = data.day || {};
        videos = data.videos || [];
      }
      const eng = videos.find((v: any) => v.language === 'english') || { youtube_id: '' };
      const tel = videos.find((v: any) => v.language === 'telugu') || { youtube_id: '' };

      this.topic = content.topic || '';
      this.resourceLink = content.resource_link || '';
      this.projectLink = content.project_link || '';
      this.englishYoutube = eng.youtube_id || '';
      this.teluguYoutube = tel.youtube_id || '';
      this.cdr.detectChanges();

      if (sectionName !== 'summer special') {
        this.quizLink = content.quiz_link || '';
      }
    } catch (err) {
      console.error('Error loading content:', err);
      this.showError('Failed to load content.');
    }
  }

  async saveDay(sectionName: string): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const dayId = this.currentDayId;
    if (!dayId) {
      this.showError('Please select a day.');
      return;
    }

    try {
      if (sectionName === 'summer special') {
        const res = await fetch(`${this.apiBase}/summer/content/${dayId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'summer',
            topic: this.topic,
            resource_link: this.resourceLink,
            project_link: this.projectLink
          })
        });
        if (!res.ok) throw new Error('Failed to save summer content.');

        if (this.englishYoutube) {
          await fetch(`${this.apiBase}/summer/video/${dayId}/english`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtube_link: this.englishYoutube })
          });
        }
        this.showSuccess('Day details saved!');
      } else {
        const res = await fetch(`${this.apiBase}/day/${dayId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: this.topic, quiz_link: this.quizLink, project_link: this.projectLink })
        });
        if (!res.ok) throw new Error('Failed to save day details.');

        if (this.englishYoutube) {
          await fetch(`${this.apiBase}/video/${dayId}/english`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtube_link: this.englishYoutube })
          });
        }
        if (this.teluguYoutube) {
          await fetch(`${this.apiBase}/video/${dayId}/telugu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtube_link: this.teluguYoutube })
          });
        }
        this.showSuccess('Day details saved!');
      }
    } catch (err) {
      console.error('Error saving content:', err);
      this.showError('Failed to save content.');
    }
  }

  async addDay(): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const section = this.sections.find(s => s.id === this.currentSectionId);
    const sectionName = section?.name.toLowerCase() || '';

    try {
      if (sectionName === 'summer special') {
        const res = await fetch(`${this.apiBase}/summer/content/summer`);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const days = await res.json();
        const existingDayNumbers = Array.isArray(days) ? days.map((d: any) => d.day_number) : [];
        let nextDay = 1;
        while (existingDayNumbers.includes(nextDay) && nextDay <= 25) {
          nextDay++;
        }
        if (nextDay > 25) {
          this.showError('Maximum 25 days reached for Summer Special.');
          return;
        }
        const addRes = await fetch(`${this.apiBase}/summer/day`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: 'summer', day_number: nextDay })
        });
        if (!addRes.ok) {
          const errorData = await addRes.json();
          throw new Error(errorData.error || 'Failed to add summer day.');
        }
        const { day_number } = await addRes.json();
        this.showSuccess(`Day ${day_number} added successfully!`);
        this.loadDays(null, sectionName);
      } else if (this.currentClassId) {
        const dayItems = this.days;
        let maxDay = 0;
        dayItems.forEach(item => {
          const dayNum = item.day_number;
          if (dayNum > maxDay) maxDay = dayNum;
        });
        const dayNumber = maxDay + 1;
        const res = await fetch(`${this.apiBase}/day`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class_id: this.currentClassId, day_number: dayNumber })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to add day.');
        }
        const { day_number } = await res.json();
        this.showSuccess(`Day ${day_number} added!`);
        this.loadDays(this.currentClassId, sectionName);
      }
    } catch (err) {
      console.error('Error adding day:', err);
      this.showError(`Failed to add day: ${err.message}`);
    }
  }

  toggleCareerManagement(): void {
    if (this.checkIfDestroyed()) return;

    this.showCareerManagement = !this.showCareerManagement;
    this.cdr.detectChanges();
    if (this.showCareerManagement) {
      this.loadCareerManagement();
    }
  }

  async loadCareerManagement(): Promise<void> {
    if (this.checkIfDestroyed()) return;
    console.log(`[DEBUG] loadCareerManagement called, sectionId: ${this.sectionId}`);
    try {
      let sectionId = this.sectionId;
      if (!sectionId) {
        console.log('[DEBUG] Fallback: Fetching class11-12 by name');
        // UPDATED: Use subscribe instead of toPromise for consistency
        this.apiService.getSectionByName('class11-12').subscribe({
          next: (section) => {
            sectionId = section.id;
            this.sectionId = sectionId;
            this.loadCategoriesForSection(sectionId);
          },
          error: (err) => {
            console.error('Error fetching section by name:', err);
            this.showError('Failed to load career data.');
          }
        });
        return; // Exit early since subscribe is async
      } else {
        this.sectionId = sectionId;
        this.loadCategoriesForSection(sectionId);
      }
    } catch (err) {
      console.error('Error in loadCareerManagement:', err);
      this.showError('Failed to load career data.');
    }
  }

  private loadCategoriesForSection(sectionId: number): void {
    this.apiService.getCategories(sectionId.toString()).subscribe({
      next: (categories) => {
        console.log('[DEBUG] Categories loaded:', categories.length, categories);
        if (!this.checkIfDestroyed()) {
          this.categories = categories;
          this.cdr.detectChanges();
          if (categories.length > 0) {
            this.currentSelectedCategoryId = categories[0].id;
            this.cdr.detectChanges();
            this.loadJobsForCategory(categories[0].id);
          } else {
            this.showError('No categories found for Class 11-12. Add categories in the backend/DB first.');
          }
        }
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.showError('Failed to load career data.');
      }
    });
  }

  async loadJobsForCategory(categoryId: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      const res = await fetch(`/api/jobs/${categoryId}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const jobs = await res.json();
      this.jobs = jobs;
      this.cdr.detectChanges();

      if (jobs.length > 0) {
        this.currentSelectedJobId = jobs[0].id;
        this.cdr.detectChanges();
        this.loadSkillsForJob(jobs[0].id);
      } else {
        this.skills = [];
        this.learningPathDays = [];
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
      this.showError('Failed to load jobs.');
    }
  }

  async loadSkillsForJob(jobId: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      const res = await fetch(`/api/skills/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch skills');
      const skills = await res.json();
      this.skills = skills;
      this.cdr.detectChanges();

      if (skills.length > 0) {
        this.currentSelectedSkillId = skills[0].id;
        this.cdr.detectChanges();
        this.loadDaysForSkill(skills[0].id);
      } else {
        this.learningPathDays = [];
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Error loading skills:', err);
      this.showError('Failed to load skills.');
    }
  }

  // FIXED: Changed dayIdToSelect parameter from string to number
  async loadDaysForSkill(skillId: number, dayIdToSelect: number | null = null): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      const res = await fetch(`/api/learning_path/days/${skillId}`);
      if (!res.ok) throw new Error('Failed to fetch days');
      const days = await res.json();
      this.learningPathDays = days;
      this.cdr.detectChanges();

      if (dayIdToSelect) {
        this.currentSelectedDayId = dayIdToSelect;
        this.cdr.detectChanges();
        this.loadDayContent(dayIdToSelect);
      } else if (days.length > 0) {
        this.currentSelectedDayId = days[0].id;
        this.cdr.detectChanges();
        this.loadDayContent(days[0].id);
      }
    } catch (err) {
      console.error('Error loading days:', err);
      this.showError('Failed to load days.');
    }
  }

  // FIXED: Changed dayId parameter from string to number
  async loadDayContent(dayId: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      const res = await fetch(`/api/learning_path/day/${dayId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch day content');
      }
      const dayData = await res.json();
      this.cdr.detectChanges();

      const videoRes = await fetch(`/api/learning_path/video/day/${dayId}`);
      if (!videoRes.ok) {
        const errorData = await videoRes.json();
        throw new Error(errorData.error || 'Failed to fetch videos');
      }
      const videos = await videoRes.json();
      this.cdr.detectChanges();

      const engVideo = videos.find(v => v.language === 'english') || { youtube_id: '' };
      const telVideo = videos.find(v => v.language === 'telugu') || { youtube_id: '' };

      this.dayTitle = dayData.topic || '';
      this.materialLink = dayData.material_link || '';
      this.quizLink = dayData.exercise_link || '';
      this.projectLink = dayData.project_link || '';
      this.englishYoutube = engVideo.youtube_id ? `https://www.youtube.com/embed/${engVideo.youtube_id}` : '';
      this.teluguYoutube = telVideo.youtube_id ? `https://www.youtube.com/embed/${telVideo.youtube_id}` : '';
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error loading day content:', err);
      this.showError(`Failed to load day content: ${err.message}`);
    }
  }

  async saveDayContent(): Promise<void> {
    if (this.checkIfDestroyed()) return;
    if (!this.currentSelectedDayId) return this.showError('Please select a day.');

    const topic = this.dayTitle.trim();
    const materialLink = this.materialLink.trim();
    const quizLink = this.quizLink.trim();
    const projectLink = this.projectLink.trim();
    const englishYoutube = this.englishYoutube.trim();
    const teluguYoutube = this.teluguYoutube.trim();

    // Validate topic
    if (!topic) {
      this.showError('Day title is required.');
      return;
    }

    try {
      // Build payload for day content, only include non-empty fields
      const dayPayload: any = { topic };
      if (materialLink) dayPayload.material_link = materialLink;
      if (quizLink) dayPayload.exercise_link = quizLink;
      if (projectLink) dayPayload.project_link = projectLink;

      // Save day content
      const dayRes = await fetch(`/api/admin/learning_path/day/${this.currentSelectedDayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayPayload)
      });
      const dayData = await dayRes.json();
      if (!dayRes.ok) {
        console.error('Failed to save day content:', dayData.error);
        throw new Error(dayData.error || 'Failed to save day details.');
      }

      // Save English video
      if (englishYoutube) {
        const engRes = await fetch(`/api/admin/learning_path/video/${this.currentSelectedDayId}/english`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtube_link: englishYoutube })
        });
        const engData = await engRes.json();
        if (!engRes.ok) {
          console.error('Failed to save English video:', engData.error);
          throw new Error(engData.error || 'Failed to save English video.');
        }
      }

      // Save Telugu video
      if (teluguYoutube) {
        const telRes = await fetch(`/api/admin/learning_path/video/${this.currentSelectedDayId}/telugu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtube_link: teluguYoutube })
        });
        const telData = await telRes.json();
        if (!telRes.ok) {
          console.error('Failed to save Telugu video:', telData.error);
          throw new Error(telData.error || 'Failed to save Telugu video.');
        }
      }

      this.showSuccess('Day details saved successfully!');
      this.cdr.detectChanges();
      // Reload day list and content to reflect updated title and links
      if (this.currentSelectedSkillId) {
        await this.loadDaysForSkill(this.currentSelectedSkillId, this.currentSelectedDayId);
      }
      setTimeout(() => {
        if (!this.checkIfDestroyed()) {
          this.loadDayContent(this.currentSelectedDayId!);
        }
      }, 100);
    } catch (err) {
      console.error('Error saving day details:', err.message);
      this.showError(`Failed to save day details: ${err.message}`);
    }
  }

  async downloadClassData(): Promise<void> {
    if (this.checkIfDestroyed()) return;
    if (!this.currentClassId) {
      this.showError('Please select a class first.');
      return;
    }

    try {
      // Get class name
      const classSelect = this.classes;
      const selectedClass = classSelect.find(c => c.id === this.currentClassId);
      const className = selectedClass ? selectedClass.name : 'Unknown Class';

      // Fetch days for the class
      const daysRes = await fetch(`${this.apiBase}/days/${this.currentClassId}`);
      if (!daysRes.ok) throw new Error(`HTTP error! Status: ${daysRes.status}`);
      const days = await daysRes.json();

      // Prepare data for Excel
      const excelData = [];
      excelData.push(['Day Number', 'Topic', 'Quiz Link', 'Project Link', 'English YouTube', 'Telugu YouTube']);

      for (const day of days) {
        // Fetch content for each day
        const contentRes = await fetch(`${this.apiBase}/content/${day.id}`);
        if (!contentRes.ok) continue;
        const contentData = await contentRes.json();
        const content = contentData.day || {};

        // Fetch videos for each day
        const videosRes = await fetch(`${this.apiBase}/videos/${day.id}`);
        let videos = [];
        if (videosRes.ok) {
          videos = await videosRes.json();
        }
        const engVideo = videos.find(v => v.language === 'english') || { youtube_id: '' };
        const telVideo = videos.find(v => v.language === 'telugu') || { youtube_id: '' };

        excelData.push([
          day.day_number,
          content.topic || '',
          content.quiz_link || '',
          content.project_link || '',
          engVideo.youtube_id || '',
          telVideo.youtube_id || ''
        ]);
      }

      // Create Excel file
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, className);

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `${className}_${today}.xlsx`;

      // Download the file
      XLSX.writeFile(wb, filename);
      this.showSuccess(`Class data downloaded successfully as ${filename}`);

    } catch (err) {
      console.error('Error downloading class data:', err);
      this.showError('Failed to download class data. Please try again.');
    }
  }

  async importClassData(event: any): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const file = event.target.files[0];
    if (!file) return;

    if (!this.currentClassId) {
      this.showError('Please select a class first.');
      event.target.value = '';
      return;
    }

    try {
      const data = await this.readExcelFile(file);

      if (data.length < 2) {
        this.showError('Excel file is empty or invalid.');
        event.target.value = '';
        return;
      }

      // Skip header row and process data
      const rows = data.slice(1);
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row[0]) continue; // Skip empty rows

        try {
          const dayNumber = parseInt(row[0]);
          const topic = row[1] || '';
          const quizLink = row[2] || '';
          const projectLink = row[3] || '';
          const englishYoutube = row[4] || '';
          const teluguYoutube = row[5] || '';

          // Check if day exists
          let dayId;
          const existingDaysRes = await fetch(`${this.apiBase}/days/${this.currentClassId}`);
          if (existingDaysRes.ok) {
            const existingDays = await existingDaysRes.json();
            const existingDay = existingDays.find(d => d.day_number === dayNumber);

            if (existingDay) {
              dayId = existingDay.id;
            } else {
              // Create new day
              const createDayRes = await fetch(`${this.apiBase}/day`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  class_id: this.currentClassId,
                  day_number: dayNumber
                })
              });
              if (createDayRes.ok) {
                const newDay = await createDayRes.json();
                dayId = newDay.id;
              } else {
                throw new Error('Failed to create day');
              }
            }
          }

          if (dayId) {
            // Update day content
            if (topic || quizLink || projectLink) {
              await fetch(`${this.apiBase}/day/${dayId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic,
                  quiz_link: quizLink,
                  project_link: projectLink
                })
              });
            }

            // Update English video
            if (englishYoutube) {
              await fetch(`${this.apiBase}/video/${dayId}/english`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ youtube_link: englishYoutube })
              });
            }

            // Update Telugu video
            if (teluguYoutube) {
              await fetch(`${this.apiBase}/video/${dayId}/telugu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ youtube_link: teluguYoutube })
              });
            }

            successCount++;
          }
        } catch (err) {
          console.error(`Error processing row ${i + 2}:`, err);
          errorCount++;
        }
      }

      this.showSuccess(`Import completed!\nSuccess: ${successCount} days\nErrors: ${errorCount} days`);

      // Refresh the data
      const section = this.sections.find(s => s.id === this.currentSectionId);
      const sectionName = section?.name.toLowerCase();
      this.cdr.detectChanges();
      if (!this.checkIfDestroyed()) {
        this.loadDays(this.currentClassId, sectionName!);
      }
    } catch (err) {
      console.error('Error importing class data:', err);
      this.showError('Failed to import class data. Please check the file format and try again.');
    } finally {
      event.target.value = '';
    }
  }

  // dashboard.ts - Add section-level import/export methods

// Add these new methods to the DashboardComponent class

async downloadSectionData(): Promise<void> {
  if (this.checkIfDestroyed()) return;
  if (!this.currentSectionId) {
    this.showError('Please select a section first.');
    return;
  }

  try {
    // Get section name
    const section = this.sections.find(s => s.id === this.currentSectionId);
    const sectionName = section ? section.name : 'Unknown Section';

    // Fetch all classes for the section
    const classesRes = await fetch(`${this.apiBase}/classes/${this.currentSectionId}`);
    if (!classesRes.ok) throw new Error(`HTTP error! Status: ${classesRes.status}`);
    const classes = await classesRes.json();

    // Prepare data for Excel
    const excelData = [];
    excelData.push(['Class', 'Day Number', 'Topic', 'Quiz Link', 'Project Link', 'English YouTube', 'Telugu YouTube']);

    for (const cls of classes) {
      // Fetch days for each class
      const daysRes = await fetch(`${this.apiBase}/days/${cls.id}`);
      if (!daysRes.ok) continue;
      const days = await daysRes.json();

      for (const day of days) {
        // Fetch content for each day
        const contentRes = await fetch(`${this.apiBase}/content/${day.id}`);
        if (!contentRes.ok) continue;
        const contentData = await contentRes.json();
        const content = contentData.day || {};

        // Fetch videos for each day
        const videosRes = await fetch(`${this.apiBase}/videos/${day.id}`);
        let videos = [];
        if (videosRes.ok) {
          videos = await videosRes.json();
        }
        const engVideo = videos.find(v => v.language === 'english') || { youtube_id: '' };
        const telVideo = videos.find(v => v.language === 'telugu') || { youtube_id: '' };

        excelData.push([
          cls.name,
          day.day_number,
          content.topic || '',
          content.quiz_link || '',
          content.project_link || '',
          engVideo.youtube_id || '',
          telVideo.youtube_id || ''
        ]);
      }
    }

    // Create Excel file
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sectionName);

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `${sectionName}_${today}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
    this.showSuccess(`Section data downloaded successfully as ${filename}`);

  } catch (err) {
    console.error('Error downloading section data:', err);
    this.showError('Failed to download section data. Please try again.');
  }
}

async importSectionData(event: any): Promise<void> {
  if (this.checkIfDestroyed()) return;

  const file = event.target.files[0];
  if (!file) return;

  if (!this.currentSectionId) {
    this.showError('Please select a section first.');
    event.target.value = '';
    return;
  }

  try {
    const data = await this.readExcelFile(file);

    if (data.length < 2) {
      this.showError('Excel file is empty or invalid.');
      event.target.value = '';
      return;
    }

    // Skip header row and process data
    const rows = data.slice(1);
    let successCount = 0;
    let errorCount = 0;

    // Fetch all classes for the section to map class names to IDs
    const classesRes = await fetch(`${this.apiBase}/classes/${this.currentSectionId}`);
    if (!classesRes.ok) throw new Error(`HTTP error! Status: ${classesRes.status}`);
    const classes = await classesRes.json();
    const classMap: { [key: string]: number } = {};
    classes.forEach(cls => {
      classMap[cls.name] = cls.id;
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // Skip empty rows

      try {
        const className = row[0];
        const dayNumber = parseInt(row[1]);
        const topic = row[2] || '';
        const quizLink = row[3] || '';
        const projectLink = row[4] || '';
        const englishYoutube = row[5] || '';
        const teluguYoutube = row[6] || '';

        // Find class ID
        let classId = classMap[className];
        if (!classId) {
          console.warn(`Class ${className} not found in section ${this.currentSectionId}`);
          errorCount++;
          continue;
        }

        // Check if day exists
        let dayId;
        const existingDaysRes = await fetch(`${this.apiBase}/days/${classId}`);
        if (existingDaysRes.ok) {
          const existingDays = await existingDaysRes.json();
          const existingDay = existingDays.find(d => d.day_number === dayNumber);

          if (existingDay) {
            dayId = existingDay.id;
          } else {
            // Create new day
            const createDayRes = await fetch(`${this.apiBase}/day`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                class_id: classId,
                day_number: dayNumber
              })
            });
            if (createDayRes.ok) {
              const newDay = await createDayRes.json();
              dayId = newDay.id;
            } else {
              throw new Error('Failed to create day');
            }
          }
        }

        if (dayId) {
          // Update day content
          if (topic || quizLink || projectLink) {
            await fetch(`${this.apiBase}/day/${dayId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic,
                quiz_link: quizLink,
                project_link: projectLink
              })
            });
          }

          // Update English video
          if (englishYoutube) {
            await fetch(`${this.apiBase}/video/${dayId}/english`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ youtube_link: englishYoutube })
            });
          }

          // Update Telugu video
          if (teluguYoutube) {
            await fetch(`${this.apiBase}/video/${dayId}/telugu`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ youtube_link: teluguYoutube })
            });
          }

          successCount++;
        }
      } catch (err) {
        console.error(`Error processing row ${i + 2}:`, err);
        errorCount++;
      }
    }

    this.showSuccess(`Import completed!\nSuccess: ${successCount} days\nErrors: ${errorCount} days`);

    // Refresh the data
    const section = this.sections.find(s => s.id === this.currentSectionId);
    const sectionName = section?.name.toLowerCase();
    this.cdr.detectChanges();
    if (!this.checkIfDestroyed()) {
      this.loadClasses(this.currentSectionId!);
    }
  } catch (err) {
    console.error('Error importing section data:', err);
    this.showError('Failed to import section data. Please check the file format and try again.');
  } finally {
    event.target.value = '';
  }
}

  readExcelFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async addCategory(): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const name = this.newCategoryName.trim();
    if (!name || !this.sectionId) return this.showError('Category name required');
    try {
      const res = await fetch('/api/admin/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, section_id: this.sectionId })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      this.showSuccess(`Category ${data.name} added!`);
      this.cdr.detectChanges();
      this.loadCareerManagement();
      this.newCategoryName = '';
    } catch (err) {
      this.showError(`Failed to add category: ${err.message}`);
    }
  }

  async editCategory(id: number, oldName: string): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const newName = prompt('Edit category name:', oldName);
    if (newName && newName !== oldName) {
      try {
        const res = await fetch(`/api/admin/category/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error(await res.text());
        this.cdr.detectChanges();
        this.loadCareerManagement();
        this.showSuccess('Category updated!');
      } catch (err) {
        this.showError(`Failed to update category: ${err.message}`);
      }
    }
  }

  async deleteCategory(id: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    if (confirm('Are you sure you want to delete this category?')) {
      try {
        const res = await fetch(`/api/admin/category/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error(await res.text());
        this.cdr.detectChanges();
        this.loadCareerManagement();
        this.showSuccess('Category deleted!');
      } catch (err) {
        this.showError(`Failed to delete category: ${err.message}`);
      }
    }
  }

  async addJob(): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const jobId = this.newJobId.trim();
    const title = this.newJobTitle.trim();
    const days = this.newJobDays;
    const role = this.newJobRole.trim();
    const industries = this.newJobIndustries.trim();
    const description = this.newJobDesc.trim();
    if (!jobId || !title || !days || !this.currentSelectedCategoryId) return this.showError('Required fields missing');
    try {
      const res = await fetch('/api/admin/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, category_id: this.currentSelectedCategoryId, title, role, industries, description, days })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      this.showSuccess(`Job ${data.job_id} added!`);
      this.cdr.detectChanges();
      this.loadJobsForCategory(this.currentSelectedCategoryId!);
      this.newJobId = '';
      this.newJobTitle = '';
      this.newJobDays = 80;
      this.newJobRole = '';
      this.newJobIndustries = '';
      this.newJobDesc = '';
    } catch (err) {
      this.showError(`Failed to add job: ${err.message}`);
    }
  }

  async editJob(id: number, job: Job): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const newJobId = prompt('Edit job ID:', job.job_id);
    const newTitle = prompt('Edit title:', job.title);
    const newDays = prompt('Edit days:', job.days.toString());
    const newRole = prompt('Edit role:', job.role);
    const newIndustries = prompt('Edit industries:', job.industries);
    const newDescription = prompt('Edit description:', job.description);
    try {
      const res = await fetch(`/api/admin/job/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: newJobId, title: newTitle, days: parseInt(newDays || '0'), role: newRole, industries: newIndustries, description: newDescription })
      });
      if (!res.ok) throw new Error(await res.text());
      this.cdr.detectChanges();
      this.loadJobsForCategory(this.currentSelectedCategoryId!);
      this.showSuccess('Job updated!');
    } catch (err) {
      this.showError(`Failed to update job: ${err.message}`);
    }
  }

  async deleteJob(id: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    if (confirm('Are you sure you want to delete this job?')) {
      try {
        const res = await fetch(`/api/admin/job/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error(await res.text());
        this.cdr.detectChanges();
        this.loadJobsForCategory(this.currentSelectedCategoryId!);
        this.showSuccess('Job deleted!');
      } catch (err) {
        this.showError(`Failed to delete job: ${err.message}`);
      }
    }
  }

  async addSkill(): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const name = this.newSkillName.trim();
    if (!name || !this.currentSelectedJobId) return this.showError('Skill name and job required');
    try {
      const res = await fetch('/api/admin/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: this.currentSelectedJobId, name })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      this.showSuccess(`Skill ${data.name} added!`);
      this.cdr.detectChanges();
      this.loadSkillsForJob(this.currentSelectedJobId!);
      this.newSkillName = '';
    } catch (err) {
      this.showError(`Failed to add skill: ${err.message}`);
    }
  }

  async editSkill(id: number, oldName: string): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const newName = prompt('Edit skill name:', oldName);
    if (newName && newName !== oldName) {
      try {
        const res = await fetch(`/api/admin/skill/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error(await res.text());
        this.cdr.detectChanges();
        this.loadSkillsForJob(this.currentSelectedJobId!);
        this.showSuccess('Skill updated!');
      } catch (err) {
        this.showError(`Failed to update skill: ${err.message}`);
      }
    }
  }

  async deleteSkill(id: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    if (confirm('Are you sure you want to delete this skill?')) {
      try {
        const res = await fetch(`/api/admin/skill/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error(await res.text());
        this.cdr.detectChanges();
        this.loadSkillsForJob(this.currentSelectedJobId!);
        this.showSuccess('Skill deleted!');
      } catch (err) {
        this.showError(`Failed to delete skill: ${err.message}`);
      }
    }
  }

  async initializeDaysForSkill(skillId: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      const res = await fetch(`/api/learning_path/days/${skillId}`);
      if (!res.ok) throw new Error('Failed to fetch days');
      const existingDays = await res.json();
      const maxDays = 80;
      const existingDayNumbers = existingDays.map(d => d.day_number);
      for (let i = 1; i <= maxDays; i++) {
        if (!existingDayNumbers.includes(i)) {
          let customTitle = prompt(`Enter title for Day ${i} (leave blank for default):`, `Day ${i}`);
          if (customTitle === null) continue; // Cancelled
          customTitle = customTitle.trim();
          await fetch('/api/admin/learning_path/day', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skill_id: skillId, day_number: i, topic: customTitle })
          });
        }
      }
      this.cdr.detectChanges();
      this.loadDaysForSkill(skillId);
    } catch (err) {
      console.error('Error initializing days:', err);
      this.showError('Failed to initialize days.');
    }
  }

  async addLearningPathDay(): Promise<void> {
    if (this.checkIfDestroyed()) return;

    if (!this.currentSelectedSkillId) {
      this.showError('Please select a skill.');
      return;
    }
    try {
      const res = await fetch(`/api/learning_path/days/${this.currentSelectedSkillId}`);
      if (!res.ok) throw new Error('Failed to fetch existing days');
      const existingDays = await res.json();
      const existingDayNumbers = existingDays.map(d => d.day_number);
      let dayNum = 1;
      while (existingDayNumbers.includes(dayNum)) {
        dayNum++;
      }
      let customTitle = prompt(`Enter title for Day ${dayNum} (leave blank for default):`, `Day ${dayNum}`);
      if (customTitle === null) return; // Cancelled
      customTitle = customTitle.trim();
      const addRes = await fetch('/api/admin/learning_path/day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: this.currentSelectedSkillId, day_number: dayNum, topic: customTitle })
      });
      if (!addRes.ok) {
        const errorData = await addRes.json();
        throw new Error(errorData.error || 'Failed to add day.');
      }
      const data = await addRes.json();
      this.showSuccess(`Day ${data.day_number} added!`);
      this.cdr.detectChanges();
      this.loadDaysForSkill(this.currentSelectedSkillId!);
    } catch (err) {
      console.error('Error adding day:', err);
      this.showError(`Failed to add day: ${err.message}`);
    }
  }

  // FIXED: Changed dayId parameter from string to number
  async openEditModal(dayId: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    try {
      const res = await fetch(`/api/learning_path/day/${dayId}`);
      if (!res.ok) throw new Error('Failed to fetch day');
      const day = await res.json();
      this.cdr.detectChanges();

      this.editDayId = dayId;
      this.editDayTitle = day.topic || '';
      this.editMaterialLink = day.material_link || '';
      this.editExerciseLink = day.exercise_link || '';
      this.editProjectLink = day.project_link || '';
      this.showEditModal = true;
    } catch (err) {
      console.error('Error opening edit modal:', err);
      this.showError('Failed to load day details for editing.');
    }
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editDayId = 0;
    this.editDayTitle = '';
    this.editMaterialLink = '';
    this.editExerciseLink = '';
    this.editProjectLink = '';
    this.cdr.detectChanges();
  }

  async editLearningDay(): Promise<void> {
    if (this.checkIfDestroyed()) return;

    const id = this.editDayId;
    const newTitle = this.editDayTitle.trim();
    const newMaterial = this.editMaterialLink.trim();
    const newExercise = this.editExerciseLink.trim();
    const newProject = this.editProjectLink.trim();
    if (!newTitle) {
      this.showError('Day title is required.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/learning_path/day/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newTitle, material_link: newMaterial, exercise_link: newExercise, project_link: newProject })
      });
      if (!res.ok) throw new Error(await res.text());
      console.log('Day updated successfully');
      this.cdr.detectChanges();
      this.loadDaysForSkill(this.currentSelectedSkillId!, id);
      this.closeEditModal();
      this.showSuccess('Day updated!');
    } catch (err) {
      console.error('Error updating day:', err);
      this.showError(`Failed to update day: ${err.message}`);
    }
  }

  // FIXED: Changed id parameter from string to number
  async deleteLearningDay(id: number): Promise<void> {
    if (this.checkIfDestroyed()) return;

    if (confirm('Are you sure you want to delete this day?')) {
      try {
        const res = await fetch(`/api/admin/learning_path/day/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error(await res.text());
        this.cdr.detectChanges();
        this.loadDaysForSkill(this.currentSelectedSkillId!);
        this.showSuccess('Day deleted!');
      } catch (err) {
        this.showError(`Failed to delete day: ${err.message}`);
      }
    }
  }
}