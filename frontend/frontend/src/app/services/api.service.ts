// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Section, Class, Day, Video, Category, Job, Skill, LearningPathDay } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBase = 'http://localhost:3000/api/admin';
  private apiBaseNoAdmin = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(error.error || error.message || 'Server error');
  }

  // Sections
  getSections(): Observable<Section[]> {
    return this.http.get<Section[]>(`${this.apiBase}/sections`).pipe(catchError(this.handleError));
  }

  // Classes
  getClasses(sectionId: string): Observable<Class[]> {
    return this.http.get<Class[]>(`${this.apiBase}/classes/${sectionId}`).pipe(catchError(this.handleError));
  }

  // Days
  getDays(classId: string): Observable<Day[]> {
    return this.http.get<Day[]>(`${this.apiBase}/days/${classId}`).pipe(catchError(this.handleError));
  }

  addDay(classId: string, dayNumber: number): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/day`, { class_id: classId, day_number: dayNumber }).pipe(catchError(this.handleError));
  }

  updateDay(dayId: string, data: Partial<Day>): Observable<any> {
    return this.http.put<any>(`${this.apiBase}/day/${dayId}`, data).pipe(catchError(this.handleError));
  }

  deleteDay(dayId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/day/${dayId}`).pipe(catchError(this.handleError));
  }

  // Content
  getContent(dayId: string): Observable<{ day: Day, videos: Video[] }> {
    return this.http.get<{ day: Day, videos: Video[] }>(`${this.apiBase}/content/${dayId}`).pipe(catchError(this.handleError));
  }

  saveContent(dayId: string, data: Partial<Day>): Observable<any> {
    return this.http.put<any>(`${this.apiBase}/day/${dayId}`, data).pipe(catchError(this.handleError));
  }

  // Videos
  saveVideo(dayId: string, language: 'english' | 'telugu', youtubeLink: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/video/${dayId}/${language}`, { youtube_link: youtubeLink }).pipe(catchError(this.handleError));
  }

  // Summer Special
  getSummerDays(): Observable<Day[]> {
    return this.http.get<Day[]>(`${this.apiBase}/summer/content/summer`).pipe(catchError(this.handleError));
  }

  getSummerContent(dayId: string): Observable<{ day: Day, videos: Video[] }> {
    return this.http.get<{ day: Day, videos: Video[] }>(`${this.apiBase}/summer/content/${dayId}`).pipe(catchError(this.handleError));
  }

  addSummerDay(dayNumber: number): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/summer/day`, { category: 'summer', day_number: dayNumber }).pipe(catchError(this.handleError));
  }

  updateSummerContent(dayId: string, data: Partial<Day>): Observable<any> {
    return this.http.put<any>(`${this.apiBase}/summer/content/${dayId}`, { category: 'summer', ...data }).pipe(catchError(this.handleError));
  }

  saveSummerVideo(dayId: string, language: 'english', youtubeLink: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/summer/video/${dayId}/${language}`, { youtube_link: youtubeLink }).pipe(catchError(this.handleError));
  }

  // Career Management
  getSectionByName(sectionName: string): Observable<Section> {
    return this.http.get<Section>(`${this.apiBaseNoAdmin}/section/${sectionName}`).pipe(catchError(this.handleError));
  }

  getCategories(sectionId: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiBaseNoAdmin}/categories/${sectionId}`).pipe(catchError(this.handleError));
  }

  addCategory(name: string, sectionId: string): Observable<Category> {
    return this.http.post<Category>(`${this.apiBase}/category`, { name, section_id: sectionId }).pipe(catchError(this.handleError));
  }

  updateCategory(id: string, name: string): Observable<Category> {
    return this.http.put<Category>(`${this.apiBase}/category/${id}`, { name }).pipe(catchError(this.handleError));
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/category/${id}`).pipe(catchError(this.handleError));
  }

  getJobs(categoryId: string): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiBaseNoAdmin}/jobs/${categoryId}`).pipe(catchError(this.handleError));
  }

  addJob(jobData: Partial<Job>): Observable<Job> {
    return this.http.post<Job>(`${this.apiBase}/job`, jobData).pipe(catchError(this.handleError));
  }

  updateJob(id: string, jobData: Partial<Job>): Observable<Job> {
    return this.http.put<Job>(`${this.apiBase}/job/${id}`, jobData).pipe(catchError(this.handleError));
  }

  deleteJob(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/job/${id}`).pipe(catchError(this.handleError));
  }

  getSkills(jobId: string): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${this.apiBaseNoAdmin}/skills/${jobId}`).pipe(catchError(this.handleError));
  }

  addSkill(name: string, jobId: string): Observable<Skill> {
    return this.http.post<Skill>(`${this.apiBase}/skill`, { name, job_id: jobId }).pipe(catchError(this.handleError));
  }

  updateSkill(id: string, name: string): Observable<Skill> {
    return this.http.put<Skill>(`${this.apiBase}/skill/${id}`, { name }).pipe(catchError(this.handleError));
  }

  deleteSkill(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/skill/${id}`).pipe(catchError(this.handleError));
  }

  getLearningPathDays(skillId: string): Observable<LearningPathDay[]> {
    return this.http.get<LearningPathDay[]>(`${this.apiBaseNoAdmin}/learning_path/days/${skillId}`).pipe(catchError(this.handleError));
  }

  getLearningPathDay(dayId: string): Observable<LearningPathDay> {
    return this.http.get<LearningPathDay>(`${this.apiBaseNoAdmin}/learning_path/day/${dayId}`).pipe(catchError(this.handleError));
  }

  addLearningPathDay(skillId: string, dayNumber: number, topic: string): Observable<LearningPathDay> {
    return this.http.post<LearningPathDay>(`${this.apiBase}/learning_path/day`, { skill_id: skillId, day_number: dayNumber, topic }).pipe(catchError(this.handleError));
  }

  // New method to add a learning path day with full details
  addLearningPathDayWithDetails(dayData: Partial<LearningPathDay>): Observable<LearningPathDay> {
    return this.http.post<LearningPathDay>(`${this.apiBase}/learning_path/day`, dayData).pipe(catchError(this.handleError));
  }

  // New method to initialize multiple learning path days at once
  initializeLearningPathDays(skillId: string, days: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/learning_path/days/init`, { skill_id: skillId, days }).pipe(catchError(this.handleError));
  }

  updateLearningPathDay(id: string, data: Partial<LearningPathDay>): Observable<LearningPathDay> {
    return this.http.put<LearningPathDay>(`${this.apiBase}/learning_path/day/${id}`, data).pipe(catchError(this.handleError));
  }

  deleteLearningPathDay(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/learning_path/day/${id}`).pipe(catchError(this.handleError));
  }

  getLearningPathVideos(dayId: string): Observable<Video[]> {
    return this.http.get<Video[]>(`${this.apiBaseNoAdmin}/learning_path/video/day/${dayId}`).pipe(catchError(this.handleError));
  }

  saveLearningPathVideo(dayId: string, language: 'english' | 'telugu', youtubeLink: string): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/learning_path/video/${dayId}/${language}`, { youtube_link: youtubeLink }).pipe(catchError(this.handleError));
  }
}