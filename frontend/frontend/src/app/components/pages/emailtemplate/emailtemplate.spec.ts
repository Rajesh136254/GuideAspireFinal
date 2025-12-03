import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Emailtemplate } from './emailtemplate';

describe('Emailtemplate', () => {
  let component: Emailtemplate;
  let fixture: ComponentFixture<Emailtemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Emailtemplate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Emailtemplate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
