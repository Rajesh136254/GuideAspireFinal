import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LifeSkills } from './life-skills';

describe('LifeSkills', () => {
  let component: LifeSkills;
  let fixture: ComponentFixture<LifeSkills>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifeSkills]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LifeSkills);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
