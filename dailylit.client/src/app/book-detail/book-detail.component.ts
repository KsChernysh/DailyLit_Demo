// src/app/book-detail/book-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookService } from '../book.service';
import { BookDetails } from '../book-details.model';

@Component({
  selector: 'app-book-detail',
  templateUrl: './book-detail.component.html',
  styleUrls: ['./book-detail.component.css']
})
export class BookDetailComponent implements OnInit {
  book!: BookDetails | null; // Змінено тип для обробки можливого null
  corectId : string = '';
  constructor(
    private route: ActivatedRoute,
    private bookService: BookService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      const id = paramMap.get('id');
      this.corectId = id?.toString() || '';
      console.log('ID книги:', id); // Логування ID
   
      if (this.corectId) {
        // Отримуємо деталі книги за допомогою id і title
        this.bookService.getBookDetails(this.corectId).subscribe(
          (book: BookDetails) => {
            console.log('Отримані дані про книгу:', book.description); // Логування опису книги
            if (book) {
              this.book = {
                
                title: book.title || 'No Title',
                author_name: book.author_name || 'No Author',
                cover_url: book.cover_url || 'assets/no-cover.png',
                description: book.description || 'No Description Available'
              };
            } else {
              this.book = null;
              console.warn('Не вдалося знайти деталі книги з ID:', this.corectId);
            }
          },
          (error: any) => {
            console.error('Error fetching book details:', error);
            this.book = null;
          }
        );
      }
    });
    

  }
}
