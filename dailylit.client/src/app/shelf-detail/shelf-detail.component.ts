import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BookService } from '../book.service';

@Component({
  selector: 'app-shelf-detail',
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.css']
})
export class ShelfDetailComponent implements OnInit {
  title: string = '';
  books: BookDetails[] = [];
  book: any;
  
  updatedBook: any;
  shelfId: number = 0;
  isEditing: boolean = false;
  id: string = '';
  api: string = "https://localhost:7172/api/Books";
  message: string = '';
  ;
  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient, private bookService: BookService) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      this.title = paramMap.get('title') || '';
      this.loadBooks();
    });
  }

  loadBooks(): void {
    const encodedTitle =  this.title

    this.http.get(`${this.api}/books?shelfName=${encodedTitle}`, { withCredentials: true }).subscribe(
     data =>{
        console.log('Books loaded:', data);
        this.books = (data as any[]).map((item: any) => ({
          id: item.id,
          title: item.title || 'No Title',
          author_name: item.author || 'No Author',
          cover_url: item.cover_Url || 'assets/no-cover.png',
          status: item.status || 'No Status',
          key: item.key || 'No Key',
          isEditing: false,// Додаємо властивість isEditing
          rating: item.rating || 0,
          booksadded: item.booksadded || new Date(),
          dateread: item.dateread,
        }));
      
      },
      (error) => {
        this.message = 'Error loading books.';
        console.error('Error loading books:', error);
      }
    );
  }
  apicall(key : string)
 {
  this.bookService.getBookDetails(key).subscribe(
    data => {
      this.id= key;
      console.log(data);
    
      this.router.navigate([`/book/`, this.id]);
    }
  );
}
 updateBook(book: any): void {
  this.updatedBook = { ...book }; // Копіюємо, щоб уникнути мутації
  console.log('Before update:', this.updatedBook);

  // Перевіряємо, чи є дата, і форматуємо її правильно
  let formattedDate = null;
  if (this.updatedBook.dateread) {
    const date = new Date(this.updatedBook.dateread);
    formattedDate = date.toISOString().split('T')[0]; // Формат yyyy-MM-dd
  }

  // Формуємо payload
  const payload = {
    status: this.updatedBook.status ?? '',
    rating: this.updatedBook.rating?.toString() ?? '0', // Перетворюємо в string
    dateread: formattedDate // Передаємо у форматі yyyy-MM-dd або null
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));
  this.sendUpdate(payload);
  
}

sendUpdate(payload: any): void {
  this.http.post<any>(
    `${this.api}/update-book?shelfName=${this.title}&key=${this.updatedBook.key}`, 
    payload, // `HttpClient` автоматично конвертує в JSON
    {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      withCredentials: true
    }
  ).subscribe(
    response => {
      if (response) { // Просто перевіряємо, чи є відповідь
        this.book = response; // Сервер має повертати оновлену книгу
        this.isEditing = false;
        console.log('Book updated:', this.book);
        alert('Book updated successfully');
        this.loadBooks();
      }
    },
    error => {
      console.error('Error updating book:', error);
      this.message = 'Error updating book.';
    }
  );
}


deleteBook(key: string): void {
  if (confirm('Are you sure you want to delete this book?')) {
    this.http.delete<any>(`${this.api}/delete-book?shelfName=${this.title}&key=${key}`, { withCredentials: true }).subscribe(
      response => {
        if (response) {
          console.log('Book deleted:', response);
          this.loadBooks();
          alert('Book deleted successfully');
        }
      },
      error => {
        console.error('Error deleting book:', error);
        this.message = 'Error deleting book.';
      }
    );
  }
}
setRating(book: any, rating: number): void {
  if (book.isEditing) {
    book.rating = rating;
    console.log(`Rating set to ${rating} for book ${book.title}`);
 
  }
}
enableEditing(key:string): void {
 
    this.books.forEach(book => book.isEditing = false); // Вимикаємо редагування для всіх книг
    this.updatedBook = this.books.find(book => book.key === key);
    if (this.updatedBook) {
      this.updatedBook.isEditing = true;
      console.log('Book to update:', this.updatedBook);
    }
  
}

}
interface BookDetails { 
  id: string,
  title: string,
  isEditing: boolean,
  author_name: string,
  cover_url: string,
  status: string,
  rating: number,
  key: string,
  booksadded: Date,
  dateread: Date
}
interface Book {
  status: string,
  rating: number,
  dateread: Date,
  key : string;
}

