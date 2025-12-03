// src/app/services/progress.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Progress } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = '/progress';

  constructor(private http: HttpClient) { }

  getProgress(email: string, classNumber: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${encodeURIComponent(email)}/${classNumber}`);
  }

  saveProgress(email: string, classNumber: number, dayNumber: number): Observable<any> {
    return this.http.post(`${this.apiUrl}`, {
      email,
      classNumber,
      dayNumber
    });
  }

  getAllProgress(email: string): Observable<Progress> {
    const progress: Progress = {
      id: '',
      user_id: '',
      course_id: '',
      completed: false
    };
    const promises: Promise<void>[] = [];

    for (let classNum = 1; classNum <= 5; classNum++) {
      promises.push(
        this.getProgress(email, classNum).toPromise().then(days => {
          progress[classNum] = days || [];
        }).catch(() => {
          progress[classNum] = [];
        })
      );
    }

    return new Observable(observer => {
      Promise.all(promises).then(() => {
        observer.next(progress);
        observer.complete();
      });
    });
  }
}