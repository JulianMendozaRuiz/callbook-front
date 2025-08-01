import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  TranslationRequest,
  TranslationResponse,
} from '../../../shared/models';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  constructor(private http: HttpClient) {}

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<TranslationResponse>(
          `${environment.apiUrl}/translation/translate`,
          request
        )
      );

      return response as TranslationResponse;
    } catch (error) {
      console.error('❌ Error during translation:', error);
      throw error; // Re-throw the error for further handling
    }
  }
}
