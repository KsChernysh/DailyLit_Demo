import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShelfDetailComponent } from './shelf-detail.component';

describe('ShelfDetailComponent', () => {
  let component: ShelfDetailComponent;
  let fixture: ComponentFixture<ShelfDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShelfDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShelfDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
