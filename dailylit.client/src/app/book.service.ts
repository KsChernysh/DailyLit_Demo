import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { Book } from './book.model';
import { BookDetails } from './book-details.model';
import { GlobalVariablesService } from './global.variables.service';
import { GeminiService } from './gemini.service';

// Define interfaces for Google Books API responses
interface VolumeInfo {
  title?: string;
  authors?: string[];
  categories?: string[] | string;
  description?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    medium?: string;
  };
  averageRating?: number;
  pageCount?: number;
  publishedDate?: string;
}

interface BookItem {
  id: string;
  volumeInfo?: VolumeInfo;
}

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
    private geminiService: GeminiService
  ) {}

  getBooks(genre: string): Observable<any[]> {
    const url = this.getUrlByGenre(genre);
    return this.http.get<{items?: BookItem[]}>(url).pipe(
      map(response => {
        const books = response.items || [];
        // Filter to only include books with valid cover images
        return books.filter((book: BookItem) => {
          // Check if the book has valid image links
          return book.volumeInfo?.imageLinks?.thumbnail || 
                 book.volumeInfo?.imageLinks?.smallThumbnail || 
                 book.volumeInfo?.imageLinks?.medium;
        });
      })
    );
  }

  private getUrlByGenre(genre: string): string {
    let apiUrl: string;
    const formattedGenre = genre.toLowerCase().replace(/ /g, '-');
    
    const maxResults = 40;
    const langRestrict = 'uk,en';
    const params = `&maxResults=${maxResults}&langRestrict=${langRestrict}&key=${this.global.apiKey}&fields=items(id,volumeInfo)`;
    
    switch (formattedGenre) {
      case 'business':
      case 'бізнес':
        this.category = 'Business';
        apiUrl = `${this.baseApiUrl}business${params}`;
        break;
      case 'classics':
      case 'класика':
        this.category = 'Classics';
        apiUrl = `${this.baseApiUrl}classics${params}`;
        break;
      case 'comics':
      case 'комікси':
        this.category = 'Comics';
        apiUrl = `${this.baseApiUrl}comics${params}`;
        break;
      case 'fantasy':
      case 'фентезі':
        this.category = 'Fantasy';
        apiUrl = `${this.baseApiUrl}fantasy${params}`;
        break;
      case 'fiction':
      case 'художня-література':
        this.category = 'Fiction';
        apiUrl = `${this.baseApiUrl}fiction${params}`;
        break;
      case 'horror':
      case 'жахи':
        this.category = 'Horror';
        apiUrl = `${this.baseApiUrl}horror${params}`;
        break;
      case 'non-fiction':
      case 'нехудожня-література':
        this.category = 'Non Fiction';
        apiUrl = `${this.baseApiUrl}non-fiction${params}`;
        break;
      case 'romance':
      case 'романтика':
        this.category = 'Romance';
        apiUrl = `${this.baseApiUrl}romance${params}`;
        break;
      case 'science-fiction':
      case 'наукова-фантастика':
        this.category = 'Science Fiction';
        apiUrl = `${this.baseApiUrl}science-fiction${params}`;
        break;
      case 'mystery':
      case 'детектив':
        this.category = 'Mystery';
        apiUrl = `${this.baseApiUrl}mystery${params}`;
        break;
      default:
        this.category = genre || 'All';
        if (!genre) {
          apiUrl = `https://www.googleapis.com/books/v1/volumes?q=subject:popular${params}`;
        } else {
          apiUrl = `${this.baseApiUrl}${formattedGenre}${params}`;
        }
    }

    console.log(`API URL for genre '${genre}':`, apiUrl);
    return apiUrl;
  }
  
  searchBooks(query: string): Observable<any> {
    return this.http.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${this.global.apiKey}&maxResults=20`);
  }
  
  getBookDetails(id: string): Observable<BookDetails> {
    return this.http.get<any>(`${this.ApiUrl}${id}`).pipe(
      mergeMap(response => {
        let coverUrl = 'assets/no-cover.png';
        if (response.volumeInfo?.imageLinks) {
          coverUrl = response.volumeInfo.imageLinks.thumbnail || 
                    response.volumeInfo.imageLinks.smallThumbnail ||
                    response.volumeInfo.imageLinks.medium ||
                    'assets/no-cover.png';
        }
        
        if (coverUrl && coverUrl.startsWith('http:')) {
          coverUrl = coverUrl.replace('http:', 'https:');
        }
        
        let genre = this.category;
        if (response.volumeInfo?.categories && response.volumeInfo.categories.length > 0) {
          genre = response.volumeInfo.categories[0];
        }
        
        const bookDetails: BookDetails = {
          key: response.id,
          title: response.volumeInfo?.title || 'Невідома назва',
          genre: genre,
          rating: response.volumeInfo?.averageRating || 0,
          pages: response.volumeInfo?.pageCount || 0,
          publish_date: response.volumeInfo?.publishedDate || '',
          author_name: response.volumeInfo?.authors ? response.volumeInfo.authors.join(', ') : 'Невідомий автор',
          cover_url: coverUrl,
          description: response.volumeInfo?.description || 'Опис відсутній',
          keywords: []
        };
        
        if (bookDetails.description && bookDetails.description !== 'Опис відсутній') {
          return this.extractKeywordsUsingGemini(bookDetails.description, bookDetails.title).pipe(
            map(keywords => {
              bookDetails.keywords = keywords;
              return bookDetails;
            })
          );
        }
        
        bookDetails.keywords = this.fallbackKeywordExtraction(bookDetails.title, '');
        return of(bookDetails);
      }),
      catchError(error => {
        console.error('Error fetching book details:', error);
        return of({
          key: id,
          title: 'Помилка завантаження даних',
          genre: 'Невідомо',
          rating: 0,
          pages: 0,
          publish_date: '',
          author_name: 'Невідомий автор',
          cover_url: 'assets/no-cover.png',
          description: 'Не вдалося завантажити опис книги',
          keywords: []
        });
      })
    );
  }

  extractKeywordsUsingGemini(description: string, title: string): Observable<string[]> {
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
          const cleanedResponse = response.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          
          if (parsed.genre) {
            this.category = parsed.genre;
          }
          
          return parsed.keywords || [];
        } catch (error) {
          console.error('Error parsing Gemini response:', error, 'Response was:', response);
          return this.fallbackKeywordExtraction(description, title);
        }
      }),
      catchError(error => {
        console.error('Error with Gemini API:', error);
        return of(this.fallbackKeywordExtraction(description, title));
      })
    );
  }

  private fallbackKeywordExtraction(description: string, title: string): string[] {
    const keywords = new Set<string>();
    
    title.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .forEach(word => keywords.add(word));
    
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

  getRecommendationsByKeywords(keywords: string[], excludeIds: string[] = []): Observable<any[]> {
    const topKeywords = keywords.slice(0, 5);
    
    const searchRequests = topKeywords.map(keyword => 
      this.searchBooksByKeyword(keyword).pipe(
        catchError(error => {
          console.error(`Error searching for keyword ${keyword}:`, error);
          return of([]);
        })
      )
    );
    
    return forkJoin(searchRequests).pipe(
      map(results => {
        const allBooks = results.flat();
        const uniqueBooks = this.removeDuplicates(allBooks);
        
        if (excludeIds.length > 0) {
          return uniqueBooks.filter(book => !excludeIds.includes(book.key));
        }
        
        return uniqueBooks;
      })
    );
  }

  searchBooksByKeyword(keyword: string): Observable<any[]> {
    return this.http.get<{items?: BookItem[]}>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keyword)}&key=${this.global.apiKey}&maxResults=10`).pipe(
      map(response => {
        if (response && response.items && response.items.length > 0) {
          // Filter to only include books with covers
          const booksWithCovers = response.items.filter((item: BookItem) => 
            item.volumeInfo?.imageLinks?.thumbnail || 
            item.volumeInfo?.imageLinks?.smallThumbnail || 
            item.volumeInfo?.imageLinks?.medium
          );
          return booksWithCovers.map((item: BookItem) => this.mapGoogleBookToBookDetails(item, keyword));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error with Google Books API, falling back to OpenLibrary:', error);
        return this.searchBooksByKeywordOpenLibrary(keyword);
      })
    );
  }

  private searchBooksByKeywordOpenLibrary(keyword: string): Observable<any[]> {
    const params = new HttpParams()
      .set('q', keyword)
      .set('limit', '10')
      .set('has_fulltext', 'true'); // Prefer books with full text which often have covers
    
    return this.http.get(`${this.openLibraryApi}`, { params }).pipe(
      map((response: any) => {
        if (response.docs && response.docs.length > 0) {
          // Filter to only include books with cover IDs
          const docsWithCovers = response.docs.filter((doc: any) => doc.cover_i);
          return docsWithCovers.map((doc: any) => this.mapOpenLibraryToBookDetails(doc, keyword));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error with OpenLibrary API:', error);
        return of([]);
      })
    );
  }

  private mapGoogleBookToBookDetails(item: any, sourceKeyword: string): any {
    if (!item.volumeInfo) return null;
    
    // Extract author information with proper fallback
    const authors = item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Невідомий автор';
    
    // Extract cover URL with multiple fallbacks
    let coverUrl = 'assets/no-cover.png';
    if (item.volumeInfo.imageLinks) {
      coverUrl = item.volumeInfo.imageLinks.thumbnail || 
                item.volumeInfo.imageLinks.smallThumbnail ||
                item.volumeInfo.imageLinks.medium ||
                'assets/no-cover.png';
    }
    
    // Fix protocol for Google Books image URLs (prevent mixed content)
    if (coverUrl && coverUrl.startsWith('http:')) {
      coverUrl = coverUrl.replace('http:', 'https:');
    }
    
    // Make sure genres are properly extracted
    let genre = sourceKeyword;
    if (item.volumeInfo.categories && item.volumeInfo.categories.length > 0) {
      genre = item.volumeInfo.categories[0];
    }
    
    return {
      id: item.id,
      key: item.id,
      title: item.volumeInfo.title || 'Невідома назва',
      author_name: authors,
      cover_url: coverUrl,
      status: 'Recommended',
      isEditing: false,
      rating: item.volumeInfo.averageRating || 0,
      booksadded: new Date(),
      dateread: null,
      genre: genre,
      description: item.volumeInfo.description || 'Опис відсутній',
      keywords: this.extractKeywordsFromText(item.volumeInfo.title + ' ' + 
               (item.volumeInfo.description || '') + ' ' + 
               (item.volumeInfo.categories ? item.volumeInfo.categories.join(' ') : ''),
               sourceKeyword)
    };
  }

  private mapOpenLibraryToBookDetails(doc: any, sourceKeyword: string): any {
    // Extract author information with proper fallback
    const authors = doc.author_name ? doc.author_name.join(', ') : 'Невідомий автор';
    
    // Extract cover URL with fallback
    const coverId = doc.cover_i ? doc.cover_i : null;
    let coverUrl = 'assets/no-cover.png';
    
    if (coverId) {
      // Try to get the medium size cover first, fallback to small
      coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    }
    
    // Extract genre information with fallback
    let genre = sourceKeyword;
    if (doc.subject && doc.subject.length > 0) {
      genre = doc.subject[0];
    }
    
    // Extract description with fallback
    let description = 'Опис відсутній';
    if (doc.first_sentence && Array.isArray(doc.first_sentence)) {
      description = doc.first_sentence.join('. ');
    } else if (doc.first_sentence) {
      description = doc.first_sentence;
    }
    
    return {
      id: doc.key || '',
      key: doc.key || '',
      title: doc.title || 'Невідома назва',
      author_name: authors,
      cover_url: coverUrl,
      status: 'Recommended',
      isEditing: false,
      rating: 0,
      booksadded: new Date(),
      dateread: null,
      genre: genre,
      description: description,
      keywords: this.extractKeywordsFromOpenLibrary(doc, sourceKeyword)
    };
  }

  private extractKeywordsFromText(text: string, sourceKeyword: string): string[] {
    const keywords = new Set<string>();
    
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
      .slice(0, 20)
      .forEach(word => keywords.add(word));
    
    return Array.from(keywords);
  }

  private extractKeywordsFromOpenLibrary(doc: any, sourceKeyword: string): string[] {
    const keywords = new Set<string>();
    
    if (doc.title) {
      doc.title.toLowerCase()
        .replace(/[^\w\s]/gi, '')
        .split(/\s+/)
        .filter((word: string | any[]) => word.length > 3)
        .forEach((word: string) => keywords.add(word));
    }
    
    if (doc.author_name) {
      doc.author_name.forEach((author: string) => {
        keywords.add(author.toLowerCase());
      });
    }
    
    if (doc.subject) {
      doc.subject.slice(0, 5).forEach((subject: string) => {
        keywords.add(subject.toLowerCase());
      });
    }
    
    keywords.add(sourceKeyword.toLowerCase());
    
    return Array.from(keywords);
  }

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