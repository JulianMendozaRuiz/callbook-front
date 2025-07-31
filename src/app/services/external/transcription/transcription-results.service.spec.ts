import { TestBed } from '@angular/core/testing';

import { TranscriptionResultsService } from './transcription-results.service';

describe('TranscriptionResultsService', () => {
  let service: TranscriptionResultsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranscriptionResultsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
