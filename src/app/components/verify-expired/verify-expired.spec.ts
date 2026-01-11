import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyExpired } from './verify-expired';

describe('VerifyExpired', () => {
  let component: VerifyExpired;
  let fixture: ComponentFixture<VerifyExpired>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyExpired]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyExpired);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
