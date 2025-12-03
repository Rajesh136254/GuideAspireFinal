import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile, Content, Video, ProgressPayload, ProfileUpdatePayload } from '../interfaces/profile.interface';
import { environment } from '../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = environment.apiUrl;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Profile methods
  getProfile(): Observable<Profile> {
    // Include user email in the request only if we're in the browser
    let userEmail = '';
    if (this.isBrowser) {
      userEmail = localStorage.getItem('userEmail') || '';
    }
    return this.http.get<Profile>(`${this.baseUrl}/api/profile/${encodeURIComponent(userEmail)}`);
  }

  updateProfile(profileData: ProfileUpdatePayload): Observable<Profile> {
    return this.http.put<Profile>(`${this.baseUrl}/api/profile`, profileData);
  }

  uploadProfilePicture(formData: FormData): Observable<Profile> {
    return this.http.post<Profile>(`${this.baseUrl}/api/profile/picture`, formData);
  }

  // Progress methods
  updateProgress(progressData: ProgressPayload): Observable<any> {
    // The backend exposes progress endpoints at /progress (no /api prefix) in this project.
    // Use baseUrl + '/progress' so requests go to the correct server path and avoid 404s.
    return this.http.post<any>(`${this.baseUrl}/progress`, progressData);
  }

  // Get progress for a specific class

getProgress(email: string, classNumber: number): Observable<number[]> {
  return this.http.get<number[]>(`${this.baseUrl}/progress/${encodeURIComponent(email)}/${classNumber}`);
}

  // Content methods
  // classNumber: numeric class (1..12 or 'grad'/'life' strings where applicable)
  getContent(classNumber: number | string, dayNumber: number): Observable<Content> {
    return this.http.get<Content>(`${this.baseUrl}/api/content/${classNumber}/${dayNumber}`);
  }

  // language should be a string like 'english' or stored language code used by admin
  getVideo(classNumber: number | string, dayNumber: number, language: string = 'english'): Observable<Video> {
    return this.http.get<Video>(`${this.baseUrl}/api/video/${classNumber}/${dayNumber}/${language}`);
  }


}