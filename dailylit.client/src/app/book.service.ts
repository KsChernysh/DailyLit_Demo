import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, BehaviorSubject, merge } from 'rxjs';
import { map, catchError, mergeMap, tap, switchMap, delay } from 'rxjs/operators';
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
  private baseApiUrl = 'https://www.googleapis.com/books/v1/volumes?q=';
  private ApiUrl = 'https://www.googleapis.com/books/v1/volumes/';
  private openLibraryApi = 'https://openlibrary.org/search.json';
  private gutendexApi = 'https://gutendex.com/books';
  
  // Розширений список жанрів з більш точними пошуковими термінами
  genres: string[] = [
    'Fantasy', 'Science Fiction', 'Mystery', 'Non Fiction', 'Romance',
    'Business', 'Classics', 'Comics', 'Fiction', 'Horror', 'Adventure',
    'Thriller', 'Biography', 'History', 'Poetry', 'Self-Help', 'Philosophy'
  ];
  
  // Жанри українською для відображення
  genresUkrainian: { [key: string]: string } = {
    'Fantasy': 'Фентезі',
    'Science Fiction': 'Наукова фантастика',
    'Mystery': 'Детектив',
    'Non Fiction': 'Документальна література',
    'Romance': 'Романтика',
    'Business': 'Бізнес',
    'Classics': 'Класика',
    'Comics': 'Комікси',
    'Fiction': 'Художня література',
    'Horror': 'Жахи',
    'Adventure': 'Пригоди',
    'Thriller': 'Трилер',
    'Biography': 'Біографія',
    'History': 'Історія',
    'Poetry': 'Поезія',
    'Self-Help': 'Саморозвиток',
    'Philosophy': 'Філософія'
  };
  
  // Кешування результатів для покращення продуктивності
  private booksCache: Map<string, any[]> = new Map();
  private loadingStatus = new BehaviorSubject<boolean>(false);
  
  category: string = '';
  
  constructor(
    private http: HttpClient, 
    private global: GlobalVariablesService,
    private geminiService: GeminiService
  ) {}

  get isLoading$(): Observable<boolean> {
    return this.loadingStatus.asObservable();
  }

  getBooks(genre: string): Observable<any[]> {
    this.loadingStatus.next(true);
    
    // Перевіряємо кеш перед запитом
    const cacheKey = `${genre.toLowerCase()}_${this.global.sortOption}`;
    if (this.booksCache.has(cacheKey)) {
      console.log(`Using cached results for "${genre}" with sort: ${this.global.sortOption}`);
      this.loadingStatus.next(false);
      return of(this.booksCache.get(cacheKey) || []);
    }
    
    // Об'єднуємо кілька джерел для отримання більшої кількості книг
    return this.fetchBooksFromMultipleSources(genre).pipe(
      tap(books => {
        this.booksCache.set(cacheKey, books);
        this.loadingStatus.next(false);
      })
    );
  }
  
  private fetchBooksFromMultipleSources(genre: string): Observable<any[]> {
    // Визначаємо спостерігачі для різних API
    const googleBooksObservable = this.fetchGoogleBooks(genre);
    const openLibraryObservable = this.searchOpenLibraryForGenre(genre);
    
    // Використовуємо ForkJoin для паралельного виконання запитів
    return forkJoin([
      googleBooksObservable,
      openLibraryObservable
    ]).pipe(
      map(([googleBooks, openLibraryBooks]) => {
        // Об'єднуємо книги з різних джерел
        const allBooks = [...googleBooks, ...openLibraryBooks];
        
        // Видаляємо дублікати за назвою та автором
        const uniqueBooks = this.removeDuplicateBooks(allBooks);
        
        console.log(`Total unique books for ${genre}: ${uniqueBooks.length}`);
        
        // Сортуємо згідно з обраною опцією
        return this.sortBooks(uniqueBooks);
      }),
      catchError(error => {
        console.error(`Error fetching books from multiple sources for genre ${genre}:`, error);
        return of([]);
      })
    );
  }
  
  private fetchGoogleBooks(genre: string): Observable<any[]> {
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
      }),
      // Якщо первинний пошук не дав достатньо результатів, спробуємо резервний пошук
      switchMap(books => {
        if (books.length < 10 && genre) {
          console.log(`Primary search for ${genre} returned only ${books.length} books, trying fallback search...`);
          return this.getFallbackBooks(genre).pipe(
            map(fallbackBooks => [...books, ...fallbackBooks])
          );
        }
        return of(books);
      }),
      catchError(error => {
        console.error('Error fetching books by genre from Google Books API:', error);
        return this.getFallbackBooks(genre);
      })
    );
  }

  // Метод для отримання запасних книг, якщо основний запит не спрацював
  private getFallbackBooks(genre: string): Observable<any[]> {
    // Використовуємо альтернативний спосіб пошуку з інтелектуальними комбінаціями запитів
    const formattedGenre = genre.toLowerCase();
    
    // Створюємо різноманітні форми запиту для пошуку
    const queryFormats = [
      `${formattedGenre}`,
      `"${formattedGenre}"`,
      `subject:${formattedGenre}`,
      `insubject:${formattedGenre}`,
      `"best ${formattedGenre} books"`,
      `popular ${formattedGenre}`,
      `${formattedGenre} fiction`,
      `inauthor:"${this.getProminentAuthorByGenre(formattedGenre)}"` 
    ];
    
    // Створюємо масив запитів до API для різних форматів пошуку
    const searchRequests = queryFormats.map(queryFormat => {
      const query = encodeURIComponent(queryFormat);
      console.log(`Trying fallback search with query: ${queryFormat}`);
      
      return this.http.get<{items?: BookItem[]}>(`${this.baseApiUrl}${query}&maxResults=15&printType=books&orderBy=relevance&key=${this.global.apiKey}`).pipe(
        map(response => response.items || []),
        catchError(error => {
          console.error(`Error with fallback search query ${queryFormat}:`, error);
          return of([]);
        })
      );
    });
    
    // Об'єднуємо результати всіх запитів
    return forkJoin(searchRequests).pipe(
      map(resultsArray => {
        // Витягуємо всі книги з результатів
        const allBooks = resultsArray.flat();
        
        // Фільтруємо книги з обкладинками
        const booksWithCovers = allBooks.filter(book => 
          book.volumeInfo?.imageLinks?.thumbnail || 
          book.volumeInfo?.imageLinks?.smallThumbnail || 
          book.volumeInfo?.imageLinks?.medium
        );
        
        // Видаляємо дублікати
        return this.removeDuplicateBooks(booksWithCovers);
      }),
      catchError(error => {
        console.error('Error with all fallback searches:', error);
        return of([]);
      })
    );
  }
  
  // Отримання відомого автора за жанром для покращення пошуку
  private getProminentAuthorByGenre(genre: string): string {
    const genreAuthors = {
      'fantasy': 'J.K. Rowling',
      'science fiction': 'Isaac Asimov',
      'mystery': 'Agatha Christie',
      'non fiction': 'Malcolm Gladwell',
      'romance': 'Jane Austen',
      'business': 'Peter Drucker',
      'classics': 'Fyodor Dostoevsky',
      'comics': 'Alan Moore',
      'fiction': 'George Orwell',
      'horror': 'Stephen King',
      'adventure': 'Jules Verne',
      'thriller': 'Dan Brown',
      'biography': 'Walter Isaacson',
      'history': 'Yuval Noah Harari',
      'poetry': 'Robert Frost',
      'self-help': 'Dale Carnegie',
      'philosophy': 'Friedrich Nietzsche'
    };
    
    return genreAuthors[genre as keyof typeof genreAuthors] || '';
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
  // Новий метод для сортування книг за різними критеріями
  private sortBooks(books: any[]): any[] {
    const sortOption = this.global.sortOption;
    console.log('Sorting books by:', sortOption);
    
    if (!books || books.length === 0) return [];
    
    switch (sortOption) {
      case 'title':
        // Сортування за назвою (A-Z)
        return books.sort((a, b) => {
          const titleA = a.volumeInfo?.title || '';
          const titleB = b.volumeInfo?.title || '';
          return titleA.localeCompare(titleB);
        });
        
      case 'newest':
        // Сортування за датою публікації (спочатку нові)
        return books.sort((a, b) => {
          const dateA = a.volumeInfo?.publishedDate ? new Date(a.volumeInfo.publishedDate) : new Date(0);
          const dateB = b.volumeInfo?.publishedDate ? new Date(b.volumeInfo.publishedDate) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
      case 'rating':
        // Сортування за рейтингом (спочатку високий)
        return books.sort((a, b) => {
          const ratingA = a.volumeInfo?.averageRating || 0;
          const ratingB = b.volumeInfo?.averageRating || 0;
          return ratingB - ratingA;
        });
        
      case 'relevance':
      default:
        // За замовчуванням - не змінюємо порядок, який повертає API
        return books;
    }
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
  // Видалення дублікатів книг за назвою та автором
  private removeDuplicateBooks(books: any[]): any[] {
    const uniqueBooks: any[] = [];
    const seenBooks = new Set();
    
    books.forEach(book => {
      const title = book.volumeInfo?.title || '';
      const author = book.volumeInfo?.authors ? book.volumeInfo.authors[0] : '';
      const key = `${title}|${author}`.toLowerCase();
      
      if (!seenBooks.has(key) && title && author) {
        seenBooks.add(key);
        uniqueBooks.push(book);
      }
    });
    
    return uniqueBooks;
  }

  private getUrlByGenre(genre: string): string {
    let apiUrl: string;
    
    // Збільшуємо максимальну кількість результатів до максимально можливої
    const maxResults = 40; // Google Books API обмежує максимум до 40
    
    // Покращені параметри запиту, не обмежуємо мову для більшої кількості результатів
    const params = `&maxResults=${maxResults}&key=${this.global.apiKey}&printType=books&orderBy=relevance`;
    
    // Вдосконалені пошукові запити для різних жанрів (англійською для API)
    const genreQueries: { [key: string]: string } = {
      'fantasy': 'subject:fantasy OR subject:"high fantasy" OR inauthor:tolkien OR inauthor:rowling OR inauthor:sanderson OR inauthor:"neil gaiman" OR "epic fantasy" OR "dragons" OR "magic" OR fantasy',
      
      'science fiction': 'subject:"science fiction" OR subject:scifi OR inauthor:asimov OR inauthor:dick OR inauthor:heinlein OR "space opera" OR "dystopian" OR "cyberpunk" OR "time travel" OR "alien" OR "science fiction"',
      
      'mystery': 'subject:mystery OR subject:detective OR subject:crime OR inauthor:christie OR inauthor:doyle OR inauthor:connelly OR "murder mystery" OR "whodunit" OR "detective" OR mystery',
      
      'non fiction': 'subject:"non fiction" OR subject:biography OR subject:history OR subject:science OR subject:memoir OR subject:"true story" OR "non fiction" OR "non-fiction"',
      
      'romance': 'subject:romance OR subject:"love story" OR inauthor:"nicholas sparks" OR inauthor:"jane austen" OR "love story" OR "relationship" OR "romance novel" OR romance',
      
      'business': 'subject:business OR subject:economics OR subject:management OR subject:finance OR subject:entrepreneurship OR subject:marketing OR subject:leadership OR business',
      
      'classics': 'subject:classics OR subject:"classic literature" OR inauthor:dostoyevsky OR inauthor:austen OR inauthor:dickens OR inauthor:shakespeare OR inauthor:hemingway OR classics',
      
      'comics': 'subject:comics OR subject:"graphic novel" OR subject:manga OR "comic book" OR "superhero" OR comics OR "graphic novels"',
      
      'fiction': 'subject:fiction NOT "science fiction" NOT fantasy OR subject:"literary fiction" OR subject:"contemporary fiction" OR fiction',
      
      'horror': 'subject:horror OR subject:supernatural OR inauthor:"stephen king" OR inauthor:lovecraft OR "ghost story" OR "monster" OR "terror" OR horror',
      
      'adventure': 'subject:adventure OR subject:action OR subject:exploration OR "journey" OR "quest" OR "expedition" OR adventure',
      
      'thriller': 'subject:thriller OR subject:suspense OR subject:"psychological thriller" OR subject:espionage OR "crime thriller" OR "legal thriller" OR thriller',
      
      'biography': 'subject:biography OR subject:autobiography OR subject:memoir OR "life story" OR "personal history" OR biography',
      
      'history': 'subject:history OR subject:historical OR subject:civilization OR subject:"world war" OR subject:"military history" OR history',
      
      'poetry': 'subject:poetry OR subject:poems OR subject:verse OR subject:sonnets OR "anthology" OR "collected poems" OR poetry',
      
      'self-help': 'subject:"self-help" OR subject:"personal development" OR subject:psychology OR subject:motivation OR "self improvement" OR "personal growth" OR "self-help"',
      
      'philosophy': 'subject:philosophy OR subject:ethics OR subject:metaphysics OR inauthor:nietzsche OR inauthor:plato OR inauthor:kant OR philosophy'
    };
    
    console.log(`Searching for genre: "${genre}"`);
    
    // Отримуємо відформатований жанр для запиту (все в нижньому регістрі)
    const formattedGenre = genre.toLowerCase();
    
    // Комбінуємо декілька стратегій пошуку
    if (genreQueries[formattedGenre]) {
      this.category = genre || 'All';
      const query = encodeURIComponent(genreQueries[formattedGenre]);
      apiUrl = `${this.baseApiUrl}${query}${params}`;
      console.log(`Using enhanced query for "${genre}": ${query}`);
    } 
    // Запит для порожнього жанру (всі книги)
    else if (!genre) {
      const defaultQuery = encodeURIComponent('bestseller OR popular OR recommended OR "top books" OR "award winning" OR "new release"');
      apiUrl = `${this.baseApiUrl}${defaultQuery}${params}`;
      console.log(`Using default query: ${defaultQuery}`);
    } 
    // Базовий запит для інших жанрів
    else {
      // Більш точне форматування запиту
      const formattedQuery = encodeURIComponent(`subject:"${formattedGenre}" OR genre:"${formattedGenre}" OR ${formattedGenre}`);
      apiUrl = `${this.baseApiUrl}${formattedQuery}${params}`;
      console.log(`Using basic query for "${genre}": ${formattedQuery}`);
    }

    return apiUrl;
  }
  
  // Метод для пошуку книг в Open Library API за жанром
  private searchOpenLibraryForGenre(genre: string): Observable<any[]> {
    if (!genre) {
      return of([]);
    }
    
    const formattedGenre = genre.toLowerCase();
    const query = encodeURIComponent(`subject:${formattedGenre}`);
    
    const params = new HttpParams()
      .set('q', query)
      .set('limit', '20')
      .set('fields', 'key,title,author_name,cover_i,first_sentence,subject');
    
    console.log(`Searching Open Library for genre: ${genre}`);
    
    return this.http.get(`${this.openLibraryApi}`, { params }).pipe(
      map((response: any) => {
        if (response.docs && response.docs.length > 0) {
          // Фільтруємо тільки книги з обкладинками
          const docsWithCovers = response.docs.filter((doc: any) => doc.cover_i);
          
          // Перетворюємо до формату, сумісного з Google Books API
          return docsWithCovers.map((doc: any) => this.convertOpenLibraryToGoogleFormat(doc, formattedGenre));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error searching Open Library:', error);
        return of([]);
      })
    );
  }
  
  // Конвертація формату Open Library у формат Google Books API для сумісності
  private convertOpenLibraryToGoogleFormat(doc: any, genre: string): any {
    // Створюємо обкладинку з ID обкладинки Open Library
    const coverUrl = doc.cover_i 
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` 
      : null;
    
    // Витягуємо базову інформацію про книгу
    const authors = doc.author_name || ['Unknown Author'];
    
    // Створюємо опис за наявним першим реченням або використовуємо жанр
    let description = 'No description available.';
    if (doc.first_sentence && typeof doc.first_sentence === 'string') {
      description = doc.first_sentence;
    } else if (doc.first_sentence && Array.isArray(doc.first_sentence) && doc.first_sentence.length > 0) {
      description = doc.first_sentence.join(' ');
    }
    
    // Повертаємо у форматі, сумісному з Google Books API
    return {
      id: `ol_${doc.key}`.replace(/\//g, '_'),
      volumeInfo: {
        title: doc.title,
        authors: authors,
        description: description,
        categories: [genre],
        publishedDate: doc.first_publish_year ? `${doc.first_publish_year}` : '',
        imageLinks: {
          thumbnail: coverUrl,
          smallThumbnail: coverUrl
        },
        // Додаємо додатковий маркер для визначення джерела
        source: 'openlibrary'
      }
    };
  }

  private extractKeywordsFromText(text: string, defaultKeyword: string): string[] {
    if (!text || text.length < 10) {
      return [defaultKeyword];
    }
    
    const keywords = new Set<string>();
    const stopWords = new Set([
      'the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
      'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'from', 'as', 
      'that', 'this', 'these', 'those', 'it', 'its', 'book', 'novel', 'story'
    ]);
    
    // Додаємо ключове слово за замовчуванням, якщо воно надане
    if (defaultKeyword) {
      keywords.add(defaultKeyword);
    }
    
    // Видаляємо спеціальні символи та розбиваємо на слова
    text.toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 4 && !stopWords.has(word))
      .forEach(word => keywords.add(word));
    
    // Обмежуємо кількість ключових слів
    return Array.from(keywords).slice(0, 10);
  }

  private removeDuplicates(books: any[]): any[] {
    const uniqueBooks: any[] = [];
    const seenIds = new Set();
    
    books.forEach(book => {
      if (book && book.id && !seenIds.has(book.id)) {
        seenIds.add(book.id);
        uniqueBooks.push(book);
      }
    });
    
    return uniqueBooks;
  }
}