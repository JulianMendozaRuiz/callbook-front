import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

import {
  Room,
  LocalVideoTrack,
  RemoteVideoTrack,
  Participant,
  Track,
} from 'livekit-client';
import {
  Call,
  VideoCallRequest,
  VideoCallResponse,
} from '../../../shared/models';

@Injectable({
  providedIn: 'root',
})
export class VideocallService {
  private baseUrl = environment.apiUrl;
  private livekitUrl = environment.livekitUrl;

  room: Room | null = null; // LiveKit room instance
  currentCall: Call | null = null; // Current call details

  // Observables for video tracks
  localVideoTrack$ = new BehaviorSubject<LocalVideoTrack | null>(null);
  remoteVideoTracks$ = new BehaviorSubject<Map<string, RemoteVideoTrack>>(
    new Map()
  );
  participants$ = new BehaviorSubject<Map<string, Participant>>(new Map());

  constructor() {
    this.room = new Room();
    this.setupRoomEventListeners();
  }

  private setupRoomEventListeners() {
    if (!this.room) return;

    // Listen for when local participant publishes video
    this.room.on('localTrackPublished', (publication) => {
      if (publication.track && publication.track.kind === 'video') {
        this.localVideoTrack$.next(publication.track as LocalVideoTrack);
      }
    });

    // Listen for when remote participants join/leave or publish video
    this.room.on('trackSubscribed', (track, publication, participant) => {
      console.log(
        `Track subscribed: ${track.kind} from ${participant.identity}`
      );
      if (track.kind === 'video') {
        const currentTracks = this.remoteVideoTracks$.value;
        currentTracks.set(participant.identity, track as RemoteVideoTrack);
        this.remoteVideoTracks$.next(new Map(currentTracks));
        console.log(
          'Updated remote video tracks:',
          Array.from(currentTracks.keys())
        );
      }
    });

    this.room.on('trackUnsubscribed', (track, publication, participant) => {
      console.log(
        `Track unsubscribed: ${track.kind} from ${participant.identity}`
      );
      if (track.kind === 'video') {
        const currentTracks = this.remoteVideoTracks$.value;
        currentTracks.delete(participant.identity);
        this.remoteVideoTracks$.next(new Map(currentTracks));
        console.log(
          'Updated remote video tracks:',
          Array.from(currentTracks.keys())
        );
      }
    });

    // Listen for participant events
    this.room.on('participantConnected', (participant) => {
      console.log('Participant connected:', participant.identity);
      const currentParticipants = this.participants$.value;
      currentParticipants.set(participant.identity, participant);
      this.participants$.next(new Map(currentParticipants));
    });

    this.room.on('participantDisconnected', (participant) => {
      console.log('Participant disconnected:', participant.identity);
      const currentParticipants = this.participants$.value;
      currentParticipants.delete(participant.identity);
      this.participants$.next(new Map(currentParticipants));
    });
  }

  /**
   * Test that the API is reachable using fetch API (native promises)
   * Health check endpoint is at the root "/"
   * @returns Promise<any>
   */
  async healthCheck(): Promise<any> {
    console.log('base url', this.baseUrl);

    try {
      const response = await fetch(`${this.baseUrl}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response;
      return data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async createRoomAndJoin(username: string) {
    try {
      // If room is null (after leaving), create a new one
      if (!this.room) {
        this.room = new Room();
        this.setupRoomEventListeners();
      }

      // If already connected to a room, disconnect first
      if (this.room.state === 'connected') {
        console.log('Already connected to a room, disconnecting first...');
        await this.leaveRoom();
        // Recreate room after leaving
        this.room = new Room();
        this.setupRoomEventListeners();
      }

      const req: VideoCallRequest = {
        username,
      };

      const apiResponse = await fetch(`${this.baseUrl}/videocall/create-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

      const data = (await apiResponse.json()) as VideoCallResponse;

      this.currentCall = {
        id: data.identity,
        username: data.username,
        room_id: data.room_id,
        token: data.token,
      };

      const connectionResult = await this.room.connect(
        this.livekitUrl,
        this.currentCall.token
      );

      console.log('Connected to LiveKit room:', connectionResult);

      // After connecting, check for existing participants and their tracks
      this.syncExistingParticipants();
    } catch (error) {
      console.error('Error creating room and joining:', error);
      throw error;
    }
  }

  async joinRoom(callId: string, username: string) {
    try {
      // If room is null (after leaving), create a new one
      if (!this.room) {
        this.room = new Room();
        this.setupRoomEventListeners();
      }

      // If already connected to a room, disconnect first
      if (this.room.state === 'connected') {
        console.log('Already connected to a room, disconnecting first...');
        await this.leaveRoom();
        // Recreate room after leaving
        this.room = new Room();
        this.setupRoomEventListeners();
      }

      const req: VideoCallRequest = {
        room_id: callId,
        username,
      };

      const apiResponse = await fetch(`${this.baseUrl}/videocall/join-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      if (!apiResponse.ok) {
        throw new Error(`HTTP error! status: ${apiResponse.status}`);
      }

      const data = (await apiResponse.json()) as VideoCallResponse;

      this.currentCall = {
        id: data.identity,
        username: data.username,
        room_id: data.room_id,
        token: data.token,
      };

      const connectionResult = await this.room.connect(
        this.livekitUrl,
        this.currentCall.token
      );

      console.log('Connected to LiveKit room:', connectionResult);

      // After connecting, check for existing participants and their tracks
      this.syncExistingParticipants();
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async publishVideoAndAudio() {
    if (!this.room) {
      throw new Error('Room is not initialized');
    }

    try {
      const localParticipant = this.room.localParticipant;

      // Enable camera and microphone
      await localParticipant.enableCameraAndMicrophone();

      // Get the local video track and emit it
      const videoTrack = localParticipant.getTrackPublication(
        Track.Source.Camera
      )?.track as LocalVideoTrack;
      if (videoTrack) {
        this.localVideoTrack$.next(videoTrack);
      }
    } catch (error) {
      console.error('Error publishing video and audio:', error);
      throw error;
    }
  }

  getLocalVideoTrack(): LocalVideoTrack | null {
    return this.localVideoTrack$.value;
  }

  getRemoteVideoTracks(): Map<string, RemoteVideoTrack> {
    return this.remoteVideoTracks$.value;
  }

  getParticipants(): Map<string, Participant> {
    return this.participants$.value;
  }

  getCurrentUsername(): string {
    return this.currentCall?.username || 'Unknown User';
  }

  private syncExistingParticipants() {
    if (!this.room) return;

    // Get all existing participants in the room
    const existingParticipants = new Map<string, Participant>();
    const existingVideoTracks = new Map<string, RemoteVideoTrack>();

    // Add all remote participants
    this.room.remoteParticipants.forEach((participant, identity) => {
      console.log('Found existing participant:', identity);
      existingParticipants.set(identity, participant);

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
    });

    // Update observables with existing data
    this.participants$.next(existingParticipants);
    this.remoteVideoTracks$.next(existingVideoTracks);
  }

  async leaveRoom() {
    if (this.room) {
      try {
        const localParticipant = this.room.localParticipant;

        // Disable camera and microphone before leaving
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setMicrophoneEnabled(false);

        // Disconnect from the room
        await this.room.disconnect();

        // Clean up observables
        this.localVideoTrack$.next(null);
        this.remoteVideoTracks$.next(new Map());
        this.participants$.next(new Map());

        this.room = null;
        this.currentCall = null;
      } catch (error) {
        console.error('Error leaving room:', error);
        // Still clean up even if there's an error
        this.localVideoTrack$.next(null);
        this.remoteVideoTracks$.next(new Map());
        this.participants$.next(new Map());
        this.room = null;
        this.currentCall = null;
        throw error;
      }
    }
  }
}
