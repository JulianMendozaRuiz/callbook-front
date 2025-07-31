import { Injectable } from '@angular/core';
import { TokenManagementService } from './token-management.service';

@Injectable({
  providedIn: 'root',
})
export class TranscriptionService {
  constructor(private tokenManagementService: TokenManagementService) {}

  async getTranscriptionToken(): Promise<any> {
    if (this.tokenManagementService.isTokenSet()) {
      return {
        token: this.tokenManagementService.getToken,
        expiresIn: this.tokenManagementService.getTokenExpiration,
      };
    } else {
      return await this.tokenManagementService.createToken();
    }
  }
}
