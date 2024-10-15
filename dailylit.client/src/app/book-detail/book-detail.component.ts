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
      this.corectId = '/works' + id;
      console.log('ID книги:', id); // Логування ID
   
      if (this.corectId) {
        // Отримуємо деталі книги за допомогою id і title
        this.bookService.getBookDetails(this.corectId).subscribe(
          (book: BookDetails) => {
            console.log('Отримані дані про книгу:', book.description); // Логування отриманих даних
            if (book) {
              this.book = {
                title: book.title,
                author: book.author,
                covers: book.covers,
                cover_id: book.cover_id,
                cover_url:
                   "https://covers.openlibrary.org/b/id/" + book.covers[0] + "-M.jpg",
                publisher: book.publisher,
                edition_count: book.edition_count,
                description: book.description
              };
            } else {
              console.error('Книга не знайдена або дані відсутні.');
              this.book = null; // У разі відсутності книги
            }
          },
          error => {
            console.error('Помилка при отриманні даних: ', error);
            this.book = null; // У разі помилки
          }
        );
      } else {
        console.error('ID або назва книги не знайдено.');
        this.book = null; // Якщо ID або title не знайдено
      }
    });
    

  }
}
