import { Injectable } from '@angular/core';

import { AssemblyAI } from 'assemblyai';

@Injectable({
  providedIn: 'root',
})
export class ClientManagerService {
  private _apiClient: AssemblyAI | null = null;

  constructor() {}

  get apiClient(): AssemblyAI | null {
    return this._apiClient;
  }

  startClient(apiKey: string): void {
    if (!this._apiClient) {
      const newClient = new AssemblyAI({
        apiKey: apiKey,
      });

      this._apiClient = newClient;
    }
  }
}
