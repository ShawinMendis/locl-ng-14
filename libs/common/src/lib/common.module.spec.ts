import { async, TestBed } from '@angular/core/testing';
import { LoclCommonModule } from './common.module';

describe('CommonModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [LoclCommonModule],
      teardown: { destroyAfterEach: false },
    }).compileComponents();
  }));

  it('should create', () => {
    expect(LoclCommonModule).toBeDefined();
  });
});
