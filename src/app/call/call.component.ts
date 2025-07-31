import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideocallService } from '../services/external/videocall/videocall.service';
import { Subscription } from 'rxjs';
import { Participant } from 'livekit-client';

interface TranscriptMessage {
  sender: string;
  text: string;
  timestamp: Date;
}

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

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videocallService: VideocallService
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

    // TODO: Set up real-time transcription service integration
    this.setupTranscriptListeners();
  }

  ngOnDestroy() {
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

  private setupTranscriptListeners() {
    // TODO: Integrate with real transcription service
    // This is a placeholder for future transcription integration

    // For now, we can simulate transcript updates when participants join/leave
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
}
