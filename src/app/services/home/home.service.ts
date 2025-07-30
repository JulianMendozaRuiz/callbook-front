import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createCall(username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/calls`, { username });
  }

  joinCall(callId: string, username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/calls/${callId}/join`, { username });
  }
}
