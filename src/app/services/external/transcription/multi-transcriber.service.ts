import { Injectable } from '@angular/core';
import { AssemblyAI, StreamingTranscriber, TurnEvent } from 'assemblyai';
import { Subject, merge } from 'rxjs';
import { TranscriptionEvent } from '../../../shared/models';

interface TranscriberInstance {
  transcriber: StreamingTranscriber;
  participantId: string;
  participantName: string;
  isLocal: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MultiTranscriberService {
  private transcribers: Map<string, TranscriberInstance> = new Map();
  private transcriptionEvents$ = new Subject<TranscriptionEvent>();
  private isConnectionOpen: boolean = false;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 3;
  private currentClient: AssemblyAI | null = null;
  private currentToken: string | null = null;

  private sampleRate = 16000; // Default sample rate for AssemblyAI
  private formatTurns = true; // Default to formatting turns

  get transcriptionEvents() {
    return this.transcriptionEvents$.asObservable();
  }

  get isConnected(): boolean {
    return this.isConnectionOpen;
  }

  async initializeClient(client: AssemblyAI, token: string): Promise<void> {
    this.currentClient = client;
    this.currentToken = token;
  }

  async createTranscriberForParticipant(
    participantId: string,
    participantName: string,
    isLocal: boolean = false
  ): Promise<void> {
    if (!this.currentClient || !this.currentToken) {
      throw new Error('Client not initialized. Call initializeClient first.');
    }

    // Don't create duplicate transcribers
    if (this.transcribers.has(participantId)) {
      console.warn(`Transcriber for ${participantName} already exists`);
      return;
    }

    try {
      const transcriber = this.currentClient.streaming.transcriber({
        sampleRate: this.sampleRate,
        formatTurns: this.formatTurns,
        token: this.currentToken,
      });

      const instance: TranscriberInstance = {
        transcriber,
        participantId,
        participantName,
        isLocal,
      };

      // Setup event handlers for this specific transcriber
      this.setupEventHandlersForTranscriber(instance);

      await transcriber.connect();

      this.transcribers.set(participantId, instance);
      this.isConnectionOpen = true;
    } catch (error) {
      console.error(
        `Failed to create transcriber for ${participantName}:`,
        error
      );
      throw error;
    }
  }

  private setupEventHandlersForTranscriber(
    instance: TranscriberInstance
  ): void {
    const { transcriber, participantId, participantName, isLocal } = instance;

    transcriber.on('open', ({ id }) => {
      this.transcriptionEvents$.next({
        type: 'open',
        data: { id, participantId, participantName, isLocal },
      });
    });

    transcriber.on('error', (error) => {
      console.error(`❌ Transcriber error for ${participantName}:`, error);
      this.transcriptionEvents$.next({
        type: 'error',
        data: { error, participantId, participantName, isLocal },
      });

      // Attempt to reconnect this specific transcriber
      this.attemptReconnectionForParticipant(participantId);
    });

    transcriber.on('close', (code, reason) => {
      this.transcriptionEvents$.next({
        type: 'close',
        data: { code, reason, participantId, participantName, isLocal },
      });

      if (
        code !== 1000 &&
        this.reconnectionAttempts < this.maxReconnectionAttempts
      ) {
        this.attemptReconnectionForParticipant(participantId);
      }
    });

    transcriber.on('turn', (turn: TurnEvent) => {
      const isFinal = turn.end_of_turn && turn.turn_is_formatted;

      if (!turn.transcript) {
        return;
      }

      if (isFinal) {
        const enrichedTurn = {
          ...turn,
          participantId,
          participantName,
          isLocal,
          isFinal: true,
        };

        this.transcriptionEvents$.next({ type: 'turn', data: enrichedTurn });
      }
    });
  }

  async sendAudioToParticipant(
    participantId: string,
    audioData: ArrayBuffer
  ): Promise<void> {
    const instance = this.transcribers.get(participantId);
    if (!instance) {
      console.warn(`No transcriber found for participant ${participantId}`);
      return;
    }

    try {
      instance.transcriber.sendAudio(audioData);
    } catch (error) {
      console.error(
        `Error sending audio for ${instance.participantName}:`,
        error
      );
    }
  }

  async closeTranscriberForParticipant(participantId: string): Promise<void> {
    const instance = this.transcribers.get(participantId);
    if (!instance) {
      return;
    }

    try {
      await instance.transcriber.close();
    } catch (error) {
      console.warn(
        `Error closing transcriber for ${instance.participantName}:`,
        error
      );
    } finally {
      this.transcribers.delete(participantId);
    }
  }

  async closeAllTranscribers(): Promise<void> {
    const closePromises = Array.from(this.transcribers.keys()).map(
      (participantId) => this.closeTranscriberForParticipant(participantId)
    );

    await Promise.all(closePromises);

    this.transcribers.clear();
    this.isConnectionOpen = false;
    this.reconnectionAttempts = 0;
  }

  private async attemptReconnectionForParticipant(
    participantId: string
  ): Promise<void> {
    const instance = this.transcribers.get(participantId);
    if (!instance || !this.currentClient || !this.currentToken) {
      return;
    }

    this.reconnectionAttempts++;

    try {
      // Close existing transcriber
      await instance.transcriber.close();

      // Wait before reconnecting
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * this.reconnectionAttempts)
      );

      // Recreate transcriber for this participant
      this.transcribers.delete(participantId);
      await this.createTranscriberForParticipant(
        instance.participantId,
        instance.participantName,
        instance.isLocal
      );

      this.reconnectionAttempts = 0;
    } catch (error) {
      console.error(
        `❌ Reconnection failed for ${instance.participantName}:`,
        error
      );

      if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
        setTimeout(
          () => this.attemptReconnectionForParticipant(participantId),
          2000
        );
      }
    }
  }

  getActiveTranscribers(): string[] {
    return Array.from(this.transcribers.keys());
  }

  hasTranscriberForParticipant(participantId: string): boolean {
    return this.transcribers.has(participantId);
  }
}
