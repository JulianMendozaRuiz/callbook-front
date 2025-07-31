import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranscriptionResult } from '../../../shared/models/transcription';

@Injectable({
  providedIn: 'root',
})
export class TranscriptionResultsService {
  private transcriptionResults$ = new BehaviorSubject<TranscriptionResult[]>(
    []
  );

  get transcriptionResults(): Observable<TranscriptionResult[]> {
    return this.transcriptionResults$.asObservable();
  }

  addTranscriptionResult(result: TranscriptionResult): void {
    const currentResults = this.transcriptionResults$.value;
    currentResults.push(result);
    this.transcriptionResults$.next([...currentResults]);
  }

  clearResults(): void {
    this.transcriptionResults$.next([]);
  }

  getCurrentResults(): TranscriptionResult[] {
    return this.transcriptionResults$.value;
  }
}
