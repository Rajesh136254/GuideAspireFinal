import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Class1112 } from './class11-12';

describe('Class1112', () => {
  let component: Class1112;
  let fixture: ComponentFixture<Class1112>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Class1112]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Class1112);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
