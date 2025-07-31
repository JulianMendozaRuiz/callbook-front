import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  TranscriptionRequest,
  TranscriptionResponse,
} from '../../../shared/models/transcription';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TokenManagementService {
  private token: string | null = null;
  private tokenExpiration: number | null = null;

  constructor(private http: HttpClient) {}

  setToken(token: string, expiresIn: number): void {
    this.token = token;
    this.tokenExpiration = expiresIn;
  }

  get getToken(): string | null {
    return this.token;
  }

  get getTokenExpiration(): number | null {
    return this.tokenExpiration;
  }

  clearToken(): void {
    this.token = null;
  }

  isTokenSet(): boolean {
    return this.token !== null;
  }

  async createToken(): Promise<TranscriptionResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<TranscriptionResponse>(
          `${environment.apiUrl}/transcription/token`,
          {} as TranscriptionRequest
        )
      );
      this.setToken(response.token, response.expires_in);
      return {
        token: response.token,
        expires_in: response.expires_in,
      };
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }
}
