import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VideocallService } from '../services/external/videocall/videocall.service';
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
}
