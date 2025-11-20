import { TestBed } from '@angular/core/testing';

import { Sign } from './sign';

describe('Sign', () => {
  let service: Sign;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sign);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
