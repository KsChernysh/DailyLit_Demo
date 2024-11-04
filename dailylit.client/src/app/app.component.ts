import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { BookService } from './book.service';
import { GlobalVariablesService } from './global.variables.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  books: any[] = [];
  searchQuery: string = '';



  constructor(private http: HttpClient, private global : GlobalVariablesService, private bookService : BookService, private router: RouterModule, private authService: AuthService ) { } 

  ngOnInit() {
    
  }
  
  title = 'dailylit.client';



// Функція обробки keyup
  onKey(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    const query = target?.value;

    console.log('Query:', query);

    if (query && query.length > 2) {
      this.searchBooks(query).subscribe(
        (response: any) => {
          console.log('Response from API:', response);

          this.books = response.docs.map((book: any) => ({
            title: book.title,
            author_name: book.author_name,
            cover_url: book.cover_i
              ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
              : 'assets/no-cover.jpg'
          }));

          console.log('Processed books:', this.books);
        },
        error => {
          console.error('Error fetching books:', error);
        }
      );
    } else {
      this.books = [];
    }
  }

  // Метод для пошуку книг
  searchBooks(query: string): Observable<any> {
    return this.http.get(`https://openlibrary.org/search.json?title=${query}`).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(response => of(response))
    );
  }
  logout(){
   return this.authService.logout().subscribe(
      response => {
        console.log(response);

      },
      error => {
        console.log(error);
      }
   )
  }
  Auth()
  {
    return this.authService.login('Vasyl', 'Hello1234-').subscribe(
      response => {
        console.log(response);
      },
      error => {
        console.log(error);
      }
    );
  }
}
