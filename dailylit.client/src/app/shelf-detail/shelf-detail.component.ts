import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BookService } from '../book.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { GeminiService } from '../gemini.service';

// Інтерфейси для рекомендаційного алгоритму
interface BookDetails {
  id: number;
  title: string;
  author_name: string;
  cover_url: string;
  status: string;
  key: string;
  isEditing?: boolean;
  rating?: number;
  booksadded?: Date;
  dateread?: Date | null;
  genre?: string;
  keywords?: string[];
  pages?: number;
  description?: string;
}

interface RecommendationScore {
  bookKey: string;
  contentScore: number;
  collaborativeScore: number;
  demographicScore: number;
  hybridScore: number;
  explanation: string;
}

interface UserVector {
  genrePreferences: Map<string, number>;
  authorPreferences: Map<string, number>;
  keywordWeights: Map<string, number>;
  avgRating: number;
  readingFrequency: number;
  diversityScore: number;
}

interface BookVector {
  genres: string[];
  keywords: string[];
  author: string;
  popularity: number;
  avgRating: number;
  pageCount: number;
  publishYear?: number;
}

// Клас для гібридного рекомендаційного алгоритму
class RecommendationEngine {
  private userVector: UserVector;
  private simulatedUserData: Map<string, BookDetails[]> = new Map();

  constructor(private userBooks: BookDetails[]) {
    this.userVector = this.buildUserProfile(userBooks);
    this.initializeSimulatedData();
  }

  // Головний метод для отримання рекомендацій
  getRecommendations(candidateBooks: BookDetails[], maxResults: number = 10): RecommendationScore[] {
    const scores: RecommendationScore[] = [];
    
    for (const book of candidateBooks) {
      const contentScore = this.calculateContentBasedScore(book);
      const collaborativeScore = this.calculateCollaborativeScore(book);
      const demographicScore = this.calculateDemographicScore(book);
      
      // Гібридна формула: 50% контентні фільтри + 30% колаборативні + 20% демографічні
      const hybridScore = (contentScore * 0.5) + (collaborativeScore * 0.3) + (demographicScore * 0.2);
      
      const explanation = this.generateExplanation(book, contentScore, collaborativeScore, demographicScore);
      
      scores.push({
        bookKey: book.key,
        contentScore,
        collaborativeScore,
        demographicScore,
        hybridScore,
        explanation
      });
    }
    
    // Сортуємо за гібридним скором і повертаємо топ результати
    return scores
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, maxResults);
  }

  // Content-Based Filtering: аналіз подібності контенту
  private calculateContentBasedScore(book: BookDetails): number {
    let score = 0;
    
    // 1. Схожість жанрів (40% від контентного скору)
    const genreScore = this.calculateGenreSimilarity(book);
    score += genreScore * 0.4;
    
    // 2. Схожість ключових слів з використанням TF-IDF (35%)
    const keywordScore = this.calculateTFIDFSimilarity(book.keywords || [], this.userVector.keywordWeights);
    score += keywordScore * 0.35;
    
    // 3. Схожість авторів (15%)
    const authorScore = this.userVector.authorPreferences.get(book.author_name) || 0;
    score += Math.min(authorScore / 5, 1) * 0.15; // Нормалізуємо до [0,1]
    
    // 4. Схожість рейтингу (10%)
    if (book.rating && this.userVector.avgRating > 0) {
      const ratingDiff = Math.abs(book.rating - this.userVector.avgRating);
      const ratingScore = Math.max(0, 1 - (ratingDiff / 5)); // 5 - максимальний рейтинг
      score += ratingScore * 0.1;
    }
    
    return Math.min(score, 1); // Обмежуємо скор [0,1]
  }

  // Обчислення схожості жанрів
  private calculateGenreSimilarity(book: BookDetails): number {
    if (!book.genre) return 0;
    
    const bookGenre = book.genre.toLowerCase();
    let maxSimilarity = 0;
    
    // Перевіряємо точні збіги
    if (this.userVector.genrePreferences.has(bookGenre)) {
      maxSimilarity = Math.max(maxSimilarity, this.userVector.genrePreferences.get(bookGenre)! / 10);
    }
    
    // Перевіряємо часткові збіги для піджанрів
    for (const [userGenre, weight] of this.userVector.genrePreferences.entries()) {
      if (bookGenre.includes(userGenre) || userGenre.includes(bookGenre)) {
        maxSimilarity = Math.max(maxSimilarity, (weight / 10) * 0.7); // 70% за частковий збіг
      }
    }
    
    return Math.min(maxSimilarity, 1);
  }

  // TF-IDF схожість ключових слів
  private calculateTFIDFSimilarity(candidateKeywords: string[], userKeywords: Map<string, number>): number {
    if (!candidateKeywords || candidateKeywords.length === 0) return 0;
    
    let totalScore = 0;
    let matchedKeywords = 0;
    
    for (const keyword of candidateKeywords) {
      const keywordLower = keyword.toLowerCase();
      if (userKeywords.has(keywordLower)) {
        totalScore += userKeywords.get(keywordLower)! / 10; // Нормалізуємо
        matchedKeywords++;
      }
    }
    
    // Середній скор з бонусом за кількість збігів
    const avgScore = matchedKeywords > 0 ? totalScore / matchedKeywords : 0;
    const diversityBonus = Math.min(matchedKeywords / candidateKeywords.length, 0.3); // Максимум 30% бонусу
    
    return Math.min(avgScore + diversityBonus, 1);
  }

  // Collaborative Filtering: симуляція спільного фільтрування
  private calculateCollaborativeScore(book: BookDetails): number {
    // Симулюємо "схожих" користувачів на основі жанрових переваг
    let score = 0;
    let similarUsers = 0;
    
    for (const [userId, userBooks] of this.simulatedUserData.entries()) {
      // Перевіряємо, чи схожі уподобання жанрів
      const userGenres = new Set(userBooks.map(b => b.genre?.toLowerCase()).filter(g => g));
      const myGenres = new Set(this.userBooks.map(b => b.genre?.toLowerCase()).filter(g => g));
      
      // Обчислюємо коефіцієнт Жаккара для схожості жанрів
      const intersection = new Set([...userGenres].filter(g => myGenres.has(g)));
      const union = new Set([...userGenres, ...myGenres]);
      const jaccardSimilarity = intersection.size / union.size;
      
      if (jaccardSimilarity > 0.3) { // Користувач схожий якщо 30%+ спільних жанрів
        similarUsers++;
        // Перевіряємо, чи цей користувач читав і високо оцінив схожу книгу
        const hasBook = userBooks.find(b => 
          b.key === book.key || 
          b.author_name === book.author_name || 
          b.genre?.toLowerCase() === book.genre?.toLowerCase()
        );
        
        if (hasBook && hasBook.rating && hasBook.rating >= 4) {
          score += jaccardSimilarity * (hasBook.rating / 5);
        }
      }
    }
    
    return similarUsers > 0 ? Math.min(score / similarUsers, 1) : 0;
  }

  // Demographic Filtering: популярність та тренди
  private calculateDemographicScore(book: BookDetails): number {
    let score = 0;
    
    // 1. Рейтинг книги (50% від демографічного скору)
    if (book.rating) {
      score += (book.rating / 5) * 0.5;
    }
    
    // 2. Популярність автора (30%)
    const authorBooks = this.getAllBooksByAuthor(book.author_name);
    const authorPopularity = Math.min(authorBooks.length / 10, 1); // Нормалізуємо до 10 книг
    score += authorPopularity * 0.3;
    
    // 3. Популярність жанру (20%)
    const genrePopularity = this.getGenrePopularity(book.genre || '');
    score += genrePopularity * 0.2;
    
    return Math.min(score, 1);
  }

  // Допоміжні методи
  private getAllBooksByAuthor(author: string): BookDetails[] {
    // Симуляція популярності автора
    const popularAuthors = ['stephen king', 'j.k. rowling', 'george r.r. martin', 'agatha christie'];
    return popularAuthors.includes(author.toLowerCase()) ? new Array(8) : new Array(2);
  }

  private getGenrePopularity(genre: string): number {
    // Симуляція популярності жанрів
    const popularGenres: { [key: string]: number } = {
      'fiction': 0.9,
      'fantasy': 0.8,
      'thriller': 0.7,
      'romance': 0.75,
      'science fiction': 0.65,
      'mystery': 0.6,
      'horror': 0.5,
      'biography': 0.4
    };
    
    return popularGenres[genre.toLowerCase()] || 0.3;
  }

  // Будування профілю користувача
  private buildUserProfile(userBooks: BookDetails[]): UserVector {
    const genrePreferences = new Map<string, number>();
    const authorPreferences = new Map<string, number>();
    const keywordWeights = new Map<string, number>();
    
    let totalRating = 0;
    let ratedBooks = 0;
    
    for (const book of userBooks) {
      // Жанрові переваги
      if (book.genre) {
        const genre = book.genre.toLowerCase();
        const weight = book.rating || 3; // Дефолт 3, якщо немає рейтингу
        genrePreferences.set(genre, (genrePreferences.get(genre) || 0) + weight);
      }
      
      // Авторські переваги
      const author = book.author_name.toLowerCase();
      const weight = book.rating || 3;
      authorPreferences.set(author, (authorPreferences.get(author) || 0) + weight);
      
      // Ключові слова
      if (book.keywords) {
        for (const keyword of book.keywords) {
          const keywordLower = keyword.toLowerCase();
          const keywordWeight = book.rating || 3;
          keywordWeights.set(keywordLower, (keywordWeights.get(keywordLower) || 0) + keywordWeight);
        }
      }
      
      // Середній рейтинг
      if (book.rating) {
        totalRating += book.rating;
        ratedBooks++;
      }
    }
    
    const avgRating = ratedBooks > 0 ? totalRating / ratedBooks : 3;
    
    // Частота читання (симуляція)
    const readingFrequency = userBooks.length / 12; // книг на місяць
    
    // Різноманітність (кількість унікальних жанрів / загальна кількість)
    const uniqueGenres = new Set(userBooks.map(b => b.genre).filter(g => g));
    const diversityScore = uniqueGenres.size / Math.max(userBooks.length, 1);
    
    return {
      genrePreferences,
      authorPreferences,
      keywordWeights,
      avgRating,
      readingFrequency,
      diversityScore
    };
  }

  // Ініціалізація симульованих даних користувачів
  private initializeSimulatedData(): void {
    // Симуляція даних інших користувачів для collaborative filtering
    const user1: BookDetails[] = [
      { id: 1, key: 'fantasy1', title: 'The Hobbit', author_name: 'J.R.R. Tolkien', cover_url: '', status: 'read', genre: 'fantasy', rating: 5, keywords: ['adventure', 'magic', 'quest'] },
      { id: 2, key: 'scifi1', title: 'Dune', author_name: 'Frank Herbert', cover_url: '', status: 'read', genre: 'science fiction', rating: 4, keywords: ['space', 'politics', 'desert'] }
    ];
    
    const user2: BookDetails[] = [
      { id: 3, key: 'thriller1', title: 'Gone Girl', author_name: 'Gillian Flynn', cover_url: '', status: 'read', genre: 'thriller', rating: 4, keywords: ['psychological', 'mystery', 'marriage'] },
      { id: 4, key: 'romance1', title: 'Pride and Prejudice', author_name: 'Jane Austen', cover_url: '', status: 'read', genre: 'romance', rating: 5, keywords: ['classic', 'love', 'society'] }
    ];
    
    this.simulatedUserData.set('user1', user1);
    this.simulatedUserData.set('user2', user2);
  }
  // Генерація детального пояснення рекомендації
  private generateExplanation(book: BookDetails, contentScore: number, collaborativeScore: number, demographicScore: number): string {
    const reasons: string[] = [];
    const userStats = this.getUserPersonalizedInsights();
    
    // Персональні причини на основі жанрових переваг
    if (book.genre && this.userVector.genrePreferences.has(book.genre.toLowerCase())) {
      const genreScore = this.userVector.genrePreferences.get(book.genre.toLowerCase())!;
      const avgGenreRating = genreScore / this.countBooksInGenre(book.genre);
      
      if (avgGenreRating >= 4.5) {
        reasons.push(`💖 Ви обожнюєте жанр "${book.genre}" (середня оцінка ${avgGenreRating.toFixed(1)})`);
      } else if (avgGenreRating >= 4.0) {
        reasons.push(`😍 Жанр "${book.genre}" серед ваших улюблених (оцінка ${avgGenreRating.toFixed(1)})`);
      } else {
        reasons.push(`👍 Ви цінуєте книги жанру "${book.genre}"`);
      }
    }
    
    // Авторські переваги
    const authorPref = this.userVector.authorPreferences.get(book.author_name.toLowerCase());
    if (authorPref && authorPref >= 4) {
      reasons.push(`⭐ Ви високо оцінюєте твори ${book.author_name} (середня оцінка ${authorPref.toFixed(1)})`);
    }
    
    // Рейтингові переваги
    if (book.rating && this.userVector.avgRating > 0) {
      const ratingDiff = Math.abs(book.rating - this.userVector.avgRating);
      if (ratingDiff <= 0.5) {
        reasons.push(`🎯 Рейтинг книги (${book.rating.toFixed(1)}) ідеально збігається з вашими уподобаннями`);
      } else if (book.rating > this.userVector.avgRating) {
        reasons.push(`📈 Книга має вищий рейтинг (${book.rating.toFixed(1)}) ніж ваш середній (${this.userVector.avgRating.toFixed(1)})`);
      }
    }
    
    // Контентна схожість
    if (contentScore > 0.8) {
      reasons.push(`🔍 Дуже схожа на ваші улюблені книги (збіг ${(contentScore * 100).toFixed(0)}%)`);
    } else if (contentScore > 0.6) {
      reasons.push(`📚 Схожа тематика з вашими читацькими інтересами`);
    }
    
    // Collaborative filtering з деталями
    if (collaborativeScore > 0.7) {
      reasons.push(`👥 Читачі з схожими смаками ставлять їй високі оцінки (${(collaborativeScore * 100).toFixed(0)}% схожості)`);
    } else if (collaborativeScore > 0.5) {
      reasons.push(`🤝 Рекомендують люди з подібними читацькими вподобаннями`);
    }
    
    // Популярність з контекстом
    if (demographicScore > 0.8) {
      reasons.push(`🔥 Хіт серед читачів вашої категорії`);
    } else if (demographicScore > 0.6) {
      reasons.push(`📊 Популярна книга в загальному рейтингу`);
    }
    
    // Ключові слова (якщо є збіги)
    if (book.keywords) {
      const matchedKeywords = book.keywords.filter(keyword => 
        this.userVector.keywordWeights.has(keyword.toLowerCase())
      );
      if (matchedKeywords.length > 0) {
        reasons.push(`🏷️ Містить ваші улюблені теми: ${matchedKeywords.slice(0, 3).join(', ')}`);
      }
    }
    
    // Персональна порада на основі читацької поведінки
    if (userStats.isAdventurous && contentScore < 0.4) {
      reasons.push(`🚀 Щось нове для розширення ваших горизонтів!`);
    } else if (userStats.prefersHighRated && book.rating && book.rating >= 4.5) {
      reasons.push(`🌟 Високорейтингова книга для вимогливого читача`);
    }
    
    return reasons.length > 0 ? reasons.join(' • ') : '📖 Загальна рекомендація на основі алгоритму';
  }
  
  // Допоміжні методи для персоналізації
  private countBooksInGenre(genre: string): number {
    return this.userBooks.filter(book => book.genre?.toLowerCase() === genre.toLowerCase()).length;
  }
  
  private getUserPersonalizedInsights(): any {
    const avgRating = this.userVector.avgRating;
    const diversityScore = this.userVector.diversityScore;
    
    return {
      isAdventurous: diversityScore > 0.6, // Читає різноманітні жанри
      prefersHighRated: avgRating > 4.0, // Вимогливий до якості
      isActiveReader: this.userVector.readingFrequency > 2, // Читає часто
      favoriteGenre: Array.from(this.userVector.genrePreferences.entries())
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'невизначено'
    };
  }  // Розширена статистика рекомендацій
  getRecommendationStats(): any {
    const insights = this.getUserPersonalizedInsights();
    const topGenres = Array.from(this.userVector.genrePreferences.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    return {
      userProfile: {
        favoriteGenres: topGenres.map(([genre]) => genre),
        avgRating: this.userVector.avgRating,
        readingFrequency: this.userVector.readingFrequency,
        diversityScore: this.userVector.diversityScore,
        // Конвертуємо Map в об'єкт для правильного відображення в Angular
        genrePreferences: Object.fromEntries(this.userVector.genrePreferences),
        authorPreferences: Object.fromEntries(this.userVector.authorPreferences),
        // Персональні інсайти
        personalInsights: {
          readerType: this.getReaderType(),
          favoriteGenreWithRating: topGenres.length > 0 ? 
            `${topGenres[0][0]} (середня оцінка: ${(topGenres[0][1] / this.countBooksInGenre(topGenres[0][0])).toFixed(1)})` : 'Не визначено',
          ratingBehavior: this.getRatingBehavior(),
          diversityLevel: this.getDiversityLevel(),
          readingPattern: this.getReadingPattern()
        }
      },
      simulatedUsers: this.simulatedUserData.size,
      algorithmWeights: {
        content: '50% - аналіз схожості контенту',
        collaborative: '30% - preferences схожих читачів', 
        demographic: '20% - популярність та тренди'
      }
    };
  }
  
  // Визначення типу читача
  private getReaderType(): string {
    const avgRating = this.userVector.avgRating;
    const diversity = this.userVector.diversityScore;
    const frequency = this.userVector.readingFrequency;
    
    if (avgRating >= 4.5 && diversity < 0.3) {
      return '🎯 Вибірковий критик - високі стандарти, улюблені жанри';
    } else if (diversity >= 0.7) {
      return '🌍 Універсальний читач - відкритий до різних жанрів';
    } else if (frequency >= 3) {
      return '📚 Активний читач - читає багато та регулярно';
    } else if (avgRating >= 4.0) {
      return '⭐ Якісний читач - цінує високорейтингові книги';
    } else {
      return '📖 Початкуючий читач - формує свої вподобання';
    }
  }
  
  // Аналіз поведінки оцінювання
  private getRatingBehavior(): string {
    const avgRating = this.userVector.avgRating;
    
    if (avgRating >= 4.5) {
      return 'Щедрий на високі оцінки - шукаємо справді чудові книги';
    } else if (avgRating >= 4.0) {
      return 'Збалансований підхід до оцінок - враховуємо ваш стандарт якості';
    } else if (avgRating >= 3.5) {
      return 'Помірний в оцінках - рекомендуємо перевірені варіанти';
    } else {
      return 'Критичний підхід - шукаємо книги, що вас точно зацікавлять';
    }
  }
  
  // Рівень різноманітності
  private getDiversityLevel(): string {
    const diversity = this.userVector.diversityScore;
    
    if (diversity >= 0.8) {
      return 'Максимальна різноманітність - пропонуємо щось несподіване';
    } else if (diversity >= 0.6) {
      return 'Висока різноманітність - баланс між знайомим та новим';
    } else if (diversity >= 0.4) {
      return 'Помірна різноманітність - фокус на улюблених жанрах';
    } else {
      return 'Консервативні вподобання - дотримуємось ваших переваг';
    }
  }
  
  // Паттерн читання
  private getReadingPattern(): string {
    const frequency = this.userVector.readingFrequency;
    
    if (frequency >= 4) {
      return 'Інтенсивне читання - завжди готові нові рекомендації';
    } else if (frequency >= 2) {
      return 'Регулярне читання - рекомендації кожні тижні';
    } else if (frequency >= 1) {
      return 'Поміркованое читання - ретельно відібрані варіанти';
    } else {
      return 'Епізодичне читання - кожна книга має бути особливою';
    }
  }
}

@Component({
  selector: 'app-shelf-detail',
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.css']
})
export class ShelfDetailComponent implements OnInit {
  title: string = '';
  books: BookDetails[] = [];
  recommendedBooks: BookDetails[] = [];
  advancedRecommendedBooks: BookDetails[] = [];
  book: any;
  
  updatedBook: any;
  shelfId: number = 0;
  isEditing: boolean = false;
  id: string = '';
  api: string = "https://localhost:7172/api/Books";
  message: string = '';
  showRecommendations: boolean = false;
  isLoadingRecommendations: boolean = false;
    // Рекомендаційний алгоритм
  public recommendationEngine?: RecommendationEngine;
  recommendationScores: RecommendationScore[] = [];
  showAdvancedRecommendations: boolean = false;
  
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
          keywords: item.keywords || this.extractKeywords(item),
          pages: item.pages || 0
        }));
        
        // Ініціалізуємо рекомендаційний алгоритм
        this.initializeRecommendationEngine();
      },
      (error) => {
        this.message = 'Error loading books.';
        console.error('Error loading books:', error);
      }
    );
  }

  // Ініціалізація рекомендаційного алгоритму
  private initializeRecommendationEngine(): void {
    if (this.books.length > 0) {
      this.recommendationEngine = new RecommendationEngine(this.books);
      console.log('Recommendation engine initialized with', this.books.length, 'books');
      console.log('User stats:', this.recommendationEngine.getRecommendationStats());
    }
  }

  // Покращений метод для отримання рекомендацій з використанням гібридного алгоритму
  getAdvancedRecommendations(): void {
    if (!this.recommendationEngine) {
      this.getRecommendations(); // Фоллбек до старого методу
      return;
    }

    this.isLoadingRecommendations = true;
    this.showAdvancedRecommendations = true;
    
    // Отримуємо кандидатів на рекомендації з Google Books API
    this.getCandidateBooks().then(candidates => {
      if (candidates.length === 0) {
        this.getRecommendations(); // Фоллбек
        return;
      }      // Застосовуємо гібридний алгоритм
      this.recommendationScores = this.recommendationEngine!.getRecommendations(candidates, 10);
      
      // Конвертуємо в BookDetails з додатковою інформацією
      this.advancedRecommendedBooks = this.recommendationScores.map(score => {
        const book = candidates.find(b => b.key === score.bookKey)!;
        return {
          ...book,
          // Додаємо скор як допоміжну інформацію
          status: `Рекомендовано (${(score.hybridScore * 100).toFixed(0)}%)`
        };
      });

      this.isLoadingRecommendations = false;
      
      console.log('Advanced recommendations generated:', this.recommendationScores.length);
      console.log('Top recommendation:', this.recommendationScores[0]);
    });
  }

  // Отримання кандидатів на рекомендації
  private async getCandidateBooks(): Promise<BookDetails[]> {
    const candidates: BookDetails[] = [];
    
    // Отримуємо жанри з бібліотеки користувача
    const userGenres = [...new Set(this.books.map(b => b.genre).filter(g => g))];
    const genres = userGenres.length > 0 ? userGenres : ['fiction', 'fantasy', 'thriller'];
      // Для кожного жанру робимо запит
    const promises = genres.slice(0, 3).map(genre => 
      this.http.get<any>(
        `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre || 'fiction')}&maxResults=20&langRestrict=en`
      ).toPromise()
    );
    
    try {
      const responses = await Promise.all(promises);
      
      for (const response of responses) {
        if (response?.items) {
          const books = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'No Title',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown Author',
            cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
            status: 'Candidate',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories?.[0] || 'fiction',
            keywords: this.extractGoogleBooksKeywords(item.volumeInfo),
            pages: item.volumeInfo.pageCount || 0,
            isEditing: false,
            booksadded: new Date(),
            dateread: null
          }));
          
          candidates.push(...books);
        }
      }
      
      // Видаляємо дублікати та книги, які вже є у користувача
      const existingKeys = this.books.map(b => b.key);
      const uniqueCandidates = candidates.filter((book, index, self) => 
        !existingKeys.includes(book.key) && 
        self.findIndex(b => b.key === book.key) === index
      );
      
      return uniqueCandidates;
      
    } catch (error) {
      console.error('Error getting candidate books:', error);
      return [];
    }
  }

  // Витягування ключових слів з Google Books API
  private extractGoogleBooksKeywords(volumeInfo: any): string[] {
    const keywords: string[] = [];
    
    // Додаємо категорії
    if (volumeInfo.categories) {
      keywords.push(...volumeInfo.categories);
    }
    
    // Витягуємо ключові слова з опису
    if (volumeInfo.description) {
      const description = volumeInfo.description.toLowerCase();
      const commonKeywords = [
        'adventure', 'romance', 'mystery', 'fantasy', 'science fiction', 'thriller',
        'historical', 'contemporary', 'classic', 'young adult', 'children',
        'biography', 'memoir', 'true story', 'war', 'love', 'family', 'friendship',
        'magic', 'space', 'future', 'past', 'crime', 'detective', 'psychological'
      ];
      
      for (const keyword of commonKeywords) {
        if (description.includes(keyword)) {
          keywords.push(keyword);
        }
      }
    }
    
    return [...new Set(keywords)];
  }

  // Покращений метод для вилучення ключових слів з книги
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
    
    // Додаємо жанр з більшою вагою
    if (book.genre) {
      const genreLower = book.genre.toLowerCase();
      keywords.push(genreLower, genreLower, genreLower); // Тричі для важливості
      
      // Додаємо підкатегорії жанрів
      if (genreLower.includes('fiction')) {
        keywords.push('fiction');
        if (genreLower.includes('science') || genreLower.includes('sci-fi')) {
          keywords.push('science fiction', 'sci-fi', 'futuristic');
        }
        if (genreLower.includes('fantasy')) {
          keywords.push('fantasy', 'magic');
        }
        if (genreLower.includes('historical')) {
          keywords.push('historical', 'history');
        }
      }
      
      if (genreLower.includes('romance')) {
        keywords.push('romance', 'love story');
      }
      
      if (genreLower.includes('thriller') || genreLower.includes('mystery')) {
        keywords.push('thriller', 'mystery', 'suspense');
      }
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

  // Простий метод для отримання рекомендацій (фоллбек)
  getRecommendations(): void {
    this.isLoadingRecommendations = true;
    this.showAdvancedRecommendations = false;
    this.apiQuotaExceeded = false;
    
    if (this.books.length === 0) {
      this.getDefaultRecommendations();
      return;
    }
    
    const genres = this.books
      .map(book => book.genre)
      .filter(genre => genre && genre.trim() !== '');
    
    if (genres.length === 0) {
      this.getFallbackRecommendationsByGenre('fiction');
      return;
    }
    
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    
    this.http.get<any>(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(randomGenre || 'fiction')}&maxResults=10&langRestrict=en`
    ).subscribe(
      response => {
        if (response?.items?.length > 0) {
          this.recommendedBooks = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'No Title',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown Author',
            cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
            status: 'Рекомендовано',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories?.[0] || randomGenre,
            isEditing: false,
            booksadded: new Date(),
            dateread: null,
            keywords: this.extractGoogleBooksKeywords(item.volumeInfo)
          }));
          
          const existingKeys = this.books.map(book => book.key);
          this.recommendedBooks = this.recommendedBooks.filter(book => !existingKeys.includes(book.key));
          
          if (this.recommendedBooks.length === 0) {
            this.getFallbackRecommendationsByGenre('fiction');
          }
        } else {
          this.getFallbackRecommendationsByGenre('fiction');
        }
        this.isLoadingRecommendations = false;
      },
      error => {
        console.error('Error getting recommendations:', error);
        this.apiQuotaExceeded = true;
        this.getFallbackRecommendationsByGenre('fiction');
      }
    );
  }

  getFallbackRecommendationsByGenre(genre: string): void {
    this.http.get<any>(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(genre)}&orderBy=relevance&maxResults=10&langRestrict=en`
    ).subscribe(
      response => {
        if (response?.items?.length > 0) {
          this.recommendedBooks = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'No Title',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown Author',
            cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
            status: 'Рекомендовано',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories?.[0] || genre,
            isEditing: false,
            booksadded: new Date(),
            dateread: null,
            keywords: this.extractGoogleBooksKeywords(item.volumeInfo)
          }));
        } else {
          this.recommendedBooks = [];
        }
        this.isLoadingRecommendations = false;
      },
      error => {
        console.error('Error getting fallback recommendations:', error);
        this.recommendedBooks = [];
        this.isLoadingRecommendations = false;
        this.message = 'Не вдалося завантажити рекомендації';
      }
    );
  }

  getDefaultRecommendations(): void {
    this.isLoadingRecommendations = true;
    this.showFallbackRecommendations = true;
    
    const popularGenres = ['fiction', 'fantasy', 'thriller', 'romance', 'science fiction'];
    const randomGenre = popularGenres[Math.floor(Math.random() * popularGenres.length)];
    
    this.http.get<any>(
      `https://www.googleapis.com/books/v1/volumes?q=subject:${randomGenre}&orderBy=relevance&maxResults=10&langRestrict=en`
    ).subscribe(
      response => {
        if (response?.items?.length > 0) {
          this.fallbackRecommendations = response.items.map((item: any) => ({
            id: item.id,
            key: item.id,
            title: item.volumeInfo.title || 'No Title',
            author_name: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown Author',
            cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
            status: 'Рекомендовано',
            rating: item.volumeInfo.averageRating || 0,
            genre: item.volumeInfo.categories?.[0] || randomGenre,
            isEditing: false,
            booksadded: new Date(),
            dateread: null,
            keywords: this.extractGoogleBooksKeywords(item.volumeInfo)
          }));
        } else {
          this.fallbackRecommendations = [];
        }
        this.isLoadingRecommendations = false;
      },
      error => {
        console.error('Error getting default recommendations:', error);
        this.isLoadingRecommendations = false;
        this.fallbackRecommendations = [];
        this.showMessage('Не вдалося завантажити рекомендації');
      }
    );
  }

  // Аналіз книги за допомогою Gemini AI
  analyzeBookWithGemini(book: BookDetails): void {
    if (!book.description) {
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
    
    this.extractKeywordsUsingGemini(book, book.description);
  }

  private extractKeywordsUsingGemini(book: BookDetails, description: string): void {
    const isUkrainian = /[а-яіїєґ]+/i.test(description);
    
    const prompt = `
    Проаналізуй опис книги "${book.title}" автора ${book.author_name} та визнач 10-15 найважливіших 
    ключових слів або фраз, які найкраще характеризують тематику, сюжет, настрій та ідеї книги.
    
    Опис книги: "${description}"
    
    Правила:
    1. Не включай слова, які просто описують книгу як об'єкт.
    2. Не включай оцінювальні слова.
    3. Уникай загальних слів.
    4. ВАЖЛИВО: Визнач точний основний жанр книги на основі опису.
    5. Включи мотиви та теми книги.
    6. Додай ключові слова для настрою книги.
    
    ${isUkrainian ? 'Опис українською, але жанри англійською для стандартизації.' : ''}
    
    Подай результат у форматі JSON:
    {
      "keywords": ["ключове_слово_1", "ключове_слово_2", ...],
      "genre": "основний_жанр_англійською",
      "subgenres": ["піджанр_1", "піджанр_2", "піджанр_3"],
      "themes": ["тема_1", "тема_2", "тема_3"],
      "mood": ["настрій_1", "настрій_2"]
    }
    Відповідь повинна містити ТІЛЬКИ цей JSON.`;
    
    this.geminiService.generateContentWithGeminiPro(prompt, []).subscribe(
      response => {
        try {
          const cleanedResponse = response.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          
          book.genre = parsed.genre || book.genre;
          
          const enhancedKeywords: string[] = Array.isArray(parsed.keywords) ? [...parsed.keywords] : [];
          
          if (parsed.subgenres && Array.isArray(parsed.subgenres)) {
            parsed.subgenres.forEach((subgenre: string) => {
              if (subgenre && typeof subgenre === 'string') {
                enhancedKeywords.push(subgenre, subgenre);
              }
            });
          }
          
          if (parsed.themes && Array.isArray(parsed.themes)) {
            parsed.themes.forEach((theme: string) => {
              if (theme && typeof theme === 'string') {
                enhancedKeywords.push(theme);
              }
            });
          }
          
          if (parsed.mood) {
            if (Array.isArray(parsed.mood)) {
              parsed.mood.forEach((mood: string) => {
                if (mood && typeof mood === 'string') {
                  enhancedKeywords.push(mood);
                }
              });
            } else if (typeof parsed.mood === 'string') {
              enhancedKeywords.push(parsed.mood);
            }
          }
          
          book.keywords = [...new Set(enhancedKeywords.filter((keyword: string) => 
            keyword && typeof keyword === 'string' && keyword.trim() !== ''
          ))];
          
          this.updateBookMetadata(book);
          
          console.log('Аналіз книги завершено:', book.title, {
            genre: book.genre,
            keywordsCount: book.keywords?.length || 0,
            subgenres: parsed.subgenres,
            themes: parsed.themes,
            mood: parsed.mood
          });
          
          this.message = `Книгу "${book.title}" успішно проаналізовано!`;
          
          // Оновлюємо рекомендаційний алгоритм
          this.initializeRecommendationEngine();
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
        this.recommendedBooks = this.recommendedBooks.filter(b => b.key !== book.key);
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

  // Аналіз усіх книг
  analyzeAllBooks(): void {
    if (this.books.length === 0) {
      this.message = 'No books to analyze.';
      return;
    }
    
    this.message = `Analyzing ${this.books.length} books. This may take some time...`;
    
    let index = 0;
    
    const analyzeNext = () => {
      if (index >= this.books.length) {
        this.message = 'All books analyzed successfully!';
        this.initializeRecommendationEngine();
        return;
      }
      
      const book = this.books[index++];
      this.message = `Analyzing book ${index}/${this.books.length}: "${book.title}"`;
      
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
          setTimeout(analyzeNext, 2000);
        });
      } else {
        this.geminiAnalyzeBook(book, book.description).subscribe(() => {
          setTimeout(analyzeNext, 2000);
        });
      }
    };
    
    analyzeNext();
  }

  private geminiAnalyzeBook(book: BookDetails, description: string): Observable<any> {
    const prompt = `
    Проаналізуй опис книги "${book.title}" автора ${book.author_name} та визнач найважливіші характеристики.
    
    Опис книги: "${description}"
    
    Подай результат у форматі JSON:
    {
      "keywords": ["ключове_слово_1", "ключове_слово_2", ...],
      "genre": "основний жанр",
      "subgenres": ["піджанр_1", "піджанр_2"],
      "mood": "загальний настрій",
      "themes": ["тема_1", "тема_2"]
    }`;
    
    return this.geminiService.generateContentWithGeminiPro(prompt, []).pipe(
      tap(response => {
        try {
          const cleanedResponse = response.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleanedResponse);
          
          book.genre = parsed.genre || book.genre;
          
          let enhancedKeywords: string[] = Array.isArray(parsed.keywords) ? parsed.keywords : [];
          
          if (parsed.subgenres && Array.isArray(parsed.subgenres)) {
            enhancedKeywords = [...enhancedKeywords, ...parsed.subgenres];
          }
          
          if (parsed.mood && typeof parsed.mood === 'string') {
            enhancedKeywords.push(parsed.mood);
          }
          
          if (parsed.themes && Array.isArray(parsed.themes)) {
            enhancedKeywords = [...enhancedKeywords, ...parsed.themes];
          }
          
          book.keywords = [...new Set(enhancedKeywords.filter(keyword => 
            keyword && typeof keyword === 'string' && keyword.trim() !== ''
          ))];
          
          this.updateBookMetadata(book);
          
        } catch (error) {
          console.error('Error parsing Gemini response for book:', book.title, error);
        }
      }),
      catchError(error => {
        console.error('Error with Gemini API for book:', book.title, error);
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

    )
  }       ;
  // Показати пояснення рекомендації
  getRecommendationExplanation(bookKey: string): string {
    const score = this.recommendationScores.find(s => s.bookKey === bookKey);
    return score ? score.explanation : 'Загальна рекомендація';
  }  // Показати детальні скори
  getDetailedScores(bookKey: string): any {
    const score = this.recommendationScores.find(s => s.bookKey === bookKey);
    if (!score) return null;
    
    return {
      content: (score.contentScore * 100).toFixed(0),
      collaborative: (score.collaborativeScore * 100).toFixed(0),
      demographic: (score.demographicScore * 100).toFixed(0),
      hybrid: (score.hybridScore * 100).toFixed(0)
    };
  }

  // Показати статистику користувача
  getUserStats(): any {
    return this.recommendationEngine?.getRecommendationStats();
  }
  
  // Отримати персональний інсайт для рекомендації
  getPersonalizedInsight(bookKey: string): string {
    const book = this.advancedRecommendedBooks.find(b => b.key === bookKey);
    const score = this.recommendationScores.find(s => s.bookKey === bookKey);
    
    if (!book || !score || !this.recommendationEngine) return '';
    
    const userStats = this.recommendationEngine.getRecommendationStats().userProfile.personalInsights;
    const insights: string[] = [];
    
    // Персональні рекомендації на основі профілю читача
    if (userStats.readerType.includes('критик') && score.hybridScore >= 0.8) {
      insights.push(' Ідеально підходить для вимогливого читача');
    }
    
    if (userStats.readerType.includes('Універсальний') && book.genre) {
      insights.push(`Нове відкриття в жанрі "${book.genre}"`);
    }
    
    if (userStats.ratingBehavior.includes('Щедрий') && book.rating && book.rating >= 4.5) {
      insights.push('Гарантовано отримаєте задоволення від читання');
    }
    
    // Рекомендації на основі часу
    const currentHour = new Date().getHours();
    if (currentHour >= 18 || currentHour <= 6) {
      insights.push('Ідеально для вечірнього читання');
    } else {
      insights.push('Чудовий вибір для денного читання');
    }
    
    return insights.join(' • ');
  }
  
  // Персоналізований інсайт на основі часу та профілю
 
  // Рекомендація часу читання
  getReadingTimeRecommendation(book: any): string {
    if (!book.title) return '';
    
    // Приблизна оцінка на основі довжини назви та жанру
    const titleLength = book.title.length;
    const isLongNovel = titleLength > 50 || book.genre?.toLowerCase().includes('fantasy') || book.genre?.toLowerCase().includes('science fiction');
    
    if (isLongNovel) {
      return 'Довге читання (5-10 годин)';
    } else if (titleLength > 30) {
      return ' Середнє читання (3-5 годин)';
    } else {
      return 'Швидке читання (1-3 години)';
    }
  }

  // Оцінка часу читання на основі кількості сторінок
  getReadingTimeEstimate(pages: number): string {
    if (!pages || pages <= 0) return '📖 Час читання не визначено';
    
    // Середня швидкість читання: 1-2 сторінки на хвилину
    const minutesPerPage = 1.5;
    const totalMinutes = pages * minutesPerPage;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    
    if (hours >= 10) {
      return ` ${Math.round(hours)} год (довга книга)`;
    } else if (hours >= 5) {
      return ` ${hours} год ${minutes > 0 ? minutes + ' хв' : ''} (середня книга)`;
    } else if (hours >= 1) {
      return ` ${hours} год ${minutes > 0 ? minutes + ' хв' : ''} (коротка книга)`;
    } else {
      return ` ${Math.round(totalMinutes)} хв`;
    }
  }

  // Навігація до деталей книги
  navigateToBookDetail(bookKey: string): void {
    this.router.navigate(['/book-detail', bookKey]);
  }

  // Утилітні методи для шаблону
  parseFloat(value: any): number {
    return Number.parseFloat(value);
  }

  isNaN(value: any): boolean {
    return Number.isNaN(value);
  }

  // Утилітні методи
  private showMessage(msg: string): void {
    this.message = msg;
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
  
  // Оновлений метод setRating
  setRating(book: BookDetails, rating: number): void {
    if (book.isEditing) {
      book.rating = rating;
      console.log(`Встановлено рейтинг ${rating} для книги ${book.title}`);
    }
  }
  
  enableEditing(key: string): void {
    this.books.forEach(book => {
      if (book.key !== key) {
        book.isEditing = false;
      }
    });
    const bookToEdit = this.books.find(book => book.key === key);
    if (bookToEdit) {
      this.updatedBook = { ...bookToEdit }; // Клонуємо, щоб уникнути прямої мутації до збереження
      bookToEdit.isEditing = true;
      console.log('Book to update:', this.updatedBook);
    }
  }

  // Інші методи компонента (редагування, видалення тощо)
  // toggleEdit(book: BookDetails): void { // Цей метод, схоже, замінений на enableEditing
  //   book.isEditing = !book.isEditing;
  //   if (!book.isEditing) {
  //     this.updateBook(book);
  //   }
  // }

  updateBook(book: BookDetails): void { // Приймає BookDetails, але використовує this.updatedBook
    if (!this.updatedBook) {
      console.error('updatedBook is not set. Call enableEditing first.');
      this.message = 'Помилка: книга для оновлення не вибрана.';
      return;
    }

    // Оновлюємо оригінальну книгу в масиві books даними з updatedBook
    const originalBookIndex = this.books.findIndex(b => b.key === this.updatedBook.key);
    if (originalBookIndex !== -1) {
      // Переконуємося, що rating і status оновлюються з [(ngModel)]
      this.updatedBook.status = this.books[originalBookIndex].status;
      this.updatedBook.rating = this.books[originalBookIndex].rating;
      this.updatedBook.dateread = this.books[originalBookIndex].dateread;
    }

    console.log('Before update (from updatedBook):', this.updatedBook);

    let formattedDate = null;
    if (this.updatedBook.dateread) {
      const date = new Date(this.updatedBook.dateread);
      // Перевірка на валідність дати
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0];
      } else {
        console.warn('Invalid date for dateread:', this.updatedBook.dateread);
      }
    }

    const payload = {
      status: this.updatedBook.status ?? '',
      rating: this.updatedBook.rating?.toString() ?? '0',
      dateread: formattedDate,
      genre: this.updatedBook.genre || '',
      keywords: this.updatedBook.keywords || []
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));
    this.sendUpdate(payload, this.updatedBook.key); // Передаємо key
  }

  sendUpdate(payload: any, key: string): void {
    this.http.post<any>(
      `${this.api}/update-book?shelfName=${this.title}&key=${key}`, 
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
          // Оновлюємо книгу в списку this.books
          const index = this.books.findIndex(b => b.key === key);
          if (index !== -1) {
            // Оновлюємо поля, які могли змінитися на сервері або які ми відправляли
            this.books[index] = { ...this.books[index], ...payload, dateread: this.updatedBook.dateread, isEditing: false };
             // Оновлюємо this.book, якщо він використовується для відображення деталей
            if (this.book && this.book.key === key) {
              this.book = { ...this.books[index] };
            }
          }
          this.isEditing = false; // Загальний флаг, якщо використовується
          const editedBook = this.books.find(b => b.key === key);
          if (editedBook) {
            editedBook.isEditing = false;
          }
          console.log('Book updated:', response);
          this.message = 'Book updated successfully';
          // this.loadBooks(); // Можливо, не потрібно, якщо оновлюємо локально
          this.initializeRecommendationEngine(); // Оновлюємо дані для рекомендацій
          
          setTimeout(() => {
            this.message = '';
          }, 3000);
        }
      },
      error => {
        console.error('Error updating book:', error);
        this.message = 'Error updating book.';
        const editedBook = this.books.find(b => b.key === key);
        if (editedBook) {
          editedBook.isEditing = true; // Залишаємо в режимі редагування при помилці
        }
      }
    );
  }

  deleteBook(bookToDelete: BookDetails): void { // Змінено параметр на BookDetails
    if (confirm(`Are you sure you want to delete "${bookToDelete.title}"?`)) {
      this.http.delete<any>(`${this.api}/delete-book?shelfName=${this.title}&key=${bookToDelete.key}`, { withCredentials: true }).subscribe(
        response => {
          if (response) {
            console.log('Book deleted:', response);
            this.books = this.books.filter(b => b.key !== bookToDelete.key); // Оновлюємо локальний масив
            this.message = 'Book deleted successfully';
            this.initializeRecommendationEngine(); // Оновлюємо дані для рекомендацій
            
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
}
