// src/app/services/content.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Content, Video, DayContent } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  getContent(classNumber: number, dayNumber: number): Observable<Content> {
    return this.http.get<Content>(`${this.apiUrl}/content/${classNumber}/${dayNumber}`);
  }

  getVideo(classNumber: number, dayNumber: number, language: string): Observable<Video> {
    return this.http.get<Video>(`${this.apiUrl}/video/${classNumber}/${dayNumber}/${language}`);
  }

  getDayContent(classNumber: number, dayNumber: number, language: string): Observable<DayContent> {
    return new Observable(observer => {
      let content: Content;
      let video: Video;
      let contentLoaded = false;
      let videoLoaded = false;

      this.getContent(classNumber, dayNumber).subscribe(data => {
        content = data;
        contentLoaded = true;
        if (videoLoaded) {
          observer.next({
            id: '', // You may need to provide an actual ID
            day_id: '', // You may need to provide the actual day ID
            content: JSON.stringify(content),
            video: video
          });
          observer.complete();
        }
      });

      this.getVideo(classNumber, dayNumber, language).subscribe(data => {
        video = data;
        videoLoaded = true;
        if (contentLoaded) {
          observer.next({
            id: '', // You may need to provide an actual ID
            day_id: '', // You may need to provide the actual day ID
            content: JSON.stringify(content),
            video: video
          });
          observer.complete();
        }
      });
    });
  }
}