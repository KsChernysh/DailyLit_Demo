import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelvesViewComponent } from './shelves-view.component';

describe('ShelvesViewComponent', () => {
  let component: ShelvesViewComponent;
  let fixture: ComponentFixture<ShelvesViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShelvesViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelvesViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
