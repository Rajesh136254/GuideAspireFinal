import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Class610 } from './class6-10';

describe('Class610', () => {
  let component: Class610;
  let fixture: ComponentFixture<Class610>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Class610]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Class610);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
