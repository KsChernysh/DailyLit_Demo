import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookViewerComponent } from './book-viewer.component';

describe('BookViewerComponent', () => {
  let component: BookViewerComponent;
  let fixture: ComponentFixture<BookViewerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BookViewerComponent]
    });
    fixture = TestBed.createComponent(BookViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
