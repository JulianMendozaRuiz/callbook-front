import { TestBed } from '@angular/core/testing';

import { VideocallService } from './videocall.service';

describe('VideocallService', () => {
  let service: VideocallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VideocallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
