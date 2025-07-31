export interface TranscriptionRequest {
  expiresIn: number | null;
}

export interface TranscriptionResponse {
  token: string;
  expires_in: number;
}
