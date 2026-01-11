import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyErrorComponent } from './verify-error';

describe('VerifyErrorComponent', () => {
  let component: VerifyErrorComponent;
  let fixture: ComponentFixture<VerifyErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyErrorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyErrorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
