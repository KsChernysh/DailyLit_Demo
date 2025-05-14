import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

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
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, AfterViewInit {
  @ViewChild('readingProgressChart') readingProgressChart!: ElementRef;
  @ViewChild('genreChart') genreChart!: ElementRef;
  @ViewChild('activityChart') activityChart!: ElementRef;
  
  userProfile: UserProfile | null = null;
  errorMessage: string | null = null;
  activeTab: 'info' | 'stats' = 'info';
  recentBooks: Book[] = [];
  
  // Стандартні зображення
  defaultAvatar: string = 'assets/images/default-avatar.png';
  defaultBookCover: string = 'assets/images/default-book-cover.png';
  
  // Змінні для діаграм
  readingProgressChartInstance: Chart | null = null;
  genreChartInstance: Chart | null = null;
  activityChartInstance: Chart | null = null;

  constructor(private http: HttpClient) {}
  api = "https://localhost:7172/api/Profile";

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadRecentBooks();
  }
  
  ngAfterViewInit(): void {
    // Ініціалізуємо діаграми після завантаження представлення
    setTimeout(() => {
      if (this.userProfile) {
        this.initCharts();
      }
    }, 500);
  }
  
  loadUserProfile(): void {
    this.http.get<UserProfile>(this.api + "/profile", { withCredentials: true }).subscribe(
      (data) => {
        this.userProfile = data;
        if (this.activeTab === 'stats') {
          setTimeout(() => this.initCharts(), 100);
        }
      },
      (error) => {
        console.error('Error fetching profile', error);
        this.errorMessage = 'Помилка завантаження профілю. Спробуйте пізніше.';
      }
    );
  }
  
  loadRecentBooks(): void {
    // Припустимо, що у вас є API для отримання нещодавно прочитаних книг
    this.http.get<Book[]>('https://localhost:7172/api/Books/recent', { withCredentials: true })
      .subscribe(
        (books) => {
          this.recentBooks = books.slice(0, 6); // Обмежуємо до 6 книг
        },
        (error) => {
          console.error('Error fetching recent books', error);
          // Використовуємо тестові дані, якщо API не доступне
          this.loadMockBooks();
        }
      );
  }
  
  loadMockBooks(): void {
    // Тестові дані для нещодавно прочитаних книг
    this.recentBooks = [
      {
        id: '1',
        title: 'Кобзар',
        author: 'Тарас Шевченко',
        dateFinished: new Date(2023, 9, 15)
      },
      {
        id: '2',
        title: 'Гаррі Поттер і філософський камінь',
        author: 'Дж. К. Роулінг',
        dateFinished: new Date(2023, 8, 20)
      },
      {
        id: '3',
        title: 'Тигролови',
        author: 'Іван Багряний',
        dateFinished: new Date(2023, 7, 5)
      }
    ];
  }
  
  setActiveTab(tab: 'info' | 'stats'): void {
    this.activeTab = tab;
    if (tab === 'stats' && this.userProfile) {
      setTimeout(() => this.initCharts(), 100);
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
  
  initCharts(): void {
    if (this.userProfile) {
      this.initReadingProgressChart();
      this.initGenreChart();
      this.initActivityChart();
    }
  }
  
  initReadingProgressChart(): void {
    if (!this.readingProgressChart) return;
    
    const read = this.userProfile?.read || 0;
    const goal = this.userProfile?.goal || 0;
    const remaining = Math.max(0, goal - read);
    
    // Знищуємо попередній екземпляр діаграми, якщо він існує
    if (this.readingProgressChartInstance) {
      this.readingProgressChartInstance.destroy();
    }
    
    this.readingProgressChartInstance = new Chart(this.readingProgressChart.nativeElement, {
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
    if (!this.genreChart) return;
    
    // Знищуємо попередній екземпляр діаграми, якщо він існує
    if (this.genreChartInstance) {
      this.genreChartInstance.destroy();
    }
    
    // Тут має бути логіка для отримання даних про жанри з API
    // Поки використовуємо тестові дані
    this.genreChartInstance = new Chart(this.genreChart.nativeElement, {
      type: 'pie',
      data: {
        labels: ['Фентезі', 'Класика', 'Наукова фантастика', 'Детектив', 'Інше'],
        datasets: [{
          data: [30, 25, 20, 15, 10],
          backgroundColor: [
            '#d2905b',
            '#c07d48',
            '#e9b872',
            '#b57a49',
            '#d1c3b5'
          ],
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
    if (!this.activityChart) return;
    
    // Знищуємо попередній екземпляр діаграми, якщо він існує
    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
    }
    
    // Місяці для осі X
    const months = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
    
    // Тут має бути логіка для отримання даних про активність по місяцях з API
    // Поки використовуємо тестові дані
    this.activityChartInstance = new Chart(this.activityChart.nativeElement, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Прочитано книг',
          data: [2, 3, 1, 4, 2, 5, 3, 2, 4, 3, 1, 0], // Тестові дані
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
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      
      if (file.type.match('image.*')) {
        const formData = new FormData();
        formData.append('profilePicture', file);
        
        this.http.post(this.api + "/update-profile-picture", formData, { withCredentials: true })
          .subscribe(
            () => {
              // Оновлюємо профіль після успішного завантаження аватара
              this.loadUserProfile();
            },
            (error) => {
              console.error('Error uploading profile picture', error);
              alert('Помилка при завантаженні зображення. Спробуйте пізніше.');
            }
          );
      } else {
        alert('Будь ласка, виберіть файл зображення (JPEG, PNG, GIF тощо).');
      }
    }
  }
}
