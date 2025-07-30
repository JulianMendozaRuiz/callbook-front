export interface VideoCallRequest {
  username: string;
  room_id?: string;
  identity?: string;
}

export interface VideoCallResponse {
  token: string;
  room_id: string;
  identity: string;
  username: string;
}

export interface TokenResult {
  /** Result of token creation for LiveKit video calls */
  identity: string;
  token: string;
  room_id: string;
}

export interface Call {
  id: string;
  username: string;
  room_id: string;
  token: string;
}
