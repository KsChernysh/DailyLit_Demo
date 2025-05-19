import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BookService } from '../book.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { GeminiService } from '../gemini.service';

@Component({
  selector: 'app-shelf-detail',
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.css']
})
export class ShelfDetailComponent implements OnInit {
  title: string = '';
  books: BookDetails[] = [];
  recommendedBooks: BookDetails[] = [];
  book: any;
  
  updatedBook: any;
  shelfId: number = 0;
  isEditing: boolean = false;
  id: string = '';
  api: string = "https://localhost:7172/api/Books";
  message: string = '';
  showRecommendations: boolean = false;
  isLoadingRecommendations: boolean = false;
  
  // Для ML-подібного алгоритму рекомендацій
  private userProfile: Map<string, number> = new Map();
  private bookFeatures: Map<string, number[]> = new Map();
  
  // Додаткові змінні для рекомендацій
  apiQuotaExceeded: boolean = false;
  showFallbackRecommendations: boolean = false;
  fallbackRecommendations: BookDetails[] = [];
  
  constructor(
    private route: ActivatedRoute, 
    private router: Router, 
    private http: HttpClient, 
    private bookService: BookService,
    private geminiService: GeminiService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      this.title = paramMap.get('title') || '';
      this.loadBooks();
      
      // На випадок, якщо рекомендації не завантажаться
      setTimeout(() => {
        if (this.recommendedBooks.length === 0 && !this.isLoadingRecommendations) {
          this.getDefaultRecommendations();
        }
      }, 5000); // 5 секунд тайм-аут
    });
  }

  loadBooks(): void {
    const encodedTitle = this.title;

    this.http.get(`${this.api}/books?shelfName=${encodedTitle}`, { withCredentials: true }).subscribe(
      data => {
        console.log('Books loaded:', data);
        this.books = (data as any[]).map((item: any) => ({
          id: item.id,
          title: item.title || 'No Title',
          author_name: item.author || 'No Author',
          cover_url: item.cover_Url || 'assets/no-cover.png',
          status: item.status || 'No Status',
          key: item.key || 'No Key',
          isEditing: false,
          rating: item.rating || 0,
          booksadded: item.booksadded || new Date(),
          dateread: item.dateread,
          genre: item.genre || '',
          keywords: item.keywords || this.extractKeywords(item)
        }));
        
        // Будуємо модель рекомендацій після завантаження книг
        this.buildRecommendationModel();
      },
      (error) => {
        this.message = 'Error loading books.';
        console.error('Error loading books:', error);
      }
    );
  }

  // Метод для вилучення ключових слів з книги
  private extractKeywords(book: any): string[] {
    const keywords: string[] = [];
    
    // Додаємо заголовок як ключові слова
    if (book.title) {
      keywords.push(...this.splitWords(book.title));
    }
    
    // Додаємо автора
    if (book.author) {
      keywords.push(book.author.toLowerCase());
    }
    
    // Додаємо жанр
    if (book.genre) {
      keywords.push(book.genre.toLowerCase());
    }
    
    return [...new Set(keywords)]; // Видаляємо дублікати
  }

  // Розбиває текст на окремі слова
  private splitWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, '') // Видаляємо пунктуацію
      .split(/\s+/) // Розбиваємо по пробілах
      .filter(word => word.length > 2); // Ігноруємо короткі слова
  }

  // Будуємо модель на основі книг користувача
  private buildRecommendationModel(): void {
    // Скидаємо попередні дані
    this.userProfile = new Map();
    this.bookFeatures = new Map();
    
    // Збираємо всі унікальні ключові слова з усіх книг
    const allKeywords = new Set<string>();
    this.books.forEach(book => {
      (book.keywords || []).forEach(keyword => {
        allKeywords.add(keyword);
      });
    });
    
    // Конвертуємо ключові слова в індекси для векторного представлення
    const keywordToIndex = new Map<string, number>();
    Array.from(allKeywords).forEach((keyword, index) => {
      keywordToIndex.set(keyword, index);
    });
    
    // Для кожної книги створюємо вектор ознак
    this.books.forEach(book => {
      const features = new Array(allKeywords.size).fill(0);
      
      (book.keywords || []).forEach(keyword => {
        const index = keywordToIndex.get(keyword);
        if (index !== undefined) {
          features[index] = 1;
        }
      });
      
      this.bookFeatures.set(book.key, features);
      
      // Враховуємо рейтинг книги для профілю користувача
      if (book.rating && book.rating > 0) {
        const weight = book.rating;
        (book.keywords || []).forEach(keyword => {
          const currentScore = this.userProfile.get(keyword) || 0;
          this.userProfile.set(keyword, currentScore + weight);
        });
      }
    });
    
    console.log('User profile built:', this.userProfile);
    console.log('Book features extracted:', this.bookFeatures.size);
  }

  // Запит на рекомендації з підтримкою двомовного пошуку
  getRecommendations(): void {
    this.isLoadingRecommendations = true;
    this.showFallbackRecommendations = false;
    this.fallbackRecommendations = [];
    this.apiQuotaExceeded = false;
    
    // Перевіряємо наявність книг на полиці
    if (this.books.length === 0) {
      this.getDefaultRecommendations();
      return;
    }
    
    // Отримуємо жанри книг
    const genres = this.books
      .map(book => book.genre)
      .filter(genre => genre && genre.trim() !== '');
    
    if (genres.length === 0) {
      // Якщо немає жанрів, використовуємо дефолтний жанр "fiction"
      this.getFallbackRecommendationsByGenre('fiction');
      return;
    }
    
    // Обираємо випадковий жанр із наявних
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    
    // Запит на рекомендації англійською мовою для більш точних результатів
    this.http.get<any>(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(randomGenre || 'fiction')}&maxResults=10&langRestrict=en`
    ).subscribe(
      response => {
        if (response && response.items && response.items.length > 0) {
          // Конвертуємо відповідь API в формат BookDetails
          this.recommendedBooks = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'Без назви',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Невідомий автор',
            cover_url: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : 'assets/no-cover.png',
            status: 'Рекомендовано',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories ? item.volumeInfo.categories[0] : randomGenre,
            isEditing: false,
            booksadded: new Date(),
            dateread: null
          }));
          
          // Виключаємо книги, які вже є на полиці
          const existingKeys = this.books.map(book => book.key);
          this.recommendedBooks = this.recommendedBooks.filter(book => !existingKeys.includes(book.key));
          
          if (this.recommendedBooks.length === 0) {
            // Якщо після фільтрації не залишилось рекомендацій, шукаємо за іншим жанром
            this.getFallbackRecommendationsByGenre('fiction');
          }
        } else {
          // Якщо API не повернув результатів, використовуємо запасний варіант
          this.getFallbackRecommendationsByGenre('fiction');
        }
        this.isLoadingRecommendations = false;
      },
      error => {
        console.error('Помилка отримання рекомендацій:', error);
        this.apiQuotaExceeded = true;
        // При помилці використовуємо запасний варіант
        this.getFallbackRecommendationsByGenre('fiction');
      }
    );
  }

  // Додайте цей метод для отримання запасних рекомендацій за жанром
  getFallbackRecommendationsByGenre(genre: string): void {
    // Запит англійською мовою для кращих результатів
    this.http.get<any>(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&orderBy=relevance&maxResults=10&langRestrict=en`
    ).subscribe(
      response => {
        if (response && response.items && response.items.length > 0) {
          this.recommendedBooks = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'Без назви',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Невідомий автор',
            cover_url: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : 'assets/no-cover.png',
            status: 'Рекомендовано',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories ? item.volumeInfo.categories[0] : genre,
            isEditing: false,
            booksadded: new Date(),
            dateread: null
          }));
        } else {
          this.recommendedBooks = [];
        }
        this.isLoadingRecommendations = false;
      },
      error => {
        console.error('Помилка отримання запасних рекомендацій:', error);
        this.recommendedBooks = [];
        this.isLoadingRecommendations = false;
        this.message = 'Не вдалося завантажити рекомендації';
      }
    );
  }

  // Додайте цей метод для завантаження дефолтних рекомендацій
  getDefaultRecommendations(): void {
    this.isLoadingRecommendations = true;
    this.showFallbackRecommendations = true;
    
    // Масив популярних жанрів
    const popularGenres = ['fiction', 'fantasy', 'thriller', 'romance', 'science fiction'];
    const randomGenre = popularGenres[Math.floor(Math.random() * popularGenres.length)];
    
    // Використовуємо простий запит на популярні книги англійською мовою
    this.http.get<any>(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${randomGenre}&orderBy=relevance&maxResults=10&langRestrict=en`
    ).subscribe(
      response => {
        if (response && response.items && response.items.length > 0) {
          this.fallbackRecommendations = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'Без назви',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Невідомий автор',
            cover_url: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : 'assets/no-cover.png',
            status: 'Рекомендовано',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories ? item.volumeInfo.categories[0] : randomGenre,
            isEditing: false,
            booksadded: new Date(),
            dateread: null
          }));
        } else {
          this.fallbackRecommendations = [];
        }
        this.isLoadingRecommendations = false;
      },
      error => {
        console.error('Помилка отримання дефолтних рекомендацій:', error);
        this.isLoadingRecommendations = false;
        this.fallbackRecommendations = [];
        this.showMessage('Не вдалося завантажити рекомендації');
      }
    );
  }

  // Аналіз опису книги за допомогою Gemini API для отримання ключових слів
  analyzeBookWithGemini(book: BookDetails): void {
    if (!book.description) {
      // Спочатку отримуємо детальний опис книги, якщо його немає
      this.bookService.getBookDetails(book.key).subscribe(
        details => {
          if (details.description) {
            this.extractKeywordsUsingGemini(book, details.description);
          } else {
            this.message = `Немає опису для аналізу книги: ${book.title}`;
          }
        },
        error => {
          console.error('Error getting book details:', error);
          this.message = `Помилка отримання опису книги: ${book.title}`;
        }
      );
      return;
    }
    
    // Якщо опис вже є, використовуємо його для аналізу
    this.extractKeywordsUsingGemini(book, book.description);
  }

  // Метод для витягування ключових слів з опису за допомогою Gemini
  private extractKeywordsUsingGemini(book: BookDetails, description: string): void {
    const prompt = `
    Проаналізуй опис книги "${book.title}" автора ${book.author_name} та визнач 10-15 найважливіших 
    ключових слів або фраз, які найкраще характеризують тематику, сюжет, настрій та ідеї книги.
    
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
    
    this.geminiService.generateContentWithGeminiPro(prompt, []).subscribe(
      response => {
        try {
          // Видаляємо markdown форматування, якщо воно є
          const cleanedResponse = response.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          
          // Оновлюємо книгу з отриманими даними
          book.genre = parsed.genre || book.genre;
          book.keywords = parsed.keywords || [];
          
          // Оновлюємо книгу в API
          this.updateBookMetadata(book);
          
          console.log('Аналіз книги завершено:', book.title, parsed);
          this.message = `Книгу "${book.title}" успішно проаналізовано!`;
          
          // Оновлюємо рекомендаційну модель
          this.buildRecommendationModel();
        } catch (error) {
          console.error('Error parsing Gemini response:', error, 'Response was:', response);
          this.message = `Помилка аналізу книги "${book.title}"`;
        }
      },
      error => {
        console.error('Error with Gemini API:', error);
        this.message = `Помилка API при аналізі книги "${book.title}"`;
      }
    );
  }

  // Метод для оновлення метаданих книги на сервері
  private updateBookMetadata(book: BookDetails): void {
    const payload = {
      status: book.status || '',
      rating: book.rating?.toString() || '0',
      genre: book.genre || '',
      keywords: book.keywords || []
    };
    
    this.http.post<any>(
      `${this.api}/update-book-metadata?shelfName=${this.title}&key=${book.key}`, 
      payload,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        }),
        withCredentials: true
      }
    ).subscribe(
      response => {
        console.log('Book metadata updated:', response);
      },
      error => {
        console.error('Error updating book metadata:', error);
      }
    );
  }

  // Додає рекомендовану книгу на полицю
  addToShelf(book: BookDetails): void {
    const payload = {
      title: book.title,
      author: book.author_name,
      cover_Url: book.cover_url,
      key: book.key,
      genre: book.genre || '',
      keywords: book.keywords || []
    };
    
    this.http.post<any>(
      `${this.api}/add-book?shelfName=${this.title}`, 
      payload,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        }),
        withCredentials: true
      }
    ).subscribe(
      response => {
        console.log('Book added:', response);
        // Видаляємо книгу з рекомендованих
        this.recommendedBooks = this.recommendedBooks.filter(b => b.key !== book.key);
        // Оновлюємо список книг
        this.loadBooks();
        this.message = 'Book added successfully to your shelf!';
        
        setTimeout(() => {
          this.message = '';
        }, 3000);
      },
      error => {
        console.error('Error adding book:', error);
        this.message = 'Error adding book.';
      }
    );
  }

  // Аналізувати всі книги на полиці за допомогою Gemini
  analyzeAllBooks(): void {
    if (this.books.length === 0) {
      this.message = 'No books to analyze.';
      return;
    }
    
    this.message = `Analyzing ${this.books.length} books. This may take some time...`;
    
    // Аналізуємо книги послідовно, щоб не перевантажувати API
    let index = 0;
    
    const analyzeNext = () => {
      if (index >= this.books.length) {
        this.message = 'All books analyzed successfully!';
        this.buildRecommendationModel(); // Перебудовуємо модель після аналізу всіх книг
        return;
      }
      
      const book = this.books[index++];
      this.message = `Analyzing book ${index}/${this.books.length}: "${book.title}"`;
      
      // Спочатку отримуємо детальний опис книги, якщо його немає
      if (!book.description) {
        this.bookService.getBookDetails(book.key).pipe(
          switchMap(details => {
            if (details.description) {
              return this.geminiAnalyzeBook(book, details.description);
            } else {
              console.log(`No description found for book: ${book.title}`);
              return of(null);
            }
          })
        ).subscribe(() => {
          // Переходимо до наступної книги після невеликої паузи
          setTimeout(analyzeNext, 2000);
        });
      } else {
        this.geminiAnalyzeBook(book, book.description).subscribe(() => {
          // Переходимо до наступної книги після невеликої паузи
          setTimeout(analyzeNext, 2000);
        });
      }
    };
    
    // Починаємо аналіз
    analyzeNext();
  }

  // Допоміжний метод для аналізу однієї книги за допомогою Gemini
  private geminiAnalyzeBook(book: BookDetails, description: string): Observable<any> {
    const prompt = `
    Проаналізуй опис книги "${book.title}" автора ${book.author_name} та визнач 10-15 найважливіших 
    ключових слів або фраз, які найкраще характеризують тематику, сюжет, настрій та ідеї книги.
    
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
      tap(response => {
        try {
          // Видаляємо markdown форматування, якщо воно є
          const cleanedResponse = response.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          
          // Оновлюємо книгу з отриманими даними
          book.genre = parsed.genre || book.genre;
          book.keywords = parsed.keywords || [];
          
          // Оновлюємо книгу в API
          this.updateBookMetadata(book);
          
          console.log('Book analysis completed:', book.title, parsed);
        } catch (error) {
          console.error('Error parsing Gemini response:', error, 'Response was:', response);
        }
      }),
      catchError(error => {
        console.error('Error with Gemini API:', error);
        return of(null);
      })
    );
  }

  // Існуючі методи компонента
  apicall(key: string) {
    this.bookService.getBookDetails(key).subscribe(
      data => {
        this.id = key;
        console.log(data);
        this.router.navigate([`/book/`, this.id]);
      }
    );
  }
  
  updateBook(book: any): void {
    this.updatedBook = { ...book };
    console.log('Before update:', this.updatedBook);

    let formattedDate = null;
    if (this.updatedBook.dateread) {
      const date = new Date(this.updatedBook.dateread);
      formattedDate = date.toISOString().split('T')[0];
    }

    const payload = {
      status: this.updatedBook.status ?? '',
      rating: this.updatedBook.rating?.toString() ?? '0',
      dateread: formattedDate,
      genre: this.updatedBook.genre || '',
      keywords: this.updatedBook.keywords || []
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));
    this.sendUpdate(payload);
  }

  sendUpdate(payload: any): void {
    this.http.post<any>(
      `${this.api}/update-book?shelfName=${this.title}&key=${this.updatedBook.key}`, 
      payload,
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        }),
        withCredentials: true
      }
    ).subscribe(
      response => {
        if (response) {
          this.book = response;
          this.isEditing = false;
          console.log('Book updated:', this.book);
          this.message = 'Book updated successfully';
          this.loadBooks();
          
          setTimeout(() => {
            this.message = '';
          }, 3000);
        }
      },
      error => {
        console.error('Error updating book:', error);
        this.message = 'Error updating book.';
      }
    );
  }

  deleteBook(key: string): void {
    if (confirm('Are you sure you want to delete this book?')) {
      this.http.delete<any>(`${this.api}/delete-book?shelfName=${this.title}&key=${key}`, { withCredentials: true }).subscribe(
        response => {
          if (response) {
            console.log('Book deleted:', response);
            this.loadBooks();
            this.message = 'Book deleted successfully';
            
            setTimeout(() => {
              this.message = '';
            }, 3000);
          }
        },
        error => {
          console.error('Error deleting book:', error);
          this.message = 'Error deleting book.';
        }
      );
    }
  }

  private showMessage(message: string): void {
    this.message = message;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
  
  // Оновлений метод setRating
  setRating(book: any, rating: number): void {
    if (book.isEditing) {
      book.rating = rating;
      console.log(`Встановлено рейтинг ${rating} для книги ${book.title}`);
    }
  }
  
  enableEditing(key: string): void {
    this.books.forEach(book => book.isEditing = false);
    this.updatedBook = this.books.find(book => book.key === key);
    if (this.updatedBook) {
      this.updatedBook.isEditing = true;
      console.log('Book to update:', this.updatedBook);
    }
  }
}

interface BookDetails { 
  id: string,
  title: string,
  isEditing: boolean,
  author_name: string,
  cover_url: string,
  status: string,
  rating: number,
  key: string,
  booksadded: Date,
  dateread: Date,
  genre?: string,
  keywords?: string[],
  description?: string
}

interface Book {
  status: string,
  rating: number,
  dateread: Date,
  key: string;
}
