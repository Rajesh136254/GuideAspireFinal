import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Grad } from './grad';

describe('Grad', () => {
  let component: Grad;
  let fixture: ComponentFixture<Grad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Grad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Grad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
