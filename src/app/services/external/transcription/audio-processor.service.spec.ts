import { TestBed } from '@angular/core/testing';

import { AudioProcessorService } from './audio-processor.service';

describe('AudioProcessorService', () => {
  let service: AudioProcessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioProcessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
