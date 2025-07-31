import { Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AssemblyAI } from 'assemblyai';
import { TokenManagementService } from './token-manager.service';
import { ClientManagerService } from './client-manager.service';
import { TranscriberService } from './transcriber.service';
import { AudioProcessorService } from './audio-processor.service';
import { TranscriptionResultsService } from './transcription-results.service';
import { TranscriptionResult } from '../../../shared/models/transcription';
import { Room } from 'livekit-client';

@Injectable({
  providedIn: 'root',
})
export class TranscriptionService {
  private isTranscribing = false;
  private transcriptionSubscription: Subscription | null = null;

  constructor(
    private tokenManagementService: TokenManagementService,
    private clientManagerService: ClientManagerService,
    private transcriberService: TranscriberService,
    private audioProcessorService: AudioProcessorService,
    private transcriptionResultsService: TranscriptionResultsService
  ) {}

  get transcriptionResults(): Observable<TranscriptionResult[]> {
    return this.transcriptionResultsService.transcriptionResults;
  }

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

  async startTranscriber(): Promise<void> {
    await this.tokenManagementService.createToken();

    const token = this.tokenManagementService.getToken;

    if (!token) {
      throw new Error('Temporary token is not set');
    }

    // Use the client manager to maintain proper architecture
    // Uses dummy key for streaming since transcriber uses token auth
    this.clientManagerService.startClient('dummy-key-for-streaming');
    const client = this.clientManagerService.apiClient;

    if (!client) {
      throw new Error('API Client is not initialized');
    }

    // Close any existing transcriber first
    await this.transcriberService.closeTranscriber();

    await this.transcriberService.createTranscriber(client, token);
  }

  async startTranscriptionForCall(room: Room): Promise<void> {
    if (this.isTranscribing) {
      return;
    }

    await this.startTranscriber();

    this.setupTranscriptionEventHandlers();

    await this.audioProcessorService.startProcessingRoom(room);

    this.isTranscribing = true;
  }

  async stopTranscriptionForCall(): Promise<void> {
    if (!this.isTranscribing) {
      return;
    }

    // Stop audio processing using delegated service
    await this.audioProcessorService.stopProcessingRoom();

    // Stop transcriber using delegated service
    await this.transcriberService.closeTranscriber();

    // Unsubscribe from events
    if (this.transcriptionSubscription) {
      this.transcriptionSubscription.unsubscribe();
      this.transcriptionSubscription = null;
    }

    this.isTranscribing = false;
  }

  async restartTranscription(): Promise<void> {
    if (!this.isTranscribing) {
      console.error(
        '❌ Cannot restart: Transcription is not currently running'
      );
      return;
    }

    console.warn('🔄 Restarting transcription connection...');
    try {
      await this.transcriberService.restartTranscriber();
      console.warn('✅ Transcription restarted successfully');
    } catch (error) {
      console.error('❌ Failed to restart transcription:', error);
      throw error;
    }
  }

  private setupTranscriptionEventHandlers(): void {
    // Subscribe to transcription events from TranscriberService
    this.transcriptionSubscription =
      this.transcriberService.transcriptionEvents.subscribe((event) => {
        if (event.type === 'turn' && event.data.transcript) {
          const result: TranscriptionResult = {
            text: event.data.transcript,
            participantId: event.data.participantId || 'unknown',
            participantName: event.data.participantName || 'Speaker',
            timestamp: new Date(),
            isFinal: true,
          };

          // Use delegated service to add result
          this.transcriptionResultsService.addTranscriptionResult(result);
        }
      });
  }
}
