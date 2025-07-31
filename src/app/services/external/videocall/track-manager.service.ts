import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Room,
  LocalVideoTrack,
  RemoteVideoTrack,
  LocalAudioTrack,
  RemoteAudioTrack,
  Track,
  Participant,
} from 'livekit-client';

@Injectable({
  providedIn: 'root',
})
export class TrackManagerService {
  // Observables for video tracks
  localVideoTrack$ = new BehaviorSubject<LocalVideoTrack | null>(null);
  remoteVideoTracks$ = new BehaviorSubject<Map<string, RemoteVideoTrack>>(
    new Map()
  );

  // Observables for audio tracks
  localAudioTrack$ = new BehaviorSubject<LocalAudioTrack | null>(null);
  remoteAudioTracks$ = new BehaviorSubject<Map<string, RemoteAudioTrack>>(
    new Map()
  );

  setupTrackEventListeners(room: Room): void {
    if (!room) return;

    // Listen for when local participant publishes tracks
    room.on('localTrackPublished', (publication) => {
      this.handleLocalTrackPublished(publication);
    });

    // Listen for when remote participants publish/unpublish tracks
    room.on('trackSubscribed', (track, publication, participant) => {
      this.handleTrackSubscribed(track, publication, participant);
    });

    room.on('trackUnsubscribed', (track, publication, participant) => {
      this.handleTrackUnsubscribed(track, publication, participant);
    });
  }

  private handleLocalTrackPublished(publication: any): void {
    if (!publication.track) return;

    if (publication.track.kind === 'video') {
      this.localVideoTrack$.next(publication.track as LocalVideoTrack);
    }

    if (publication.track.kind === 'audio') {
      this.localAudioTrack$.next(publication.track as LocalAudioTrack);
    }
  }

  private handleTrackSubscribed(
    track: any,
    publication: any,
    participant: Participant
  ): void {
    console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);

    if (track.kind === 'video') {
      this.updateRemoteVideoTrack(
        participant.identity,
        track as RemoteVideoTrack
      );
    }

    if (track.kind === 'audio') {
      this.updateRemoteAudioTrack(
        participant.identity,
        track as RemoteAudioTrack
      );
    }
  }

  private handleTrackUnsubscribed(
    track: any,
    publication: any,
    participant: Participant
  ): void {
    console.log(
      `Track unsubscribed: ${track.kind} from ${participant.identity}`
    );

    if (track.kind === 'video') {
      this.removeRemoteVideoTrack(participant.identity);
    }

    if (track.kind === 'audio') {
      this.removeRemoteAudioTrack(participant.identity);
    }
  }

  private updateRemoteVideoTrack(
    identity: string,
    track: RemoteVideoTrack
  ): void {
    const currentTracks = this.remoteVideoTracks$.value;
    currentTracks.set(identity, track);
    this.remoteVideoTracks$.next(new Map(currentTracks));
    console.log(
      'Updated remote video tracks:',
      Array.from(currentTracks.keys())
    );
  }

  private updateRemoteAudioTrack(
    identity: string,
    track: RemoteAudioTrack
  ): void {
    const currentTracks = this.remoteAudioTracks$.value;
    currentTracks.set(identity, track);
    this.remoteAudioTracks$.next(new Map(currentTracks));
    console.log(
      'Updated remote audio tracks:',
      Array.from(currentTracks.keys())
    );
  }

  private removeRemoteVideoTrack(identity: string): void {
    const currentTracks = this.remoteVideoTracks$.value;
    currentTracks.delete(identity);
    this.remoteVideoTracks$.next(new Map(currentTracks));
    console.log(
      'Updated remote video tracks:',
      Array.from(currentTracks.keys())
    );
  }

  private removeRemoteAudioTrack(identity: string): void {
    const currentTracks = this.remoteAudioTracks$.value;
    currentTracks.delete(identity);
    this.remoteAudioTracks$.next(new Map(currentTracks));
    console.log(
      'Updated remote audio tracks:',
      Array.from(currentTracks.keys())
    );
  }

  async enableCameraAndMicrophone(room: Room): Promise<void> {
    if (!room) {
      throw new Error('Room is not initialized');
    }

    const localParticipant = room.localParticipant;
    await localParticipant.enableCameraAndMicrophone();

    // Get and emit local tracks
    this.captureLocalTracks(localParticipant);
  }

  private captureLocalTracks(localParticipant: any): void {
    // Get the local video track and emit it
    const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera)
      ?.track as LocalVideoTrack;
    if (videoTrack) {
      this.localVideoTrack$.next(videoTrack);
    }

    // Get the local audio track and emit it
    const audioTrack = localParticipant.getTrackPublication(
      Track.Source.Microphone
    )?.track as LocalAudioTrack;
    if (audioTrack) {
      this.localAudioTrack$.next(audioTrack);
    }
  }

  syncExistingTracks(room: Room): void {
    if (!room) return;

    const existingVideoTracks = new Map<string, RemoteVideoTrack>();
    const existingAudioTracks = new Map<string, RemoteAudioTrack>();

    room.remoteParticipants.forEach((participant, identity) => {
      // Check for existing video tracks
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.track && publication.isSubscribed) {
          console.log('Found existing video track for:', identity);
          existingVideoTracks.set(
            identity,
            publication.track as RemoteVideoTrack
          );
        }
      });

      // Check for existing audio tracks
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track && publication.isSubscribed) {
          console.log('Found existing audio track for:', identity);
          existingAudioTracks.set(
            identity,
            publication.track as RemoteAudioTrack
          );
        }
      });
    });

    this.remoteVideoTracks$.next(existingVideoTracks);
    this.remoteAudioTracks$.next(existingAudioTracks);
  }

  async disableCameraAndMicrophone(room: Room): Promise<void> {
    if (!room) return;

    const localParticipant = room.localParticipant;
    await localParticipant.setCameraEnabled(false);
    await localParticipant.setMicrophoneEnabled(false);
  }

  async enableVideo(): Promise<void> {
    // This method would require access to the room, but we can add it later if needed
    console.log('Enable video called - implement with room reference');
  }

  async disableVideo(): Promise<void> {
    // This method would require access to the room, but we can add it later if needed
    console.log('Disable video called - implement with room reference');
  }

  async enableAudio(): Promise<void> {
    // This method would require access to the room, but we can add it later if needed
    console.log('Enable audio called - implement with room reference');
  }

  async disableAudio(): Promise<void> {
    // This method would require access to the room, but we can add it later if needed
    console.log('Disable audio called - implement with room reference');
  }

  clearAllTracks(): void {
    this.localVideoTrack$.next(null);
    this.localAudioTrack$.next(null);
    this.remoteVideoTracks$.next(new Map());
    this.remoteAudioTracks$.next(new Map());
  }

  // Getter methods
  getLocalVideoTrack(): LocalVideoTrack | null {
    return this.localVideoTrack$.value;
  }

  getLocalAudioTrack(): LocalAudioTrack | null {
    return this.localAudioTrack$.value;
  }

  getRemoteVideoTracks(): Map<string, RemoteVideoTrack> {
    return this.remoteVideoTracks$.value;
  }

  getRemoteAudioTracks(): Map<string, RemoteAudioTrack> {
    return this.remoteAudioTracks$.value;
  }
}
