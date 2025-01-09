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
  genres: string[] = ['Fantasy', 'Science Fiction', 'Mystery', 'Non-fiction', 'Romance'];

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
      case 'fantasy':
        apiUrl = `${this.baseApiUrl}fantasy&key=${this.global.apiKey}&maxResults=32`;
        break;
      case 'science fiction':
        apiUrl = `${this.baseApiUrl}science_fiction&key=${this.global.apiKey}&maxResults=32`;
        break;
      case 'mystery':
        apiUrl = `${this.baseApiUrl}mystery.json&key=${this.global.apiKey}&maxResults=32`;
        break;
      case 'non-fiction':
        apiUrl = `${this.baseApiUrl}non-fiction.json&key=${this.global.apiKey}&maxResults=32`;
        break;
      case 'romance':
        apiUrl = `${this.baseApiUrl}romance&key=${this.global.apiKey}&maxResults=32`;
        break;
        case 'favorites':
        apiUrl = `${this.baseApiUrl}favorites&key=${this.global.apiKey}&maxResults=32`;
        break;
      default:
        // Для невідомих жанрів використовуємо оригінальну назву, замінюючи пробіли на підкреслення
        const formattedGenre = genre.toLowerCase().replace(/ /g, '_');
        apiUrl = `${this.baseApiUrl}${formattedGenre}`;
    }

    return apiUrl;
  }
  searchBooks(query: string): Observable<any> {
    return this.http.get(`${this.baseApiUrl}search.json?title=${query}`);
  }
  // src/app/book.service.ts
  getBookDetails(id: string): Observable<BookDetails> {
      return this.http.get<any>(`${this.ApiUrl}${id}&key=${this.global.apiKey}`).pipe(
        map(response => {
          const bookDetails: BookDetails = {
            title: response.volumeInfo.title,
            author_name: response.volumeInfo.authors.join(', '),
            cover_url: response.volumeInfo.imageLinks.thumbnail,
            description: response.volumeInfo.description
          };
          return bookDetails;
        })
      );
    }
  

}