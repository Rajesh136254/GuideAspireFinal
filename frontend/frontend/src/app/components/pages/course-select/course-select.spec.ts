import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseSelectComponent } from './course-select';

describe('CourseSelect', () => {
  let component: CourseSelectComponent;
  let fixture: ComponentFixture<CourseSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
