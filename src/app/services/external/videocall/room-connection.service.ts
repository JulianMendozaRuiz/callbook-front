import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Room, RoomOptions, VideoPresets } from 'livekit-client';
import { environment } from '../../../../environments/environment';
import {
  VideoCallRequest,
  VideoCallResponse,
} from '../../../shared/models/videocall';

@Injectable({
  providedIn: 'root',
})
export class RoomConnectionService {
  private _room: Room | null = null;
  private roomState$ = new BehaviorSubject<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  private currentCallId$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {}

  get room(): Room | null {
    return this._room;
  }

  get roomState() {
    return this.roomState$.asObservable();
  }

  get currentCallId() {
    return this.currentCallId$.asObservable();
  }

  getCurrentCallId(): string | null {
    return this.currentCallId$.value;
  }

  async connectToRoom(callId: string, username: string): Promise<Room> {
    if (this._room?.state === 'connected') {
      await this.disconnectFromRoom();
    }

    this.roomState$.next('connecting');
    this.currentCallId$.next(callId);

    try {
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      };

      this._room = new Room(roomOptions);

      const token = await this.fetchRoomToken(callId, username);
      const url = environment.livekitUrl;

      await this._room.connect(url, token);

      this.roomState$.next('connected');

      return this._room;
    } catch (error) {
      console.error('Failed to connect to room:', error);
      this.roomState$.next('disconnected');
      this.currentCallId$.next(null);
      throw error;
    }
  }

  async disconnectFromRoom(): Promise<void> {
    if (this._room) {
      await this._room.disconnect();
      this._room = null;
    }

    this.roomState$.next('disconnected');
    this.currentCallId$.next(null);
  }

  private async fetchRoomToken(
    callId: string,
    username: string
  ): Promise<string> {
    try {
      const requestBody: VideoCallRequest = {
        username: username,
        room_id: callId,
      };

      const response = await firstValueFrom(
        this.http.post<VideoCallResponse>(
          `${environment.apiUrl}/videocall/join-call`,
          requestBody
        )
      );

      return response.token;
    } catch (error) {
      console.error('Failed to fetch room token:', error);
      throw new Error('Failed to fetch room token');
    }
  }

  async createRoom(username: string): Promise<VideoCallResponse> {
    try {
      const requestBody: VideoCallRequest = {
        username: username,
      };

      const response = await firstValueFrom(
        this.http.post<VideoCallResponse>(
          `${environment.apiUrl}/videocall/create-call`,
          requestBody
        )
      );

      return response;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw new Error('Failed to create room');
    }
  }

  async joinExistingRoom(callId: string, username: string): Promise<Room> {
    return this.connectToRoom(callId, username);
  }

  isConnected(): boolean {
    return this._room?.state === 'connected';
  }

  getRoomState(): 'disconnected' | 'connecting' | 'connected' {
    return this.roomState$.value;
  }
}
