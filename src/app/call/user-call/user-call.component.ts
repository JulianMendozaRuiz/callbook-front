import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { VideocallService } from '../../services/external/videocall/videocall.service';
import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';

@Component({
  selector: 'app-user-call',
  standalone: false,
  templateUrl: './user-call.component.html',
  styleUrl: './user-call.component.css',
})
export class UserCallComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() userName: string = '';
  @Input() isMicOn: boolean = true;
  @Input() isCameraOn: boolean = true;
  @Input() showTranscript: boolean = true;
  @Input() isLocalUser: boolean = false; // New input to distinguish local vs remote user
  @Input() participantIdentity: string = ''; // For remote users to identify specific participant

  @ViewChild('videoElement', { static: false })
  videoElement!: ElementRef<HTMLVideoElement>;

  private subscriptions: Subscription[] = [];

  constructor(private videocallService: VideocallService) {}

  ngOnInit() {
    // Set username based on current call if not provided
    if (!this.userName && this.isLocalUser) {
      this.userName = this.videocallService.currentCall?.username || 'You';
    }

    // Subscribe to video track changes
    if (this.isLocalUser) {
      const localSub = this.videocallService.localVideoTrack$.subscribe(
        (track) => {
          if (track && this.videoElement) {
            this.attachVideoTrack(track);
          }
        }
      );
      this.subscriptions.push(localSub);
    } else {
      // For remote users, handle specific participant tracks
      const remoteSub = this.videocallService.remoteVideoTracks$.subscribe(
        (tracks) => {
          console.log(
            `Remote tracks updated for ${this.userName}. Available tracks:`,
            Array.from(tracks.keys())
          );
          if (this.participantIdentity) {
            // Get track for specific participant
            const track = tracks.get(this.participantIdentity);
            if (track && this.videoElement) {
              console.log(
                `Found track for participant ${this.participantIdentity}`
              );
              this.attachVideoTrack(track);
            } else {
              console.log(
                `No track found for participant ${this.participantIdentity}`
              );
            }
          } else {
            // Fallback: Get the first remote track
            const firstTrack = Array.from(tracks.values())[0];
            if (firstTrack && this.videoElement) {
              console.log('Using first available remote track');
              this.attachVideoTrack(firstTrack);
            }
          }
        }
      );
      this.subscriptions.push(remoteSub);
    }
  }

  ngAfterViewInit() {
    // Try to attach existing tracks after view init
    if (this.isLocalUser) {
      const localTrack = this.videocallService.getLocalVideoTrack();
      if (localTrack) {
        this.attachVideoTrack(localTrack);
      }
    } else {
      // For remote users, try to attach existing remote tracks
      const remoteTracks = this.videocallService.getRemoteVideoTracks();
      if (this.participantIdentity) {
        const track = remoteTracks.get(this.participantIdentity);
        if (track) {
          this.attachVideoTrack(track);
        }
      } else {
        // Fallback: Get the first remote track
        const firstTrack = Array.from(remoteTracks.values())[0];
        if (firstTrack) {
          this.attachVideoTrack(firstTrack);
        }
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private attachVideoTrack(track: LocalVideoTrack | RemoteVideoTrack) {
    if (this.videoElement?.nativeElement) {
      console.log(
        `Attaching video track for ${
          this.isLocalUser ? 'local' : 'remote'
        } user: ${this.userName}`
      );
      track.attach(this.videoElement.nativeElement);
    } else {
      console.warn(`Video element not available for ${this.userName}`);
    }
  }
}
