import { Injectable } from '@angular/core';
import {
  Room,
  LocalAudioTrack,
  RemoteAudioTrack,
  Participant,
  Track,
} from 'livekit-client';
import { TranscriberService } from './transcriber.service';

@Injectable({
  providedIn: 'root',
})
export class AudioProcessorService {
  private audioContext: AudioContext | null = null;
  private processors: Map<string, AudioWorkletNode | AnalyserNode> = new Map();
  private audioBuffers: Map<string, Float32Array[]> = new Map();
  private participantNames: Map<string, string> = new Map(); // Store participant names

  constructor(private transcriberService: TranscriberService) {}

  async startProcessingRoom(room: Room): Promise<void> {
    // Start processing audio from local participant
    await this.processLocalAudio(room);

    // Start processing audio from existing remote participants
    room.remoteParticipants.forEach((participant) => {
      this.processRemoteParticipantAudio(participant);
    });

    // Listen for new remote participants
    room.on('participantConnected', (participant) => {
      this.processRemoteParticipantAudio(participant);
    });

    // Listen for participants disconnecting
    room.on('participantDisconnected', (participant) => {
      this.stopProcessingParticipantAudio(participant.identity);
    });
  }

  async stopProcessingRoom(): Promise<void> {
    // Stop all audio processors
    this.processors.forEach((processor, participantId) => {
      // Clear audio processing handlers for ScriptProcessorNodes
      if ('onaudioprocess' in processor) {
        (processor as unknown as ScriptProcessorNode).onaudioprocess = null;
      }
      processor.disconnect();
    });
    this.processors.clear();

    // Clear audio buffers
    this.audioBuffers.clear();

    // Clear participant names
    this.participantNames.clear();

    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  private async processLocalAudio(room: Room): Promise<void> {
    const localParticipant = room.localParticipant;

    const audioTrack = localParticipant.getTrackPublication(
      Track.Source.Microphone
    )?.track as LocalAudioTrack;

    if (audioTrack && audioTrack.mediaStreamTrack) {
      await this.processAudioTrack(
        audioTrack.mediaStreamTrack,
        'local',
        localParticipant.name || localParticipant.identity || 'You'
      );
    }
  }

  private async processRemoteParticipantAudio(
    participant: Participant
  ): Promise<void> {
    participant.audioTrackPublications.forEach(async (publication) => {
      if (publication.track && publication.isSubscribed) {
        const audioTrack = publication.track as RemoteAudioTrack;
        if (audioTrack.mediaStreamTrack) {
          await this.processAudioTrack(
            audioTrack.mediaStreamTrack,
            participant.identity,
            participant.name || participant.identity
          );
        }
      }
    });
  }

  private async processAudioTrack(
    mediaStreamTrack: MediaStreamTrack,
    participantId: string,
    participantName: string
  ): Promise<void> {
    if (!this.audioContext) {
      // Set sample rate to 16kHz as required by AssemblyAI
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }

    const mediaStream = new MediaStream([mediaStreamTrack]);
    const source = this.audioContext.createMediaStreamSource(mediaStream);

    // Create a ScriptProcessorNode for real-time audio processing
    // Use 1024 samples (64ms at 16kHz) for 50ms chunks as recommended
    const scriptProcessor = this.audioContext.createScriptProcessor(1024, 1, 1);

    // Connect source to script processor
    source.connect(scriptProcessor);
    scriptProcessor.connect(this.audioContext.destination);

    // Store the script processor and participant info for transcription
    this.processors.set(participantId, scriptProcessor as any);

    // Store participant name for later use in transcription
    this.participantNames.set(participantId, participantName);
    if (!this.audioBuffers.has(participantId)) {
      this.audioBuffers.set(participantId, []);
    }

    this.setupRealTimeAudioProcessing(
      scriptProcessor,
      participantId,
      participantName
    );
  }

  private setupRealTimeAudioProcessing(
    scriptProcessor: ScriptProcessorNode,
    participantId: string,
    participantName: string
  ): void {
    let firstAudioSent = false;
    let audioChunkCount = 0;

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      if (
        !this.transcriberService.transcriber ||
        !this.processors.has(participantId)
      ) {
        // Disconnect if transcriber is closed or processor removed
        scriptProcessor.disconnect();
        return;
      }

      // Get input audio data (single channel, mono)
      const inputBuffer = audioProcessingEvent.inputBuffer;
      const inputData = inputBuffer.getChannelData(0); // Get mono channel

      // Check if there's actual audio activity (not just silence)
      const hasAudio = inputData.some((sample) => Math.abs(sample) > 0.005);

      // Calculate audio level for logging
      const audioLevel = Math.max(
        ...inputData.map((sample) => Math.abs(sample))
      );

      // Convert Float32Array to Int16Array for AssemblyAI (PCM16 encoding)
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp values to prevent overflow and convert to 16-bit PCM
        const sample = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = sample * 32767;
      }

      // Set current participant context before sending audio
      this.transcriberService.setCurrentParticipant(
        participantId,
        participantName
      );

      // Send audio chunk to AssemblyAI
      try {
        this.transcriberService.transcriber!.sendAudio(int16Data.buffer);
        audioChunkCount++;

        if (!firstAudioSent) {
          firstAudioSent = true;
        }

        // Log every 16 chunks (~1 second at 64ms per chunk) to confirm continuous sending
        if (audioChunkCount % 16 === 0) {
          // Check for connection issues
          if (!this.transcriberService.isConnected) {
            console.warn(
              `⚠️ Connection lost after ${audioChunkCount} chunks - transcriber may be reconnecting`
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Error sending audio to transcriber for ${participantName}:`,
          error
        );
      }
    };
  }
  private stopProcessingParticipantAudio(participantId: string): void {
    const processor = this.processors.get(participantId);
    if (processor) {
      // For ScriptProcessorNode, we need to clear the onaudioprocess handler and disconnect
      if ('onaudioprocess' in processor) {
        (processor as unknown as ScriptProcessorNode).onaudioprocess = null;
      }
      processor.disconnect();
      this.processors.delete(participantId);
    }

    // Clear audio buffer for this participant
    this.audioBuffers.delete(participantId);

    // Clear participant name
    this.participantNames.delete(participantId);
  }

  getParticipantName(participantId: string): string {
    return this.participantNames.get(participantId) || 'Unknown Speaker';
  }

  getAllParticipantNames(): Map<string, string> {
    return new Map(this.participantNames);
  }
}
