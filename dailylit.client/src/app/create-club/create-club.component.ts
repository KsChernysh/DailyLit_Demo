import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-create-club',
  templateUrl: './create-club.component.html',
  styleUrls: ['./create-club.component.css']
})
export class CreateClubComponent implements OnInit {
  club = {
    name: '',
    description: '',
    genre: '',
    image: '', // Changed from null to empty string
    topics: [], // Empty array for topics
    creator: null // Will be set by backend
  };

  // Add genre list
  genres: string[] = [
    'Фантастика', 'Детектив', 'Романтика', 'Пригоди',
    'Наукова література', 'Історія', 'Фентезі', 'Класика',
    'Поезія', 'Драма', 'Художня література', 'Біографія',
    'Філософія', 'Психологія', 'Самовдосконалення', 'Інше'
  ];
  
  imagePreview: string | null = null;
  submitting = false;
  error = ''; // Initialize as empty string
  apiUrl = 'https://localhost:7172/api/Community';
  isCreating = true; // Flag to indicate we are creating, not editing

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Переконуємось, що на цій сторінці не робимо запити на завантаження даних клубу
    // Для запобігання помилок навігації з порожнім ID
    this.route.url.subscribe(() => {
      // Встановлюємо режим створення нового клубу
      this.isCreating = true;
      // Скидаємо всі поля форми до початкових значень
      this.club = {
        name: '',
        description: '',
        genre: '',
        image: '',
        topics: [],
        creator: null
      };
      this.error = '';
      this.submitting = false;
      this.imagePreview = null;
    });
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Create preview for the image
      const previewReader = new FileReader();
      previewReader.onload = () => {
        this.imagePreview = previewReader.result as string;
      };
      previewReader.readAsDataURL(file);
      
      // Store the image as base64 string for sending to server
      const reader = new FileReader();
      reader.onload = () => {
        // Convert to base64 string and store it
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., 'data:image/jpeg;base64,')
        const base64 = base64String.split(',')[1];
        this.club.image = base64; // Now this will work as image is string
      };
      reader.readAsDataURL(file);
    }
  }

  createClub(): void {
    if (this.submitting) return;
    
    this.submitting = true;
    this.error = '';
    
    // Set headers for JSON
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Create final data object
    const clubData = {
      name: this.club.name,
      description: this.club.description,
      genre: this.club.genre,
      image: this.club.image,  // base64 string
      topics: [],  // Empty topics array
      creator: {
        userName: ""  // Додаємо порожнє поле userName, яке вимагає бекенд
      }
    };
    
    // Send request to create club
    this.http.post<any>(
      `${this.apiUrl}/Clubs`, 
      clubData, 
      { headers: headers, withCredentials: true }
    ).subscribe({
      next: (data) => {
        this.submitting = false;
        this.router.navigate(['/community']);
      },
      error: (error) => {
        console.error('Error creating club:', error);
        this.submitting = false;
        if (error.error && error.error.errors) {
          // Оновлене форматування повідомлення помилки для відображення конкретної інформації про помилку валідації
          const errorMessages = [];
          for (const key in error.error.errors) {
            errorMessages.push(`${key}: ${error.error.errors[key]}`);
          }
          this.error = `Помилка при створенні клубу: ${errorMessages.join(", ")}`;
        } else {
          this.error = `Помилка при створенні клубу: ${error.error?.title || error.message || 'Спробуйте знову пізніше.'}`;
        }
      }
    });
  }
}