// src/app/components/class1-5/class1-5.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';

import { Class1_5Component } from './class1-5';
import { SafePipe } from '../../../pipes/safe.pipe';
import { DataService } from '../../../services/data';

describe('Class1_5Component', () => {
  let component: Class1_5Component;
  let fixture: ComponentFixture<Class1_5Component>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Mock DataService
    const dataServiceSpy = jasmine.createSpyObj('DataService', [
      'getProfile', 'getContent', 'getVideo', 'uploadProfilePicture', 'updateProfile', 'updateProgress'
    ]);

    dataServiceSpy.getProfile.and.returnValue(of({
      name: 'Test User',
      email: 'test@example.com',
      profilePicture: '',
      progress: [1, 2, 3]
    }));

    dataServiceSpy.getContent.and.returnValue(of({
      topic: 'Test Topic',
      quiz_link: 'test-quiz',
      project_link: 'test-project'
    }));

    dataServiceSpy.getVideo.and.returnValue(of({ youtube_id: 'test123' }));

    dataServiceSpy.uploadProfilePicture.and.returnValue(of({ profilePicture: 'test.jpg' } as any));
    dataServiceSpy.updateProfile.and.returnValue(of({ name: 'Test User', email: 'test@example.com' } as any));
    dataServiceSpy.updateProgress.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        SafePipe,
        Class1_5Component
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: DataService, useValue: dataServiceSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock localStorage
    let store: { [key: string]: string } = {
      'userEmail': 'test@example.com'
    };
    spyOn(localStorage, 'getItem').and.callFake((key) => store[key]);
    spyOn(localStorage, 'setItem').and.callFake((key, value) => store[key] = value);
    spyOn(localStorage, 'removeItem').and.callFake((key) => delete store[key]);

    // Mock alert
    spyOn(window, 'alert');

    fixture = TestBed.createComponent(Class1_5Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with user data', () => {
    expect(component.userEmail).toBe('test@example.com');
  });

  it('should navigate to login if no user email', async () => {
    localStorage.removeItem('userEmail');

    // Create a new component instance with no email
    const newFixture = TestBed.createComponent(Class1_5Component);
    const newComponent = newFixture.componentInstance;

    await newComponent.initialize();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should select class and update progress', async () => {
    await component.selectClass(2);
    expect(component.selectedClass).toBe(2);
    expect(component.selectedDay).toBe(1);
    expect(component.currentRangeStart).toBe(1);
  });

  it('should handle profile picture change', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;

    await component.onProfilePictureChange(event);
    const dataService = TestBed.inject(DataService) as any;
    expect(dataService.uploadProfilePicture).toHaveBeenCalled();
  });

  it('should update profile', async () => {
    component.editName.nativeElement.value = 'New Name';
    component.editPassword.nativeElement.value = 'newpassword';

    const event = new Event('submit');
    await component.saveProfile(event);
    const dataService = TestBed.inject(DataService) as any;
    expect(dataService.updateProfile).toHaveBeenCalled();
  });

  it('should mark day as complete', async () => {
    component.selectedDay = 4;

    await component.markDayComplete();
    const dataService = TestBed.inject(DataService) as any;
    expect(dataService.updateProgress).toHaveBeenCalledWith(jasmine.objectContaining({ email: 'test@example.com', classNumber: 1, dayNumber: 4 }));
  });

  it('should toggle mobile menu', () => {
    const sidebarElement = document.createElement('div');
    sidebarElement.classList.add('sidebar');
    component.sidebar = { nativeElement: sidebarElement } as any;

    component.toggleMobileMenu();
    expect(sidebarElement.classList.contains('active')).toBe(true);

    component.toggleMobileMenu();
    expect(sidebarElement.classList.contains('active')).toBe(false);
  });

  it('should toggle profile dropdown', () => {
    const dropdownElement = document.createElement('div');
    dropdownElement.classList.add('profile-dropdown');
    component.profileDropdown = { nativeElement: dropdownElement } as any;

    const event = new Event('click');
    component.toggleProfileDropdown(event);
    expect(dropdownElement.classList.contains('active')).toBe(true);

    component.toggleProfileDropdown(event);
    expect(dropdownElement.classList.contains('active')).toBe(false);
  });

  it('should handle profile modal', () => {
    const modalElement = document.createElement('div');
    modalElement.classList.add('modal');
    component.editProfileModal = { nativeElement: modalElement } as any;

    component.openEditProfileModal();
    expect(modalElement.classList.contains('active')).toBe(true);

    component.closeEditProfileModal();
    expect(modalElement.classList.contains('active')).toBe(false);
  });

  it('should get section title correctly', () => {
    expect(component.getSectionTitle(5)).toBe('Analytical and Logical Skills');
    expect(component.getSectionTitle(15)).toBe('Communication Skills');
    expect(component.getSectionTitle(25)).toBe('Creative Thinking');
    expect(component.getSectionTitle(35)).toBe('Technology Skills');
    expect(component.getSectionTitle(45)).toBe('Life Skills');
  });

  it('should get sub-section title correctly', () => {
    expect(component.getSubSectionTitle(1)).toBe('Problem-Solving (real-life scenarios)');
    expect(component.getSubSectionTitle(3)).toBe('Critical Thinking (evaluating simple choices)');
    expect(component.getSubSectionTitle(11)).toBe('Verbal Communication (speaking clearly)');
    expect(component.getSubSectionTitle(31)).toBe('Digital Literacy (basic computer use)');
    expect(component.getSubSectionTitle(49)).toBe('Teamwork and Collaboration (group activities)');
  });

  it('should load day content', async () => {
    const languageElement = document.createElement('select');
    languageElement.value = 'english';
    component.languageSelect = { nativeElement: languageElement } as any;

    const topicElement = document.createElement('h2');
    component.topicName = { nativeElement: topicElement } as any;

    const videoElement = document.createElement('iframe');
    component.videoFrame = { nativeElement: videoElement } as any;

    await component.loadDay(1);
    const dataService = TestBed.inject(DataService) as any;
    expect(dataService.getContent).toHaveBeenCalledWith(1, 1);
    expect(dataService.getVideo).toHaveBeenCalledWith(1, 1, 'english');
  });

  it('should logout', () => {
    component.logout();
    expect(localStorage.removeItem).toHaveBeenCalledWith('userEmail');
  });

  it('should handle window resize', () => {
    const sidebarElement = document.createElement('div');
    sidebarElement.classList.add('sidebar');
    sidebarElement.classList.add('active');
    component.sidebar = { nativeElement: sidebarElement } as any;

    // Mock window.innerWidth > 768
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));

    // Sidebar should be closed on desktop
    expect(sidebarElement.classList.contains('active')).toBe(false);
  });
});