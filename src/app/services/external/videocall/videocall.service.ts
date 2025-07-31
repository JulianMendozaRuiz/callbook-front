import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

import {
  Room,
  LocalVideoTrack,
  RemoteVideoTrack,
  LocalAudioTrack,
  RemoteAudioTrack,
  Participant,
} from 'livekit-client';
import { Call } from '../../../shared/models';
import { TrackManagerService } from './track-manager.service';
import { ParticipantManagerService } from './participant-manager.service';
import { RoomConnectionService } from './room-connection.service';

@Injectable({
  providedIn: 'root',
})
export class VideocallService {
  private baseUrl = environment.apiUrl;
  currentCall: Call | null = null;

  constructor(
    private trackManager: TrackManagerService,
    private participantManager: ParticipantManagerService,
    private roomConnection: RoomConnectionService
  ) {}

  // Expose observables from the services
  get localVideoTrack$(): Observable<LocalVideoTrack | null> {
    return this.trackManager.localVideoTrack$;
  }

  get remoteVideoTracks$(): Observable<Map<string, RemoteVideoTrack>> {
    return this.trackManager.remoteVideoTracks$;
  }

  get localAudioTrack$(): Observable<LocalAudioTrack | null> {
    return this.trackManager.localAudioTrack$;
  }

  get remoteAudioTracks$(): Observable<Map<string, RemoteAudioTrack>> {
    return this.trackManager.remoteAudioTracks$;
  }

  get participants$(): Observable<Map<string, Participant>> {
    return this.participantManager.participants$;
  }

  get room(): Room | null {
    return this.roomConnection.room;
  }

  /**
   * Test that the API is reachable using fetch API (native promises)
   * Health check endpoint is at the root "/"
   * @returns Promise<any>
   */
  async healthCheck(): Promise<any> {
    console.log('base url', this.baseUrl);

    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Health check response:', data);
      return data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async createRoom(username: string): Promise<any> {
    try {
      return await this.roomConnection.createRoom(username);
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async createAndJoinRoom(username: string): Promise<void> {
    try {
      // First create the room
      const roomResponse = await this.roomConnection.createRoom(username);

      // Then connect to the created room
      const room = await this.roomConnection.connectToRoom(
        roomResponse.room_id,
        username
      );

      // Set up event listeners for the connected room
      this.trackManager.setupTrackEventListeners(room);
      this.participantManager.setupParticipantEventListeners(room);

      this.currentCall = {
        id: roomResponse.identity,
        username: username,
        room_id: roomResponse.room_id,
        token: roomResponse.token,
      };

      console.log(
        'Created and connected to LiveKit room:',
        roomResponse.room_id
      );

      // After connecting, sync existing participants and their tracks
      this.syncExistingParticipants();
    } catch (error) {
      console.error('Error creating and joining room:', error);
      throw error;
    }
  }

  async joinRoom(callId: string, username: string): Promise<void> {
    try {
      // Connect to the room using RoomConnectionService
      const room = await this.roomConnection.connectToRoom(callId, username);

      // Set up event listeners for the connected room
      this.trackManager.setupTrackEventListeners(room);
      this.participantManager.setupParticipantEventListeners(room);

      this.currentCall = {
        id: username,
        username: username,
        room_id: callId,
        token: '', // Token is handled internally by RoomConnectionService
      };

      console.log('Connected to LiveKit room:', callId);

      // After connecting, sync existing participants and their tracks
      this.syncExistingParticipants();
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async publishVideoAndAudio(): Promise<void> {
    if (!this.roomConnection.room) {
      throw new Error('Room is not initialized');
    }

    try {
      const localParticipant = this.roomConnection.room.localParticipant;

      // Enable camera and microphone
      await localParticipant.enableCameraAndMicrophone();

      // The tracks will be automatically updated through event listeners
      console.log('Video and audio publishing enabled');
    } catch (error) {
      console.error('Error publishing video and audio:', error);
      throw error;
    }
  }

  // Getter methods that delegate to the appropriate services
  getLocalVideoTrack(): LocalVideoTrack | null {
    return this.trackManager.getLocalVideoTrack();
  }

  getLocalAudioTrack(): LocalAudioTrack | null {
    return this.trackManager.getLocalAudioTrack();
  }

  getRemoteVideoTracks(): Map<string, RemoteVideoTrack> {
    return this.trackManager.getRemoteVideoTracks();
  }

  getRemoteAudioTracks(): Map<string, RemoteAudioTrack> {
    return this.trackManager.getRemoteAudioTracks();
  }

  getParticipants(): Map<string, Participant> {
    return this.participantManager.getParticipants();
  }

  getCurrentUsername(): string {
    return this.currentCall?.username || 'Unknown User';
  }

  private syncExistingParticipants(): void {
    if (!this.roomConnection.room) return;

    // Delegate to the appropriate services
    this.participantManager.syncExistingParticipants(this.roomConnection.room);
    this.trackManager.syncExistingTracks(this.roomConnection.room);
  }

  async leaveRoom(): Promise<void> {
    try {
      if (this.roomConnection.room) {
        const localParticipant = this.roomConnection.room.localParticipant;

        // Disable camera and microphone before leaving
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setMicrophoneEnabled(false);
      }

      // Disconnect from the room
      await this.roomConnection.disconnectFromRoom();

      // Clean up all services
      this.trackManager.clearAllTracks();
      this.participantManager.clearParticipants();

      this.currentCall = null;
    } catch (error) {
      console.error('Error leaving room:', error);

      // Still clean up even if there's an error
      this.trackManager.clearAllTracks();
      this.participantManager.clearParticipants();
      this.currentCall = null;

      throw error;
    }
  }

  // Audio/Video control methods - delegate to TrackManagerService
  async enableVideo(): Promise<void> {
    await this.trackManager.enableVideo();
  }

  async disableVideo(): Promise<void> {
    await this.trackManager.disableVideo();
  }

  async enableAudio(): Promise<void> {
    await this.trackManager.enableAudio();
  }

  async disableAudio(): Promise<void> {
    await this.trackManager.disableAudio();
  }
}
