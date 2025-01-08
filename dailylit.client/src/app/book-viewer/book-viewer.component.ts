import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import ePub from 'epubjs';

@Component({
  selector: 'book-viewer',
  template: `
    <div #epubViewer style="width: 80%; height: 500px"></div>
    <button class="btn-info" (click)="prevPage()">Previous Page</button>
    <button class="btn-info" (click)="nextPage()">Next Page</button>
  `
})
export class BookViewerComponent implements AfterViewInit {
  @ViewChild('epubViewer') epubViewer!: ElementRef;
  private book: any;
  private rendition: any;

  // Use ngAfterViewInit to ensure the DOM is fully ready
  ngAfterViewInit() {
    this.initReader();
  }

  async initReader() {
    // Replace the URL with the path to your EPUB file
    this.book = ePub('/assets/ebook.epub');
    this.rendition = this.book.renderTo(this.epubViewer.nativeElement, {
      width: '100%',
      height: '100%'
    });
    await this.rendition.display();
  }

  nextPage() {
    this.rendition.next();
  }

  prevPage() {
    this.rendition.prev();
  }
}
