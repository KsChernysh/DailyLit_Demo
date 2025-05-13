import { HttpClient } from '@angular/common/http';
import { Component, OnInit, HostListener } from '@angular/core';
import { BookService } from './book.service';
import { GlobalVariablesService } from './global.variables.service';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth.service';
import { filter } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

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
  currentRoute: string = '';

  constructor(
    private http: HttpClient, 
    private global: GlobalVariablesService, 
    private bookService: BookService, 
    private router: Router, 
    private authService: AuthService
  ) { } 

  ngOnInit() {
    // Перевіряємо статус авторизації
    this.authService.isLoggedIn.subscribe(value => {
      this.loggedIn = value;
    });
    
    // Відстежуємо поточний маршрут для активного стану
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });
  }
  
  title = 'dailylit.client';

  // Перевірка чи маршрут активний
  isRouteActive(route: string): boolean {
    return this.currentRoute.includes(route);
  }

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
          if (result && result.items) {
            this.books = result.items.map((item: any) => ({
              id: item.id,
              title: item.volumeInfo.title || 'Назва відсутня',
              author_name: item.volumeInfo.authors?.join(', ') || 'Автор невідомий',
              cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
              description: item.volumeInfo.description || 'Опис відсутній',
            }));
            this.showWindow = this.books.length > 0;
          } else {
            this.books = [];
            this.showWindow = false;
          }
        },
        (error: any) => {
          console.error('Помилка отримання результатів пошуку:', error);
          this.books = [];
          this.showWindow = false;
        }
      );
    } else {
      this.books = [];
      this.showWindow = false;
    }
  }

  // Метод для пошуку книг
  searchBooks(query: string): Observable<any> {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${this.global.apiKey}`;
    return this.http.get(url);
  }

  apicall(id: string) {
    this.router.navigate([`/book/`, id]);
    this.showWindow = false; // Закриваємо результати пошуку при переході
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
