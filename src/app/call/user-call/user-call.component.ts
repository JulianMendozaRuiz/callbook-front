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
import {
  LocalVideoTrack,
  RemoteVideoTrack,
  LocalAudioTrack,
  RemoteAudioTrack,
} from 'livekit-client';

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
  @Input() isLocalUser: boolean = false; // New input to distinguish local vs remote user
  @Input() participantIdentity: string = ''; // For remote users to identify specific participant

  @ViewChild('videoElement', { static: false })
  videoElement!: ElementRef<HTMLVideoElement>;

  @ViewChild('audioElement', { static: false })
  audioElement!: ElementRef<HTMLAudioElement>;

  private subscriptions: Subscription[] = [];

  constructor(private videocallService: VideocallService) {}

  ngOnInit() {
    this.initializeUsername();
    this.setupTrackSubscriptions();
  }

  private initializeUsername(): void {
    if (!this.userName && this.isLocalUser) {
      this.userName = this.videocallService.currentCall?.username || 'You';
    }
  }

  private setupTrackSubscriptions(): void {
    if (this.isLocalUser) {
      this.setupLocalTrackSubscriptions();
    } else {
      this.setupRemoteTrackSubscriptions();
    }
  }

  private setupLocalTrackSubscriptions(): void {
    const localVideoSub = this.videocallService.localVideoTrack$.subscribe(
      (track) => {
        if (track && this.videoElement) {
          this.attachVideoTrack(track);
        }
      }
    );

    const localAudioSub = this.videocallService.localAudioTrack$.subscribe(
      (track) => {
        if (track && this.audioElement) {
          this.attachAudioTrack(track);
        }
      }
    );

    this.subscriptions.push(localVideoSub, localAudioSub);
  }

  private setupRemoteTrackSubscriptions(): void {
    const remoteVideoSub = this.setupRemoteVideoSubscription();
    const remoteAudioSub = this.setupRemoteAudioSubscription();

    this.subscriptions.push(remoteVideoSub, remoteAudioSub);
  }

  private setupRemoteVideoSubscription(): Subscription {
    return this.videocallService.remoteVideoTracks$.subscribe((tracks) => {
      const track =
        this.getParticipantTrack(tracks) || this.getFirstAvailableTrack(tracks);

      if (track && this.videoElement) {
        this.attachVideoTrack(track);
      }
    });
  }

  private setupRemoteAudioSubscription(): Subscription {
    return this.videocallService.remoteAudioTracks$.subscribe((tracks) => {
      const track =
        this.getParticipantTrack(tracks) || this.getFirstAvailableTrack(tracks);

      if (track && this.audioElement) {
        this.attachAudioTrack(track);
      }
    });
  }

  private getParticipantTrack<T>(tracks: Map<string, T>): T | undefined {
    return this.participantIdentity
      ? tracks.get(this.participantIdentity)
      : undefined;
  }

  private getFirstAvailableTrack<T>(tracks: Map<string, T>): T | undefined {
    return Array.from(tracks.values())[0];
  }

  ngAfterViewInit() {
    this.attachExistingTracks();
  }

  private attachExistingTracks(): void {
    if (this.isLocalUser) {
      this.attachExistingLocalTracks();
    } else {
      this.attachExistingRemoteTracks();
    }
  }

  private attachExistingLocalTracks(): void {
    const localVideoTrack = this.videocallService.getLocalVideoTrack();
    if (localVideoTrack) {
      this.attachVideoTrack(localVideoTrack);
    }

    const localAudioTrack = this.videocallService.getLocalAudioTrack();
    if (localAudioTrack) {
      this.attachAudioTrack(localAudioTrack);
    }
  }

  private attachExistingRemoteTracks(): void {
    const remoteVideoTracks = this.videocallService.getRemoteVideoTracks();
    const remoteAudioTracks = this.videocallService.getRemoteAudioTracks();

    this.attachExistingRemoteTracksByType(remoteVideoTracks, 'video');
    this.attachExistingRemoteTracksByType(remoteAudioTracks, 'audio');
  }

  private attachExistingRemoteTracksByType<
    T extends RemoteVideoTrack | RemoteAudioTrack
  >(tracks: Map<string, T>, trackType: 'video' | 'audio'): void {
    const track =
      this.getParticipantTrack(tracks) || this.getFirstAvailableTrack(tracks);

    if (track) {
      if (trackType === 'video') {
        this.attachVideoTrack(track as RemoteVideoTrack);
      } else {
        this.attachAudioTrack(track as RemoteAudioTrack);
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private attachVideoTrack(track: LocalVideoTrack | RemoteVideoTrack): void {
    if (!this.videoElement?.nativeElement) {
      console.warn(`Video element not available for ${this.userName}`);
      return;
    }

    try {
      track.attach(this.videoElement.nativeElement);
    } catch (error) {
      console.error(
        `Failed to attach video track for ${this.userName}:`,
        error
      );
    }
  }

  private attachAudioTrack(track: LocalAudioTrack | RemoteAudioTrack): void {
    if (!this.audioElement?.nativeElement) {
      console.warn(`Audio element not available for ${this.userName}`);
      return;
    }

    try {
      track.attach(this.audioElement.nativeElement);
    } catch (error) {
      console.error(
        `Failed to attach audio track for ${this.userName}:`,
        error
      );
    }
  }
}
