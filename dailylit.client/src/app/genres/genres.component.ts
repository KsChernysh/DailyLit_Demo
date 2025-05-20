import { HttpClient } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { BookService } from '../book.service';
import { GlobalVariablesService } from '../global.variables.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-genres',
  templateUrl: './genres.component.html',
  styleUrls: ['./genres.component.css']
})
export class GenresComponent implements OnInit, OnDestroy {
  books: any[] = [];
  genres: string[] = [];
  title = 'dailylit.client';
  isSidenavOpen = false;

  // Для пошуку
  searchQuery: string = '';
  filteredGenres: string[] = [];

  // Для відображення кількості книг у жанрі
  genreCounts: {[key: string]: number} = {};
  
  // Для відображення найпопулярніших жанрів
  popularGenres: string[] = [];

  // Для сортування та відображення книг
  sortOption: string = 'relevance';
  viewMode: string = 'grid';
  selectedGenre: string = '';
  
  // Індикатори завантаження та помилок
  isLoading: boolean = false;
  loadError: string = '';
  
  // Підписки для правильного очищення ресурсів
  private subscriptions: Subscription[] = [];

  // Change from private to public
  public global: any = {
    bookItems: []
  };

  constructor(
    private http: HttpClient,
    private bookService: BookService,
    private router: Router
  ) {} 

  ngOnInit() {
    // Отримуємо розширений список жанрів з сервісу
    this.genres = this.bookService.genres;
    
    // Ініціалізація фільтрованих жанрів
    this.filteredGenres = [...this.genres];
    
    // Завантажуємо збережені налаштування
    this.loadUserPreferences();
    
    // Заповнюємо дані про кількість книг та визначаємо популярні жанри
    this.initializeGenreCounts();
    this.determinePopularGenres();
    
    // Підписуємось на статус завантаження
    this.subscriptions.push(
      this.bookService.isLoading$.subscribe(isLoading => {
        this.isLoading = isLoading;
      })
    );
  }
  
  ngOnDestroy() {
    // Очищаємо всі підписки щоб уникнути витоку пам'яті
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Завантаження збережених налаштувань користувача
  loadUserPreferences() {
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode) {
      this.viewMode = savedViewMode;
    }
    
    const savedSortOption = localStorage.getItem('sortOption');
    if (savedSortOption) {
      this.sortOption = savedSortOption;
      this.global.sortOption = savedSortOption;
    }
    
    // Перевіряємо, чи є збережений жанр в URL
    const urlParts = window.location.pathname.split('/');
    if (urlParts.length > 2 && urlParts[1] === 'genre') {
      const genreFromUrl = urlParts[2].replace(/-/g, ' ');
      const matchedGenre = this.genres.find(g => g.toLowerCase() === genreFromUrl.toLowerCase());
      if (matchedGenre) {
        this.selectedGenre = matchedGenre;
      }
    }
  }
  
  // Ініціалізація даних про кількість книг
  initializeGenreCounts() {
    console.log("Initializing genre counts");
    
    // Встановлюємо початкові значення
    this.genres.forEach(genre => {
      this.genreCounts[genre] = 0; 
    });
    
    // Асинхронно завантажуємо кількість книг для декількох жанрів
    // щоб не перевантажувати API запитами
    this.loadBookCountsInBatches();
  }
  
  // Завантаження кількості книг партіями
  loadBookCountsInBatches() {
    // Беремо перші 5 жанрів для початкового завантаження
    const initialGenres = this.genres.slice(0, 5);
    initialGenres.forEach(genre => {
      this.fetchBookCountForGenre(genre);
    });
    
    // Решту жанрів завантажуємо з затримкою
    setTimeout(() => {
      const remainingGenres = this.genres.slice(5);
      remainingGenres.forEach((genre, index) => {
        setTimeout(() => {
          this.fetchBookCountForGenre(genre);
        }, index * 300); // Завантажуємо з інтервалом для уникнення блокування API
      });
    }, 2000);
  }
  
  // Визначення найпопулярніших жанрів
  determinePopularGenres() {
    // 5 популярних жанрів визначаємо на основі існуючих даних
    const popularGenresList = [
      'Fiction', 'Fantasy', 'Romance', 'Mystery', 'Science Fiction'
    ];
    
    this.popularGenres = popularGenresList;
  }
  
  // Метод для отримання кількості книг для конкретного жанру
  fetchBookCountForGenre(genre: string) {
    console.log(`Loading count for genre: ${genre}`);
    
    const subscription = this.bookService.getBooks(genre).subscribe({
      next: (books) => {
        if (books && Array.isArray(books)) {
          console.log(`Found ${books.length} books for genre: ${genre}`);
          this.genreCounts[genre] = books.length;
        }
      },
      error: (error) => {
        console.error(`Error fetching count for genre ${genre}:`, error);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  toggleSidenav() {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  goTo(genre: string) {
    this.isLoading = true;
    this.loadError = '';
    
    this.global.selectedGenre = genre;
    this.selectedGenre = genre;
    
    console.log(`Loading books for genre: ${genre}`);
    
    const subscription = this.bookService.getBooks(genre).subscribe({
      next: (items) => {
        console.log(`Received ${items.length} books for genre: ${genre}`);
        this.isLoading = false;
        
        if (items.length === 0) {
          // Якщо книг не знайдено, показуємо повідомлення
          this.loadError = 'На жаль, книг для цього жанру не знайдено. Спробуйте інший жанр.';
          return;
        }
        
        // Оновлюємо кількість книг для цього жанру на основі отриманих даних
        if (genre) {
          this.genreCounts[genre] = items.length;
        }
        
        // Зберігаємо в глобальну змінну
        this.global.bookItems = items;
        
        // Навігація на сторінку жанру
        const formattedGenre = genre ? genre.replace(/\s+/g, '-').toLowerCase() : 'all';
        this.router.navigate(['genre', formattedGenre]);
      },
      error: (error) => {
        console.error('Error fetching books:', error);
        this.isLoading = false;
        this.loadError = 'Не вдалося завантажити книги. Спробуйте пізніше.';
      }
    });
    
    this.subscriptions.push(subscription);
  }

  // Метод для фільтрації жанрів при пошуку
  filterGenres() {
    if (!this.searchQuery) {
      this.filteredGenres = [...this.genres];
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredGenres = this.genres.filter(genre => {
      // Шукаємо і в оригінальній англійській назві і в українському перекладі
      const englishName = genre.toLowerCase();
      const ukrName = this.bookService.genresUkrainian[genre]?.toLowerCase() || '';
      
      return englishName.includes(query) || ukrName.includes(query);
    });
  }

  // Метод для очищення пошуку
  clearSearch() {
    this.searchQuery = '';
    this.filterGenres();
  }

  // Метод для перегляду всіх книг
  viewAllGenres() {
    this.selectedGenre = '';
    this.goTo('');
  }

  // Метод для встановлення режиму перегляду
  setViewMode(mode: string) {
    this.viewMode = mode;
    localStorage.setItem('viewMode', mode);
  }

  // Метод для сортування книг
  sortBooks() {
    console.log(`Sorting by ${this.sortOption}`);
    
    // Зберігаємо вибір сортування
    localStorage.setItem('sortOption', this.sortOption);
    
    // Передаємо дані про сортування в глобальну змінну
    this.global.sortOption = this.sortOption;
    
    // Повторно завантажуємо поточний жанр з новим сортуванням
    if (this.selectedGenre) {
      this.goTo(this.selectedGenre);
    } else {
      this.goTo('');
    }
  }
  
  // Повертає локалізовану назву жанру, якщо доступна
  getLocalizedGenreName(genre: string): string {
    if (this.bookService.genresUkrainian[genre]) {
      return this.bookService.genresUkrainian[genre];
    }
    return genre;
  }
  
  // Перевіряє, чи жанр є популярним
  isPopularGenre(genre: string): boolean {
    return this.popularGenres.includes(genre);
  }
  
  // Повертає клас для жанру на основі кількості книг
  getGenreClass(genre: string): string {
    const count = this.genreCounts[genre] || 0;
    
    if (count > 50) return 'genre-high';
    if (count > 20) return 'genre-medium';
    return 'genre-normal';
  }
}
