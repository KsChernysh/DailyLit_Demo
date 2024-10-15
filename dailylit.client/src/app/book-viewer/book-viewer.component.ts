import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import ePub from 'epubjs';

@Component({
  selector: 'book-viewer',
  template: `
    <div #epubViewer style="width: 100%; height: 600px;"></div>
    <button (click)="prevPage()">Previous Page</button>
    <button (click)="nextPage()">Next Page</button>
  `
})
export class BookViewerComponent implements OnInit {
  @ViewChild('epubViewer') epubViewer!: ElementRef;
  private book: any;
  private rendition: any;

  ngOnInit() {
    this.initReader();
  }

  async initReader() {
    // Замініть URL на шлях до вашого EPUB файлу
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
