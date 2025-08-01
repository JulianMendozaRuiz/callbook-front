import { Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { AssemblyAI } from 'assemblyai';
import { TokenManagementService } from './token-manager.service';
import { ClientManagerService } from './client-manager.service';
import { TranscriberService } from './transcriber.service';
import { AudioProcessorService } from './audio-processor.service';
import { MultiTranscriberService } from './multi-transcriber.service';
import { MultiAudioProcessorService } from './multi-audio-processor.service';
import { TranscriptionResultsService } from './transcription-results.service';
import { TranscriptionResult } from '../../../shared/models/transcription';
import { Room } from 'livekit-client';

@Injectable({
  providedIn: 'root',
})
export class TranscriptionService {
  private isTranscribing = false;
  private transcriptionSubscription: Subscription | null = null;
  private useMultiTranscriber = true; // Feature flag to switch between approaches

  constructor(
    private tokenManagementService: TokenManagementService,
    private clientManagerService: ClientManagerService,
    private transcriberService: TranscriberService,
    private audioProcessorService: AudioProcessorService,
    private multiTranscriberService: MultiTranscriberService,
    private multiAudioProcessorService: MultiAudioProcessorService,
    private transcriptionResultsService: TranscriptionResultsService
  ) {}

  get transcriptionResults(): Observable<TranscriptionResult[]> {
    return this.transcriptionResultsService.transcriptionResults;
  }

  // Method to switch between single and multi-transcriber approaches
  setUseMultiTranscriber(useMulti: boolean): void {
    this.useMultiTranscriber = useMulti;
  }

  getCurrentTranscriberMode(): string {
    return this.useMultiTranscriber
      ? 'multi-transcriber'
      : 'single-transcriber';
  }

  // Debug methods
  getActiveTranscribers(): string[] {
    if (this.useMultiTranscriber) {
      return this.multiTranscriberService.getActiveTranscribers();
    }
    return this.transcriberService.isConnected ? ['single-transcriber'] : [];
  }

  getActiveAudioProcessors(): string[] {
    if (this.useMultiTranscriber) {
      return this.multiAudioProcessorService.getActiveProcessors();
    }
    return []; // Legacy audio processor doesn't expose this info
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

    if (this.useMultiTranscriber) {
      // Initialize the multi-transcriber service
      await this.multiTranscriberService.initializeClient(client, token);
    } else {
      // Close any existing transcriber first (legacy single transcriber)
      await this.transcriberService.closeTranscriber();
      await this.transcriberService.createTranscriber(client, token);
    }
  }

  async startTranscriptionForCall(room: Room): Promise<void> {
    if (this.isTranscribing) {
      return;
    }

    await this.startTranscriber();

    this.setupTranscriptionEventHandlers();

    if (this.useMultiTranscriber) {
      await this.multiAudioProcessorService.startProcessingRoom(room);
    } else {
      await this.audioProcessorService.startProcessingRoom(room);
    }

    this.isTranscribing = true;
  }

  async stopTranscriptionForCall(): Promise<void> {
    if (!this.isTranscribing) {
      return;
    }

    if (this.useMultiTranscriber) {
      // Stop multi-audio processing and close all transcribers
      await this.multiAudioProcessorService.stopProcessingRoom();
    } else {
      // Stop audio processing using delegated service (legacy)
      await this.audioProcessorService.stopProcessingRoom();
      // Stop transcriber using delegated service (legacy)
      await this.transcriberService.closeTranscriber();
    }

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
    if (this.useMultiTranscriber) {
      // Subscribe to transcription events from MultiTranscriberService
      this.transcriptionSubscription =
        this.multiTranscriberService.transcriptionEvents.subscribe((event) => {
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
    } else {
      // Subscribe to transcription events from TranscriberService (legacy)
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
}
