import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Book } from './book.model';
import { BookDetails } from './book-details.model';



@Injectable({
  providedIn: 'root'
})
export class BookService {
  private baseApiUrl = 'https://openlibrary.org/subjects/';
  private ApiUrl = 'https://openlibrary.org';
  genres: string[] = ['Fantasy', 'Science Fiction', 'Mystery', 'Non-fiction', 'Romance'];

  constructor(private http: HttpClient) {}

  getBooks(genre: string): Observable<any[]> {
    const url = this.getUrlByGenre(genre);
    return this.http.get<any>(url).pipe(
      map(response => response.works || [])
    );
  }

  private getUrlByGenre(genre: string): string {
    let apiUrl: string;
    
    switch (genre.toLowerCase()) {
      case 'fantasy':
        apiUrl = `https://openlibrary.org/subjects/fantasy.json?limit=50&offset=50`;
        break;
      case 'science fiction':
        apiUrl = `${this.baseApiUrl}science_fiction.json?limit=50&offset=50`;
        break;
      case 'mystery':
        apiUrl = `${this.baseApiUrl}mystery.json?limit=50&offset=50`;
        break;
      case 'non-fiction':
        apiUrl = `${this.baseApiUrl}non-fiction.json?limit=50&offset=50`;
        break;
      case 'romance':
        apiUrl = `${this.baseApiUrl}romance.json?limit=50&offset=50`;
        break;
        case 'favorites':
        apiUrl = `${this.baseApiUrl}favorites.json?limit=50&offset=50`;
        break;
      default:
        // Для невідомих жанрів використовуємо оригінальну назву, замінюючи пробіли на підкреслення
        const formattedGenre = genre.toLowerCase().replace(/ /g, '_');
        apiUrl = `${this.baseApiUrl}${formattedGenre}.json?limit=50&offset=50`;
    }

    return apiUrl;
  }
  searchBooks(query: string): Observable<any> {
    return this.http.get(`${this.baseApiUrl}search.json?title=${query}`);
  }
  // src/app/book.service.ts
  getBookDetails(id: string): Observable<BookDetails> {
    return this.http.get<BookDetails>(this.ApiUrl+id+'.json');
  }
  

}