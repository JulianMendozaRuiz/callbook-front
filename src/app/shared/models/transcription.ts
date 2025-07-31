export interface TranscriptionTokenRequest {
  expiresIn: number | null;
}

export interface TranscriptionTokenResponse {
  token: string;
  expires_in: number;
}

export interface TranscriptionResult {
  text: string;
  participantId: string;
  participantName: string;
  timestamp: Date;
  isFinal: boolean;
}

export interface TranscriptionEvent {
  type: 'turn' | 'partial' | 'error' | 'open' | 'close';
  data: any;
}

export interface TranscriptMessage {
  sender: string;
  text: string;
  timestamp: Date;
}
