import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Book } from './book.model';
import { BookDetails } from './book-details.model';
import { GlobalVariablesService } from './global.variables.service';


@Injectable({
  providedIn: 'root'
})
export class BookService {
  private baseApiUrl = 'https://www.googleapis.com/books/v1/volumes?q=subject:';
  private ApiUrl = 'https://www.googleapis.com/books/v1/volumes/';
  genres: string[] = [
    'Fantasy', 'Science Fiction', 'Mystery', 'Non Fiction', 'Romance',
    'Business', 'Classics', 'Comics', 'Fiction', 'Horror'
  ];
  category: string = '';
  constructor(private http: HttpClient,private global : GlobalVariablesService) {}

  getBooks(genre: string): Observable<any[]> {
    const url = this.getUrlByGenre(genre);
    return this.http.get<any>(url).pipe(
      map(response => response.items || [])
    );
  }

  private getUrlByGenre(genre: string): string {
    let apiUrl: string;
    
    switch (genre.toLowerCase()) {
      case 'business':
        this.category = 'Business';
        apiUrl = `${this.baseApiUrl}business&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'classics':
          this.category = 'Classics';
          apiUrl = `${this.baseApiUrl}classics&key=${this.global.apiKey}&maxResults=40`;
          break;
      case 'comics':
            this.category = 'Comics';
            apiUrl = `${this.baseApiUrl}comics&key=${this.global.apiKey}&maxResults=40`;
            break;
      case 'fantasy':
        this.category = 'Fantasy';
        apiUrl = `${this.baseApiUrl}fantasy&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'fiction':
        this.category = 'Fiction';
        apiUrl = `${this.baseApiUrl}fiction&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'horror':
        this.category = 'Horror';
        apiUrl = `${this.baseApiUrl}horror.json&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'non fiction':
        this.category = 'Non Fiction';
        apiUrl = `${this.baseApiUrl}non_fiction.json&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'romance':
        this.category = 'Romance';
        apiUrl = `${this.baseApiUrl}romance&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'science fiction':
        this.category = 'Science Fiction';
        apiUrl = `${this.baseApiUrl}science_fiction&key=${this.global.apiKey}&maxResults=40`;
        break;
      default:
        // Для невідомих жанрів використовуємо оригінальну назву, замінюючи пробіли на підкреслення
        const formattedGenre = genre.toLowerCase().replace(/ /g, '_');
        this.category = formattedGenre;
        apiUrl = `${this.baseApiUrl}${formattedGenre}`;

    }

    return apiUrl;
  }
  searchBooks(query: string): Observable<any> {
    return this.http.get(`${this.baseApiUrl}search.json?title=${query}&maxResults=20`);
  }
  // src/app/book.service.ts
  getBookDetails(id: string): Observable<BookDetails> {
      return this.http.get<any>(`${this.ApiUrl}${id}`).pipe(
        map(response => {
          const bookDetails: BookDetails = {
            key: response.id,
            title: response.volumeInfo.title,
            genre: this.category,
            author_name: response.volumeInfo.authors.join(', '),
            cover_url: response.volumeInfo.imageLinks.thumbnail,
            description: response.volumeInfo.description
          };
          return bookDetails;
        })
      );
    }
  

}