import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideocallService } from '../services/external/videocall/videocall.service';
import { TranscriptionService } from '../services/external/transcription/transcription.service';
import {
  TranscriptionResult,
  TranscriptMessage,
} from '../shared/models/transcription';
import { Subscription } from 'rxjs';
import { Participant } from 'livekit-client';

@Component({
  selector: 'app-call',
  standalone: false,
  templateUrl: './call.component.html',
  styleUrl: './call.component.css',
})
export class CallComponent implements OnInit, OnDestroy {
  callId: string = '';
  showTranscript: boolean = false;
  currentUsername: string = '';
  remoteParticipants: Participant[] = [];
  transcript: TranscriptMessage[] = [];
  isMicOn: boolean = true;
  isCameraOn: boolean = true;
  isTranscriptionActive: boolean = false;
  private processedTranscriptionIds: Set<string> = new Set();

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videocallService: VideocallService,
    private transcriptionService: TranscriptionService
  ) {}

  async ngOnInit() {
    // Get call ID from route parameters
    this.callId = this.route.snapshot.paramMap.get('id') || 'Unknown';

    // Get current username
    this.currentUsername = this.videocallService.getCurrentUsername();

    // Subscribe to participants changes
    const participantsSub = this.videocallService.participants$.subscribe(
      (participants) => {
        this.remoteParticipants = Array.from(participants.values());
      }
    );
    this.subscriptions.push(participantsSub);

    await this.videocallService.publishVideoAndAudio();

    // Initialize transcript with welcome message
    this.addTranscriptMessage('System', `Welcome to call room: ${this.callId}`);
    this.addTranscriptMessage(
      'System',
      'Click "Start Live Transcription" to enable real-time speech-to-text'
    );

    // Set up transcription listeners (but don't auto-start transcription)
    this.setupTranscriptListeners();
  }

  async ngOnDestroy() {
    // Stop transcription when leaving the component
    if (this.isTranscriptionActive) {
      await this.transcriptionService.stopTranscriptionForCall();
    }

    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  async leaveCall() {
    // Navigate back to home
    await this.videocallService.leaveRoom();
    this.router.navigate(['/']);
  }

  toggleTranscript() {
    this.showTranscript = !this.showTranscript;
  }

  async toggleMic() {
    try {
      if (this.isMicOn) {
        await this.videocallService.disableAudio();
      } else {
        await this.videocallService.enableAudio();
      }
      this.isMicOn = !this.isMicOn;
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  }

  async toggleVideo() {
    try {
      if (this.isCameraOn) {
        await this.videocallService.disableVideo();
      } else {
        await this.videocallService.enableVideo();
      }
      this.isCameraOn = !this.isCameraOn;
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }

  private addTranscriptMessage(sender: string, text: string) {
    const message: TranscriptMessage = {
      sender,
      text,
      timestamp: new Date(),
    };
    this.transcript.push(message);
  }

  private async setupTranscriptListeners() {
    // Subscribe to transcription results
    const transcriptionSub =
      this.transcriptionService.transcriptionResults.subscribe(
        (results: TranscriptionResult[]) => {
          // Convert transcription results to transcript messages
          results.forEach((result) => {
            if (result.isFinal) {
              // Create a unique identifier for this result to avoid duplicates
              const resultId = `${
                result.participantId
              }-${result.timestamp.getTime()}-${result.text.slice(0, 20)}`;

              if (!this.processedTranscriptionIds.has(resultId)) {
                this.processedTranscriptionIds.add(resultId);
                this.addTranscriptMessage(result.participantName, result.text);
              }
            }
          });
        }
      );
    this.subscriptions.push(transcriptionSub);

    // Listen for participant changes for system messages
    const participantsSub = this.videocallService.participants$.subscribe(
      (participants) => {
        const participantList = Array.from(participants.values());
        if (participantList.length > this.remoteParticipants.length) {
          // New participant joined
          const newParticipant = participantList[participantList.length - 1];
          this.addTranscriptMessage(
            'System',
            `${newParticipant.name || newParticipant.identity} joined the call`
          );
        }
      }
    );
    this.subscriptions.push(participantsSub);
  }

  async toggleTranscription() {
    if (this.isTranscriptionActive) {
      await this.transcriptionService.stopTranscriptionForCall();
      this.showTranscript = false; // Hide transcript when stopping
      this.isTranscriptionActive = false;
      this.processedTranscriptionIds.clear(); // Clear processed IDs for fresh start
      this.addTranscriptMessage('System', 'Live transcription stopped');
    } else {
      if (this.videocallService.room) {
        try {
          this.addTranscriptMessage('System', 'Starting live transcription...');

          await this.transcriptionService.startTranscriptionForCall(
            this.videocallService.room
          );
          this.isTranscriptionActive = true;
          this.showTranscript = true; // Show transcript when starting
          this.addTranscriptMessage(
            'System',
            'Live transcription started successfully'
          );
        } catch (error) {
          console.error('Error starting transcription:', error);

          // More detailed error handling
          let errorMessage = 'Failed to start transcription';
          if (error instanceof Error) {
            if (error.message.includes('API Key')) {
              errorMessage =
                'Transcription service not available - API key missing';
            } else if (error.message.includes('connection')) {
              errorMessage = 'Could not connect to transcription service';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Transcription service connection timeout';
            } else {
              errorMessage = `Transcription error: ${error.message}`;
            }
          }

          this.addTranscriptMessage('System', errorMessage);
          this.isTranscriptionActive = false;
        }
      } else {
        this.addTranscriptMessage('System', 'No active call to transcribe');
      }
    }
  }
}
