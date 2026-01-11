import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTrivia } from './create-trivia';

describe('CreateTrivia', () => {
  let component: CreateTrivia;
  let fixture: ComponentFixture<CreateTrivia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTrivia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTrivia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
