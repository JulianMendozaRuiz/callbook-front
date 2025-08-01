import { Injectable } from '@angular/core';
import {
  Room,
  LocalAudioTrack,
  RemoteAudioTrack,
  Participant,
  Track,
} from 'livekit-client';
import { MultiTranscriberService } from './multi-transcriber.service';

@Injectable({
  providedIn: 'root',
})
export class MultiAudioProcessorService {
  private audioContext: AudioContext | null = null;
  private processors: Map<string, ScriptProcessorNode> = new Map();
  private audioBuffers: Map<string, Float32Array[]> = new Map();

  constructor(private multiTranscriberService: MultiTranscriberService) {}

  async startProcessingRoom(room: Room): Promise<void> {
    // Create transcribers and start processing audio from local participant
    await this.processLocalAudio(room);

    // Create transcribers and start processing audio from existing remote participants
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
      processor.onaudioprocess = null;
      processor.disconnect();
    });
    this.processors.clear();

    // Clear audio buffers
    this.audioBuffers.clear();

    // Close all transcribers
    await this.multiTranscriberService.closeAllTranscribers();

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
      const participantId = 'local';
      const participantName =
        localParticipant.name || localParticipant.identity || 'You';

      // Create dedicated transcriber for local participant
      await this.multiTranscriberService.createTranscriberForParticipant(
        participantId,
        participantName,
        true // isLocal = true
      );

      await this.processAudioTrack(
        audioTrack.mediaStreamTrack,
        participantId,
        participantName
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
          const participantId = participant.identity;
          const participantName = participant.name || participant.identity;

          // Create dedicated transcriber for this remote participant
          await this.multiTranscriberService.createTranscriberForParticipant(
            participantId,
            participantName,
            false // isLocal = false
          );

          await this.processAudioTrack(
            audioTrack.mediaStreamTrack,
            participantId,
            participantName
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

    // Store the script processor
    this.processors.set(participantId, scriptProcessor);

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
        !this.multiTranscriberService.hasTranscriberForParticipant(
          participantId
        )
      ) {
        // Disconnect if transcriber is closed or removed
        scriptProcessor.disconnect();
        return;
      }

      // Get input audio data (single channel, mono)
      const inputBuffer = audioProcessingEvent.inputBuffer;
      const inputData = inputBuffer.getChannelData(0); // Get mono channel

      // Check if there's actual audio activity (not just silence)
      const hasAudio = inputData.some((sample) => Math.abs(sample) > 0.005);

      // Only process and send audio if there's actual sound
      if (!hasAudio) {
        return; // Skip silent audio chunks
      }

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

      // Send audio chunk to the dedicated transcriber for this participant
      try {
        this.multiTranscriberService.sendAudioToParticipant(
          participantId,
          int16Data.buffer
        );
        audioChunkCount++;

        if (!firstAudioSent) {
          firstAudioSent = true;
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
      processor.onaudioprocess = null;
      processor.disconnect();
      this.processors.delete(participantId);
    }

    // Clear audio buffer for this participant
    this.audioBuffers.delete(participantId);

    // Close the transcriber for this participant
    this.multiTranscriberService.closeTranscriberForParticipant(participantId);
  }

  getActiveProcessors(): string[] {
    return Array.from(this.processors.keys());
  }
}
