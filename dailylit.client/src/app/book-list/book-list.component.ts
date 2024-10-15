import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BookService } from '../book.service';
import { Book } from '../book.model';
import { GlobalVariablesService } from '../global.variables.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.css']
})
export class BookListComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  genre: string = '';
  BaseId: string = '';
  private genreSubscription!: Subscription;
  constructor(private bookService: BookService, private global: GlobalVariablesService, private router: Router) {
    console.log('BookListComponent constructed');
  }

  ngOnInit(): void {
    console.log('BookListComponent initialized');
    this.genreSubscription = this.global.selectedGenre$.subscribe(genre => {
      console.log('Genre changed in BookListComponent:', genre);
      this.genre = genre;
      this.loadBooks();
    });
  }

  ngOnDestroy(): void {
    console.log('BookListComponent destroyed');
    if (this.genreSubscription) {
      this.genreSubscription.unsubscribe();
    }
  }

  loadBooks(): void {
    console.log('loadBooks called for genre:', this.genre);
    
    this.bookService.getBooks(this.genre).subscribe(
      (data: any[]) => {
        console.log('Received book data:', data); // Логування всіх даних
  
        // Обробка кожної книги
        this.books = data.map(book => {
          console.log('Book works:', book.works);
          // Логування поля works для кожної книги
          return {
            title: book.title,
            author: book.authors?.[0]?.name || 'Unknown Author',
            cover_id: book.cover_id,
            cover_url: book.cover_id
              ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`
              : 'assets/no-cover.jpg',
            cover_edition_key: book.cover_edition_key,
            publisher: book.publisher,
            edition_count: book.edition_count,
            description: book.description,
            works: book.key // Витягуємо works
          };
        });
        
        console.log('Processed books:', this.books); // Логування оброблених книг
  
      },
      error => {
        console.error('Error fetching books:', error); // Логування помилки
      }
    );
  }
  apicall(id : string)
  {
    this.bookService.getBookDetails(id).subscribe(
      data => {
        console.log(data);
        this.BaseId = id.slice(6);
        this.router.navigate([`/book/`, this.BaseId]);
      }
    );
  }
}