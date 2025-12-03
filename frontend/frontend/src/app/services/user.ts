// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserProfile } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getUserProfile(email: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile/${encodeURIComponent(email)}`);
  }

  updateProfile(email: string, name: string, password?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, {
      email,
      name,
      password: password || undefined
    });
  }

  uploadProfilePicture(email: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('email', email);

    return this.http.post(`${this.apiUrl}/profile/picture`, formData);
  }
}