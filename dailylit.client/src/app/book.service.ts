import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { Book } from './book.model';
import { BookDetails } from './book-details.model';
import { GlobalVariablesService } from './global.variables.service';
import { GeminiService } from './gemini.service';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private baseApiUrl = 'https://www.googleapis.com/books/v1/volumes?q=subject:';
  private ApiUrl = 'https://www.googleapis.com/books/v1/volumes/';
  private openLibraryApi = 'https://openlibrary.org/search.json';

  genres: string[] = [
    'Fantasy', 'Science Fiction', 'Mystery', 'Non Fiction', 'Romance',
    'Business', 'Classics', 'Comics', 'Fiction', 'Horror'
  ];
  category: string = '';
  
  constructor(
    private http: HttpClient, 
    private global: GlobalVariablesService,
    private geminiService: GeminiService  // Додаємо Gemini Service
  ) {}

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
        apiUrl = `${this.baseApiUrl}horror&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'non fiction':
        this.category = 'Non Fiction';
        apiUrl = `${this.baseApiUrl}non-fiction&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'romance':
        this.category = 'Romance';
        apiUrl = `${this.baseApiUrl}romance&key=${this.global.apiKey}&maxResults=40`;
        break;
      case 'science fiction':
        this.category = 'Science Fiction';
        apiUrl = `${this.baseApiUrl}science-fiction&key=${this.global.apiKey}&maxResults=40`;
        break;
      default:
        // Для невідомих жанрів використовуємо оригінальну назву, замінюючи пробіли на дефіси
        const formattedGenre = genre.toLowerCase().replace(/ /g, '-');
        this.category = genre;
        apiUrl = `${this.baseApiUrl}${formattedGenre}&key=${this.global.apiKey}&maxResults=40`;
    }

    return apiUrl;
  }
  
  searchBooks(query: string): Observable<any> {
    // Виправляємо URL для пошуку книг у Google Books API
    return this.http.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${this.global.apiKey}&maxResults=20`);
  }
  
  getBookDetails(id: string): Observable<BookDetails> {
    return this.http.get<any>(`${this.ApiUrl}${id}`).pipe(
      mergeMap(response => {
        // Створюємо базові деталі книги
        const bookDetails: BookDetails = {
          key: response.id,
          title: response.volumeInfo.title,
          genre: response.volumeInfo.categories ? response.volumeInfo.categories[0] : this.category,
          rating: response.volumeInfo.averageRating,
          pages: response.volumeInfo.pageCount,
          publish_date: response.volumeInfo.publishedDate,
          author_name: response.volumeInfo.authors ? response.volumeInfo.authors.join(', ') : 'Unknown Author',
          cover_url: response.volumeInfo.imageLinks ? response.volumeInfo.imageLinks.thumbnail : 'assets/no-cover.png',
          description: response.volumeInfo.description || '',
          keywords: []
        };
        
        // Отримуємо ключові слова з опису через Gemini API
        if (bookDetails.description) {
          return this.extractKeywordsUsingGemini(bookDetails.description, bookDetails.title).pipe(
            map(keywords => {
              bookDetails.keywords = keywords;
              return bookDetails;
            })
          );
        }
        
        // Якщо опису немає, просто повертаємо деталі
        return of(bookDetails);
      }),
      catchError(error => {
        console.error('Error fetching book details:', error);
        return of({
          key: id,
          title: 'Error fetching book details',
          genre: 'Unknown',
          rating: 0,
          pages: 0,
          publish_date: '',
          author_name: 'Unknown',
          cover_url: 'assets/no-cover.png',
          description: 'Error fetching book details',
          keywords: []
        });
      })
    );
  }

  // Метод для витягування ключових слів з опису за допомогою Gemini
  extractKeywordsUsingGemini(description: string, title: string): Observable<string[]> {
    // Створюємо конкретний промпт для Gemini
    const prompt = `
    Проаналізуй опис книги з назвою "${title}" та визнач 10-15 найважливіших ключових слів або фраз, 
    які найкраще характеризують тематику, сюжет, настрій та ідеї книги.
    
    Опис книги: "${description}"
    
    Правила:
    1. Не включай слова, які просто описують книгу як об'єкт (книга, роман, оповідання).
    2. Не включай оцінювальні слова (захоплююча, чудова, видатна).
    3. Уникай загальних слів, які не несуть змістовного навантаження.
    4. Визнач також основний жанр книги на основі опису.
    5. Включи мотиви та теми, які розкриваються в книзі.
    
    Подай результат строго у такому форматі JSON:
    {
      "keywords": ["ключове_слово_1", "ключове_слово_2", ...],
      "genre": "основний жанр"
    }
    Відповідь повинна містити ТІЛЬКИ цей JSON без будь-яких додаткових пояснень.`;
    
    return this.geminiService.generateContentWithGeminiPro(prompt, []).pipe(
      map(response => {
        try {
          // Видаляємо markdown форматування, якщо воно є
          const cleanedResponse = response.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          
          // Зберігаємо жанр та ключові слова
          if (parsed.genre) {
            this.category = parsed.genre;
          }
          
          return parsed.keywords || [];
        } catch (error) {
          console.error('Error parsing Gemini response:', error, 'Response was:', response);
          
          // Якщо не можемо розпарсити відповідь, екстрагуємо хоча б деякі слова з опису
          return this.fallbackKeywordExtraction(description, title);
        }
      }),
      catchError(error => {
        console.error('Error with Gemini API:', error);
        return of(this.fallbackKeywordExtraction(description, title));
      })
    );
  }

  // Запасний механізм витягування ключових слів (якщо Gemini недоступний)
  private fallbackKeywordExtraction(description: string, title: string): string[] {
    const keywords = new Set<string>();
    
    // Додаємо слова з заголовку
    title.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .forEach(word => keywords.add(word));
    
    // Витягуємо значущі слова з опису
    const stopWords = new Set([
      'the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'to', 'of', 'from', 'as', 'that', 'this', 'these', 'those',
      'book', 'novel', 'story', 'tells', 'author'
    ]);
    
    description.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 4 && !stopWords.has(word))
      .forEach(word => keywords.add(word));
    
    return Array.from(keywords).slice(0, 15);
  }

  // Новий метод для отримання рекомендованих книг за ключовими словами
  getRecommendationsByKeywords(keywords: string[], excludeIds: string[] = []): Observable<any[]> {
    // Обмежуємо кількість ключових слів для запитів
    const topKeywords = keywords.slice(0, 5);
    
    // Створюємо запит для кожного ключового слова
    const searchRequests = topKeywords.map(keyword => 
      this.searchBooksByKeyword(keyword).pipe(
        catchError(error => {
          console.error(`Error searching for keyword ${keyword}:`, error);
          return of([]);
        })
      )
    );
    
    // Об'єднуємо результати всіх запитів
    return forkJoin(searchRequests).pipe(
      map(results => {
        // Об'єднуємо результати і видаляємо дублікати
        const allBooks = results.flat();
        const uniqueBooks = this.removeDuplicates(allBooks);
        
        // Виключаємо книги за ID
        if (excludeIds.length > 0) {
          return uniqueBooks.filter(book => !excludeIds.includes(book.key));
        }
        
        return uniqueBooks;
      })
    );
  }

  // Пошук книг за ключовим словом (комбінована версія)
  searchBooksByKeyword(keyword: string): Observable<any[]> {
    // Спочатку пробуємо пошук у Google Books API
    return this.http.get<any>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keyword)}&key=${this.global.apiKey}&maxResults=10`).pipe(
      map(response => {
        if (response && response.items && response.items.length > 0) {
          return response.items.map((item: any) => this.mapGoogleBookToBookDetails(item, keyword));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error with Google Books API, falling back to OpenLibrary:', error);
        
        // Якщо Google Books API не відповідає, використовуємо OpenLibrary
        return this.searchBooksByKeywordOpenLibrary(keyword);
      })
    );
  }

  // Пошук книг за ключовим словом в OpenLibrary
  private searchBooksByKeywordOpenLibrary(keyword: string): Observable<any[]> {
    const params = new HttpParams()
      .set('q', keyword)
      .set('limit', '10');
    
    return this.http.get(`${this.openLibraryApi}`, { params }).pipe(
      map((response: any) => {
        if (response.docs && response.docs.length > 0) {
          return response.docs.map((doc: any) => this.mapOpenLibraryToBookDetails(doc, keyword));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error with OpenLibrary API:', error);
        return of([]);
      })
    );
  }

  // Конвертація результату Google Books у формат BookDetails
  private mapGoogleBookToBookDetails(item: any, sourceKeyword: string): any {
    if (!item.volumeInfo) return null;
    
    const authors = item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown Author';
    const coverUrl = item.volumeInfo.imageLinks ? 
      item.volumeInfo.imageLinks.thumbnail : 'assets/no-cover.png';
    
    return {
      id: item.id,
      key: item.id,
      title: item.volumeInfo.title || 'No Title',
      author_name: authors,
      cover_url: coverUrl,
      status: 'Recommended',
      isEditing: false,
      rating: item.volumeInfo.averageRating || 0,
      booksadded: new Date(),
      dateread: null,
      genre: item.volumeInfo.categories ? item.volumeInfo.categories[0] : sourceKeyword,
      description: item.volumeInfo.description || '',
      keywords: this.extractKeywordsFromText(item.volumeInfo.title + ' ' + 
               (item.volumeInfo.description || '') + ' ' + 
               (item.volumeInfo.categories ? item.volumeInfo.categories.join(' ') : ''),
               sourceKeyword)
    };
  }

  // Конвертація результату OpenLibrary у формат BookDetails
  private mapOpenLibraryToBookDetails(doc: any, sourceKeyword: string): any {
    const authors = doc.author_name ? doc.author_name.join(', ') : 'Unknown Author';
    const coverId = doc.cover_i ? doc.cover_i : null;
    const coverUrl = coverId 
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` 
      : 'assets/no-cover.png';
    
    return {
      id: doc.key || '',
      key: doc.key || '',
      title: doc.title || 'No Title',
      author_name: authors,
      cover_url: coverUrl,
      status: 'Recommended',
      isEditing: false,
      rating: 0,
      booksadded: new Date(),
      dateread: null,
      genre: doc.subject ? doc.subject[0] : sourceKeyword,
      description: doc.first_sentence ? doc.first_sentence.join('. ') : '',
      keywords: this.extractKeywordsFromOpenLibrary(doc, sourceKeyword)
    };
  }

  // Простий метод витягування ключових слів з тексту
  private extractKeywordsFromText(text: string, sourceKeyword: string): string[] {
    const keywords = new Set<string>();
    
    // Додаємо ключове слово, за яким ми знайшли цю книгу
    keywords.add(sourceKeyword.toLowerCase());
    
    if (!text) return Array.from(keywords);
    
    const stopWords = new Set([
      'the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 
      'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'to', 'of', 'from', 'as', 'that', 'this', 'these', 'those', 'but', 'or', 'if', 
      'book', 'novel', 'story', 'read', 'author', 'written'
    ]);
    
    text.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 20) // Обмежуємо кількість ключових слів
      .forEach(word => keywords.add(word));
    
    return Array.from(keywords);
  }

  // Витягує ключові слова з відповіді OpenLibrary API
  private extractKeywordsFromOpenLibrary(doc: any, sourceKeyword: string): string[] {
    const keywords = new Set<string>();
    
    // Додаємо заголовок
    if (doc.title) {
      doc.title.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter((word: string | any[]) => word.length > 3)
        .forEach((word: string) => keywords.add(word));
    }
    
    // Додаємо авторів
    if (doc.author_name) {
      doc.author_name.forEach((author: string) => {
        keywords.add(author.toLowerCase());
      });
    }
    
    // Додаємо жанри/теми
    if (doc.subject) {
      doc.subject.slice(0, 5).forEach((subject: string) => {
        keywords.add(subject.toLowerCase());
      });
    }
    
    // Додаємо ключове слово, за яким ми знайшли цю книгу
    keywords.add(sourceKeyword.toLowerCase());
    
    return Array.from(keywords);
  }

  // Видаляє дублікати книг за ключем
  private removeDuplicates(books: any[]): any[] {
    const uniqueBooks = new Map<string, any>();
    
    books.forEach(book => {
      if (book && book.key && !uniqueBooks.has(book.key)) {
        uniqueBooks.set(book.key, book);
      }
    });
    
    return Array.from(uniqueBooks.values());
  }
}