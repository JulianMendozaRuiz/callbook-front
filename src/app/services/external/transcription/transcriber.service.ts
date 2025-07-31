import { Injectable } from '@angular/core';
import { AssemblyAI, StreamingTranscriber, TurnEvent } from 'assemblyai';
import { Subject } from 'rxjs';
import { TranscriptionEvent } from '../../../shared/models';

@Injectable({
  providedIn: 'root',
})
export class TranscriberService {
  private _transcriber: StreamingTranscriber | null = null;
  private transcriptionEvents$ = new Subject<TranscriptionEvent>();
  private currentParticipantId: string | null = null;
  private currentParticipantName: string | null = null;
  private isConnectionOpen: boolean = false;
  private reconnectionAttempts: number = 0;
  private maxReconnectionAttempts: number = 3;
  private currentClient: AssemblyAI | null = null;
  private currentToken: string | null = null;

  private sampleRate = 16000; // Default sample rate for AssemblyAI
  private formatTurns = true; // Default to formatting turns

  get transcriber(): StreamingTranscriber | null {
    return this._transcriber;
  }

  get transcriptionEvents() {
    return this.transcriptionEvents$.asObservable();
  }

  get isConnected(): boolean {
    return this.isConnectionOpen;
  }

  async createTranscriber(client: AssemblyAI, token: string): Promise<void> {
    if (this._transcriber) {
      return;
    }

    // Store for potential reconnection
    this.currentClient = client;
    this.currentToken = token;

    try {
      // For browser environments, we need to use token authentication
      const newTranscriber = client.streaming.transcriber({
        sampleRate: this.sampleRate,
        formatTurns: this.formatTurns,
        token: token,
      });

      this._transcriber = newTranscriber;
      this.setupEventHandlers();
      await this._transcriber.connect();

      this.isConnectionOpen = true;
      this.reconnectionAttempts = 0;
    } catch (error) {
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this._transcriber) {
      return;
    }

    this._transcriber.on('open', ({ id }) => {
      this.isConnectionOpen = true;
      this.transcriptionEvents$.next({ type: 'open', data: { id } });
    });

    this._transcriber.on('error', (error) => {
      this.isConnectionOpen = false;
      this.transcriptionEvents$.next({ type: 'error', data: error });
    });

    this._transcriber.on('close', (code, reason) => {
      this.isConnectionOpen = false;
      this.transcriptionEvents$.next({ type: 'close', data: { code, reason } });

      if (
        code !== 1000 &&
        this.reconnectionAttempts < this.maxReconnectionAttempts
      ) {
        this.attemptReconnection();
      }
    });

    this._transcriber.on('turn', (turn: TurnEvent) => {
      const isFinal = turn.end_of_turn && turn.turn_is_formatted;

      if (!turn.transcript) {
        return;
      }

      if (isFinal) {
        const enrichedTurn = {
          ...turn,
          participantId: this.currentParticipantId,
          participantName: this.currentParticipantName,
          isFinal: true,
        };

        this.transcriptionEvents$.next({ type: 'turn', data: enrichedTurn });
      }
    });
  }

  private async attemptReconnection(): Promise<void> {
    if (!this.currentClient || !this.currentToken) {
      console.error('❌ Cannot reconnect: Missing client or token');
      return;
    }

    this.reconnectionAttempts++;

    try {
      // Close existing transcriber
      if (this._transcriber) {
        await this._transcriber.close();
        this._transcriber = null;
      }

      // Wait a bit before reconnecting
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * this.reconnectionAttempts)
      );

      // Recreate transcriber
      await this.createTranscriber(this.currentClient, this.currentToken);
    } catch (error) {
      console.error(
        `❌ Reconnection attempt ${this.reconnectionAttempts} failed:`,
        error
      );

      if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
        // Try again
        setTimeout(
          () => this.attemptReconnection(),
          2000 * this.reconnectionAttempts
        );
      }
    }
  }

  async startConnection(): Promise<void> {
    if (!this._transcriber) {
      throw new Error('Transcriber is not created');
    }

    if (this.isConnectionOpen) {
      return;
    }
  }
  setCurrentParticipant(participantId: string, participantName: string): void {
    this.currentParticipantId = participantId;
    this.currentParticipantName = participantName;
  }

  async waitForConnection(timeoutMs: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnectionOpen) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Transcriber connection timeout'));
      }, timeoutMs);

      const subscription = this.transcriptionEvents$.subscribe((event) => {
        if (event.type === 'open') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve();
        } else if (event.type === 'error') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          reject(new Error(`Transcriber connection error: ${event.data}`));
        } else if (event.type === 'close') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          reject(new Error('Transcriber connection closed unexpectedly'));
        }
      });
    });
  }

  async closeTranscriber(): Promise<void> {
    if (this._transcriber) {
      try {
        this.isConnectionOpen = false;
        await this._transcriber.close();
      } catch (error) {
        console.warn('Error closing transcriber:', error);
      } finally {
        this._transcriber = null;
        this.currentParticipantId = null;
        this.currentParticipantName = null;
        this.currentClient = null;
        this.currentToken = null;
        this.reconnectionAttempts = 0;
      }
    }
  }

  async restartTranscriber(): Promise<void> {
    if (this.currentClient && this.currentToken) {
      await this.closeTranscriber();
      await this.createTranscriber(this.currentClient, this.currentToken);
    } else {
      throw new Error(
        'Cannot restart transcriber: No client or token available'
      );
    }
  }
}
