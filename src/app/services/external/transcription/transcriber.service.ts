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

  // Track recent participant activity to better associate transcriptions
  private recentParticipantActivity: Map<
    string,
    {
      participantId: string;
      participantName: string;
      lastActivity: number;
    }
  > = new Map();
  private readonly ACTIVITY_TIMEOUT_MS = 2000; // 2 seconds

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
        // Determine the most likely participant for this transcription
        const participantInfo = this.getMostLikelyParticipant();

        const enrichedTurn = {
          ...turn,
          participantId: participantInfo.participantId,
          participantName: participantInfo.participantName,
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

    // Track recent activity for this participant
    this.recentParticipantActivity.set(participantId, {
      participantId,
      participantName,
      lastActivity: Date.now(),
    });

    // Clean up old activity records
    const now = Date.now();
    for (const [id, activity] of this.recentParticipantActivity.entries()) {
      if (now - activity.lastActivity > this.ACTIVITY_TIMEOUT_MS) {
        this.recentParticipantActivity.delete(id);
      }
    }
  }

  private getMostLikelyParticipant(): {
    participantId: string;
    participantName: string;
  } {
    // If we have recent activity, find the participant with the most recent activity
    // that's not the local participant (since local audio is processed more frequently)
    const now = Date.now();
    let mostRecentActivity: {
      participantId: string;
      participantName: string;
      lastActivity: number;
    } | null = null;
    let mostRecentNonLocalActivity: {
      participantId: string;
      participantName: string;
      lastActivity: number;
    } | null = null;

    for (const activity of this.recentParticipantActivity.values()) {
      if (now - activity.lastActivity <= this.ACTIVITY_TIMEOUT_MS) {
        if (
          !mostRecentActivity ||
          activity.lastActivity > mostRecentActivity.lastActivity
        ) {
          mostRecentActivity = activity;
        }

        // Track non-local activity separately
        if (
          activity.participantId !== 'local' &&
          (!mostRecentNonLocalActivity ||
            activity.lastActivity > mostRecentNonLocalActivity.lastActivity)
        ) {
          mostRecentNonLocalActivity = activity;
        }
      }
    }

    // Prefer non-local participants if they've been active recently
    if (
      mostRecentNonLocalActivity &&
      (!mostRecentActivity ||
        mostRecentActivity.lastActivity -
          mostRecentNonLocalActivity.lastActivity <
          500)
    ) {
      return {
        participantId: mostRecentNonLocalActivity.participantId,
        participantName: mostRecentNonLocalActivity.participantName,
      };
    }

    // Fall back to most recent activity or current participant
    if (mostRecentActivity) {
      return {
        participantId: mostRecentActivity.participantId,
        participantName: mostRecentActivity.participantName,
      };
    }

    // Final fallback to current participant
    return {
      participantId: this.currentParticipantId || 'unknown',
      participantName: this.currentParticipantName || 'Speaker',
    };
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
        this.recentParticipantActivity.clear(); // Clear activity tracking
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
