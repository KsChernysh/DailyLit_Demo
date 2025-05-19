import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Реєструємо всі компоненти Chart.js
Chart.register(...registerables);

interface UserProfile {
  id: number;
  userName: string;
  email?: string;
  nickName?: string;
  profilePicture?: string;
  bio?: string;
  goal?: number;
  read?: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  dateFinished?: Date;
  genre?: string;
}

interface GenreData {
  genre: string;
  count: number;
  percentage: number;
}

interface MonthlyReadingData {
  month: string;
  count: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('readingProgressChart') readingProgressChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('genreChart') genreChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChart') activityChart!: ElementRef<HTMLCanvasElement>;
  
  userProfile: UserProfile | null = null;
  errorMessage: string | null = null;
  activeTab: 'info' | 'stats' = 'info';
  recentBooks: Book[] = [];
  genreData: GenreData[] = [];
  monthlyReadingData: MonthlyReadingData[] = [];
  isLoading = true;
  
  // Стандартні зображення
  readonly defaultAvatar: string = 'assets/images/default-avatar.png';
  readonly defaultBookCover: string = 'assets/images/default-book-cover.png';
  
  // Змінні для діаграм
  readingProgressChartInstance: Chart | null = null;
  genreChartInstance: Chart | null = null;
  activityChartInstance: Chart | null = null;

  // Для відслідковування підписок
  private subscriptions: Subscription[] = [];

  readonly api = "https://localhost:7172/api/Profile";
  readonly booksApi = "https://localhost:7172/api/Books";

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadBooksFromReadShelf();
  }
  
  ngAfterViewInit(): void {
    // Ініціалізуємо діаграми після завантаження представлення
    if (this.activeTab === 'stats') {
      setTimeout(() => this.initCharts(), 300);
    }
  }
  
  ngOnDestroy(): void {
    // Відписуємось від усіх підписок
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Знищуємо діаграми
    this.destroyCharts();
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMsg = 'Сталася помилка. Спробуйте пізніше.';
    
    if (error.error instanceof ErrorEvent) {
      // Клієнтська помилка
      errorMsg = `Помилка: ${error.error.message}`;
    } else {
      // Серверна помилка
      errorMsg = `Код помилки: ${error.status}, повідомлення: ${error.message}`;
    }
    
    console.error(errorMsg);
    return throwError(() => new Error(errorMsg));
  }
  
  loadUserProfile(): void {
    const sub = this.http.get<UserProfile>(this.api + "/profile", { withCredentials: true })
      .pipe(
        catchError(error => {
          this.errorMessage = 'Помилка завантаження профілю. Спробуйте пізніше.';
          return this.handleError(error);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.userProfile = data;
          if (this.activeTab === 'stats' && this.readingProgressChart) {
            setTimeout(() => this.initCharts(), 100);
          }
        }
      });
    
    this.subscriptions.push(sub);
  }
  
  loadBooksFromReadShelf(): void {
    const shelfName = "Read";
    const encodedShelfName = encodeURIComponent(shelfName);
    
    this.isLoading = true;
    
    const sub = this.http.get<any[]>(`${this.booksApi}/shelf-books?shelfName=${encodedShelfName}`, { withCredentials: true })
      .pipe(
        catchError(error => {
          console.error(`Error loading books for shelf ${shelfName}:`, error);
          this.recentBooks = []; // Initialize with empty array on error
          this.genreData = [];
          this.monthlyReadingData = [];
          return this.handleError(error);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (books) => {
          console.log(`Books for shelf ${shelfName} loaded:`, books);
          
          // Process books for recent books section
          this.processRecentBooks(books);
          
          // Process books for genre chart
          this.processGenreData(books);
          
          // Process books for monthly activity chart
          this.processMonthlyReadingData(books);
          
          // Update read count in user profile if needed
          if (this.userProfile) {
            this.userProfile.read = books.length;
            
            // Refresh charts if on stats tab
            if (this.activeTab === 'stats') {
              setTimeout(() => this.initCharts(), 100);
            }
          }
        }
      });
    
    this.subscriptions.push(sub);
  }
  
  private processRecentBooks(books: any[]): void {
    // First, sort and limit to 6 most recent books
    const recentBooks = books
      .filter(book => book)
      .sort((a, b) => {
        const dateA = a.dateRead || a.dateFinished || a.date_read;
        const dateB = b.dateRead || b.dateFinished || b.date_read;
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        try {
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        } catch (err) {
          console.error('Error comparing dates', err);
          return 0;
        }
      })
      .slice(0, 6);
    
    // Create initial book objects
    this.recentBooks = recentBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url || book.coverUrl || this.defaultBookCover,
      dateFinished: book.dateRead || book.dateFinished || book.date_read,
      genre: book.genre
    }));
    
    // Enhance books with Google Books API data (better covers and details)
    recentBooks.forEach((book, index) => {
      // Create a search query based on title and author
      const query = `intitle:${encodeURIComponent(book.title)}+inauthor:${encodeURIComponent(book.author)}`;
      
      // Fetch from Google Books API
      this.http.get<any>(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`)
        .pipe(
          catchError(error => {
            console.error('Error fetching Google Books data:', error);
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.items && response.items.length > 0) {
            const item = response.items[0];
            const volumeInfo = item.volumeInfo;
            
            // Only update if we can find the book in our array
            const bookToUpdate = this.recentBooks.find(b => 
              b.title === book.title && b.author === book.author);
            
            if (bookToUpdate) {
              // Update with better cover image if available
              if (volumeInfo.imageLinks && volumeInfo.imageLinks.thumbnail) {
                bookToUpdate.coverUrl = volumeInfo.imageLinks.thumbnail;
              }
              
              // Update genre if not already set
              if (!bookToUpdate.genre && volumeInfo.categories && volumeInfo.categories.length > 0) {
                bookToUpdate.genre = volumeInfo.categories[0];
              }
            }
          }
        });
    });
  }
  
  private processGenreData(books: any[]): void {
    // Create a map to count books by genre
    const genreCounts = new Map<string, number>();
    
    books.forEach(book => {
      if (book.genre) {
        const count = genreCounts.get(book.genre) || 0;
        genreCounts.set(book.genre, count + 1);
      }
    });
    
    // Convert to GenreData format
    const totalBooks = books.length;
    this.genreData = Array.from(genreCounts.entries())
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: Math.round((count / totalBooks) * 100)
      }))
      .sort((a, b) => b.count - a.count); // Sort by count in descending order
    
    // Refresh genre chart if visible
    if (this.activeTab === 'stats' && this.genreChart) {
      this.initGenreChart();
    }
  }
  
  private processMonthlyReadingData(books: any[]): void {
    // Create a map to count books by month
    const monthCounts = new Map<string, number>();
    
    // Get current and previous 11 months
    const months = [];
    const monthNames = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 
                        'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень']; // Fixed typo here
    
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = monthNames[monthDate.getMonth()];
      const monthKey = `${monthName} ${monthDate.getFullYear()}`;
      months.unshift(monthKey); // Add to beginning to maintain chronological order
      monthCounts.set(monthKey, 0); // Initialize with zero
    }
    
    // Count books by month finished - check both dateFinished and dateRead properties
    books.forEach(book => {
      // Look for dateRead (from server model) or dateFinished (possibly aliased in client)
      const finishDate = book.dateRead || book.dateFinished || book.date_read;
      
      if (finishDate) {
        try {
          const parsedDate = new Date(finishDate);
          const monthName = monthNames[parsedDate.getMonth()];
          const monthKey = `${monthName} ${parsedDate.getFullYear()}`;
          
          // Only count books from the last 12 months
          if (monthCounts.has(monthKey)) {
            const count = monthCounts.get(monthKey) || 0;
            monthCounts.set(monthKey, count + 1);
          }
        } catch (err) {
          console.error('Error processing date:', err, finishDate);
        }
      }
    });
    
    // Convert to MonthlyReadingData format
    this.monthlyReadingData = months.map(month => ({
      month,
      count: monthCounts.get(month) || 0
    }));
    
    // Refresh activity chart if visible
    if (this.activeTab === 'stats' && this.activityChart) {
      this.initActivityChart();
    }
  }
  
  setActiveTab(tab: 'info' | 'stats'): void {
    this.activeTab = tab;
    if (tab === 'stats') {
      // Give more time for the DOM to render and all data to be loaded
      setTimeout(() => this.initCharts(), 300);
    }
  }
  
  calculateProgressPercentage(): number {
    if (!this.userProfile || !this.userProfile.goal || this.userProfile.goal === 0) {
      return 0;
    }
    
    const read = this.userProfile.read || 0;
    const goal = this.userProfile.goal;
    
    const percentage = Math.min(Math.round((read / goal) * 100), 100);
    return percentage;
  }
  
  private destroyCharts(): void {
    if (this.readingProgressChartInstance) {
      this.readingProgressChartInstance.destroy();
      this.readingProgressChartInstance = null;
    }
    
    if (this.genreChartInstance) {
      this.genreChartInstance.destroy();
      this.genreChartInstance = null;
    }
    
    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
      this.activityChartInstance = null;
    }
  }
  
  initCharts(): void {
    try {
      if (!this.readingProgressChart || !this.genreChart || !this.activityChart) {
        console.warn('Chart elements not available yet, retrying in 300ms');
        setTimeout(() => this.initCharts(), 300);
        return;
      }
      
      this.initReadingProgressChart();
      this.initGenreChart();
      this.initActivityChart();
    } catch (error) {
      console.error('Error initializing charts:', error);
    }
  }
  
  initReadingProgressChart(): void {
    if (!this.readingProgressChart || !this.readingProgressChart.nativeElement) {
      console.warn('Reading progress chart element not available');
      return;
    }
    
    if (!this.userProfile) {
      console.warn('User profile data not available for reading progress chart');
      return;
    }
    
    const read = this.userProfile.read || 0;
    const goal = this.userProfile.goal || 0;
    const remaining = Math.max(0, goal - read);
    
    // Знищуємо попередній екземпляр діаграми, якщо він існує
    if (this.readingProgressChartInstance) {
      this.readingProgressChartInstance.destroy();
    }
    
    const ctx = this.readingProgressChart.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Cannot get 2D context from canvas element');
      return;
    }
    
    this.readingProgressChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Прочитано', 'Залишилось'],
        datasets: [{
          data: [read, remaining],
          backgroundColor: [
            '#d2905b',
            '#e8dfd5'
          ],
          borderColor: [
            '#d2905b',
            '#e8dfd5'
          ],
          borderWidth: 1,
          hoverOffset: 4
        }]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Roboto, sans-serif',
                size: 14
              },
              color: '#6b584a',
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#3e3128',
            titleFont: {
              family: 'Roboto, sans-serif',
              size: 16
            },
            bodyFont: {
              family: 'Roboto, sans-serif',
              size: 14
            },
            padding: 15,
            displayColors: false
          }
        }
      }
    });
  }
  
  initGenreChart(): void {
    if (!this.genreChart || !this.genreChart.nativeElement) {
      console.warn('Genre chart element not available');
      return;
    }
    
    if (this.genreData.length === 0) {
      console.warn('No genre data available for chart');
      return;
    }
    
    // Знищуємо попередній екземпляр діаграми, якщо він існує
    if (this.genreChartInstance) {
      this.genreChartInstance.destroy();
    }
    
    const ctx = this.genreChart.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Cannot get 2D context from canvas element');
      return;
    }
    
    // Use real genre data from API
    const labels = this.genreData.map(item => item.genre);
    const data = this.genreData.map(item => item.percentage);
    
    // Generate colors
    const colors = [
      '#d2905b', '#c07d48', '#e9b872', '#b57a49', '#d1c3b5', 
      '#aa5f45', '#d6a974', '#cc7352', '#dbbe95', '#bf9268'
    ];
    
    this.genreChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#fcf9f5',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                family: 'Roboto, sans-serif',
                size: 12
              },
              color: '#6b584a',
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: '#3e3128',
            titleFont: {
              family: 'Roboto, sans-serif',
              size: 14
            },
            bodyFont: {
              family: 'Roboto, sans-serif',
              size: 13
            },
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `${context.label}: ${context.raw}%`;
              }
            }
          }
        }
      }
    });
  }
  
  initActivityChart(): void {
    if (!this.activityChart || !this.activityChart.nativeElement) {
      console.warn('Activity chart element not available');
      return;
    }
    
    if (this.monthlyReadingData.length === 0) {
      console.warn('No monthly reading data available for chart');
      return;
    }
    
    // Знищуємо попередній екземпляр діаграми, якщо він існує
    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
    }
    
    const ctx = this.activityChart.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Cannot get 2D context from canvas element');
      return;
    }
    
    // Use real monthly reading data from API
    const labels = this.monthlyReadingData.map(item => item.month);
    const data = this.monthlyReadingData.map(item => item.count);
    
    this.activityChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Прочитано книг',
          data: data,
          backgroundColor: '#d2905b',
          borderColor: '#c07d48',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: 'Roboto, sans-serif',
                size: 12
              },
              color: '#6b584a'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: '#e8dfd5'
            },
            ticks: {
              precision: 0,
              font: {
                family: 'Roboto, sans-serif',
                size: 12
              },
              color: '#6b584a'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#3e3128',
            titleFont: {
              family: 'Roboto, sans-serif',
              size: 14
            },
            bodyFont: {
              family: 'Roboto, sans-serif',
              size: 13
            },
            padding: 12
          }
        }
      }
    });
  }
  
  triggerFileUpload(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }
  
  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }
    
    const file = fileInput.files[0];
    
    if (!file.type.match('image.*')) {
      alert('Будь ласка, виберіть файл зображення (JPEG, PNG, GIF тощо).');
      return;
    }
    
    // Перевірка розміру файлу (обмеження до 5 МБ)
    if (file.size > 5 * 1024 * 1024) {
      alert('Розмір файлу перевищує 5 МБ. Будь ласка, виберіть файл меншого розміру.');
      return;
    }
    
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    this.isLoading = true;
    
    const sub = this.http.post(this.api + "/update-profile-picture", formData, { withCredentials: true })
      .pipe(
        catchError(error => {
          alert('Помилка при завантаженні зображення. Спробуйте пізніше.');
          return this.handleError(error);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          // Оновлюємо профіль після успішного завантаження аватара
          this.loadUserProfile();
        }
      });
    
    this.subscriptions.push(sub);
  }
}