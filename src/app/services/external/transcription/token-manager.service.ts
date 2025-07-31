import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  TranscriptionTokenRequest,
  TranscriptionTokenResponse,
} from '../../../shared/models/transcription';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TokenManagementService {
  private _token: string | null = null;
  private tokenExpiration: number | null = null;

  constructor(private http: HttpClient) {}

  setToken(token: string, expiresIn: number): void {
    this._token = token;
    this.tokenExpiration = expiresIn;
  }

  get getToken(): string | null {
    return this._token;
  }

  get getTokenExpiration(): number | null {
    return this.tokenExpiration;
  }

  clearToken(): void {
    this._token = null;
  }

  isTokenSet(): boolean {
    return this._token !== null;
  }

  async createToken(): Promise<TranscriptionTokenResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<TranscriptionTokenResponse>(
          `${environment.apiUrl}/transcription/token`,
          {} as TranscriptionTokenRequest
        )
      );

      this.setToken(response.token, response.expires_in);

      return {
        token: response.token,
        expires_in: response.expires_in,
      };
    } catch (error) {
      console.error('❌ Error creating token:', error);

      // Provide more specific error messages
      if (error && typeof error === 'object' && 'status' in error) {
        const httpError = error as any;
        if (httpError.status === 0) {
          throw new Error(
            'Cannot connect to transcription service - check if backend is running'
          );
        } else if (httpError.status === 401) {
          throw new Error('Unauthorized access to transcription service');
        } else if (httpError.status === 404) {
          throw new Error('Transcription service endpoint not found');
        } else if (httpError.status >= 500) {
          throw new Error('Transcription service is temporarily unavailable');
        }
      }

      throw error;
    }
  }
}
