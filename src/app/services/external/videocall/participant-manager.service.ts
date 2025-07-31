import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Room, Participant } from 'livekit-client';

@Injectable({
  providedIn: 'root',
})
export class ParticipantManagerService {
  participants$ = new BehaviorSubject<Map<string, Participant>>(new Map());

  setupParticipantEventListeners(room: Room): void {
    if (!room) return;

    room.on('participantConnected', (participant) => {
      this.handleParticipantConnected(participant);
    });

    room.on('participantDisconnected', (participant) => {
      this.handleParticipantDisconnected(participant);
    });
  }

  private handleParticipantConnected(participant: Participant): void {
    const currentParticipants = this.participants$.value;
    currentParticipants.set(participant.identity, participant);
    this.participants$.next(new Map(currentParticipants));
  }

  private handleParticipantDisconnected(participant: Participant): void {
    const currentParticipants = this.participants$.value;
    currentParticipants.delete(participant.identity);
    this.participants$.next(new Map(currentParticipants));
  }

  syncExistingParticipants(room: Room): void {
    if (!room) return;

    const existingParticipants = new Map<string, Participant>();

    room.remoteParticipants.forEach((participant, identity) => {
      existingParticipants.set(identity, participant);
    });

    this.participants$.next(existingParticipants);
  }

  clearParticipants(): void {
    this.participants$.next(new Map());
  }

  getParticipants(): Map<string, Participant> {
    return this.participants$.value;
  }

  getParticipantCount(): number {
    return this.participants$.value.size;
  }

  getParticipantById(identity: string): Participant | undefined {
    return this.participants$.value.get(identity);
  }

  getAllParticipantIdentities(): string[] {
    return Array.from(this.participants$.value.keys());
  }
}
