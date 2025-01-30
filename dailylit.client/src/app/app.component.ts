import { HttpClient } from '@angular/common/http';
import { Component, OnInit, HostListener } from '@angular/core';
import { BookService } from './book.service';
import { GlobalVariablesService } from './global.variables.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  query: string = '';
  books: any[] = [];
  searchQuery: string = '';
  loggedIn: boolean = false;
  showWindow: boolean = false;

  constructor(private http: HttpClient, private global : GlobalVariablesService, private bookService : BookService, private router: Router, private authService: AuthService ) { } 

  ngOnInit() {
    this.authService.isLoggedIn.subscribe(value => {
      this.loggedIn = value;
    });
  }
  
  title = 'dailylit.client';

  logout() {
    this.authService.logout().subscribe(() => {
      this.authService.setLoggedIn(false);
      this.router.navigate(['/login']);
    });
  }

// Функція обробки keyup
onKey(event: any) {
  const query = this.query.trim();
  if (query) {
    this.searchBooks(query).subscribe(
      (result) => {
        this.books = result.items.map((item: any) => ({
          id: item.id,
          title: item.volumeInfo.title || 'No Title',
          author_name: item.volumeInfo.authors?.join(', ') || 'No Author',
          cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
          description: item.volumeInfo.description || 'No Description',
        }));
        this.showWindow = this.books.length > 0; // Показувати вікно, якщо є результати
      },
      (error: any) => {
        console.error('Error fetching search results:', error);
        this.books = [];
        this.showWindow = false; // Закрити вікно при помилці
      }
    );
  } else {
    this.books = [];
    this.showWindow = false; // Закрити вікно, якщо запит порожній
  }
}

  // Метод для пошуку книг
  searchBooks(query: string): Observable<any> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${this.global.apiKey}`;
    return this.http.get(url);
  }
  apicall(id : string)
  {
    this.bookService.getBookDetails(id).subscribe(
      data => {
        console.log(data);
      
        this.router.navigate([`/book/`, id]);
      }
    );
  }

  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    const target = event.target as HTMLElement;
    const searchResults = document.querySelector('.search-results');
    const searchInput = document.querySelector('input');

    if (
      searchResults &&
      !searchResults.contains(target) &&
      searchInput &&
      !searchInput.contains(target)
    ) {
      this.showWindow = false;
    }
  }
 
}
