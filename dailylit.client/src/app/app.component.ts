import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
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
    this.query = event.target.value;
    if (this.query && this.query.length > 2) {
      this.searchBooks(this.query).subscribe(
        (response: any) => {
          console.log('Response from API:', response);

          this.books = response.docs.map((book: any) => ({
            title: book.title,
            author_name: book.author_name,
            cover_url: book.cover_i
              ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
              : 'assets/no-cover.jpg'
          }));
        },
        (error: any) => {
          console.error('Error fetching search results:', error);
        }
      );
    } else {
      this.books = [];
    }
  }

  // Метод для пошуку книг
  searchBooks(query: string): Observable<any> {
    const url = `https://openlibrary.org/search.json?q=${query}`;
    return this.http.get(url);
  }
  
 
}
