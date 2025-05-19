import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-community',
  templateUrl: './community.component.html',
  styleUrls: ['./community.component.css']
})
export class CommunityComponent implements OnInit {
  clubs: any[] = [];
  filteredClubs: any[] = [];
  loading: boolean = true;
  error: string = '';
  apiUrl = 'https://localhost:7172/api/Community';
  
  // Genre filtering
  genres: string[] = [
    'Фантастика', 'Романтика', 'Історія', 'Наукова література',
    'Детектив', 'Фентезі', 'Пригоди', 'Біографія', 'Поезія', 'Бізнес'
  ];
  selectedGenre: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs(): void {
    this.loading = true;
    this.error = '';
    
    this.http.get<any[]>(`${this.apiUrl}/Clubs`, { withCredentials: true })
      .subscribe(
        data => {
          this.clubs = data;
          this.filteredClubs = [...this.clubs];
          this.loading = false;
        },
        error => {
          console.error('Error loading clubs:', error);
          this.error = 'Не вдалося завантажити клуби. Будь ласка, спробуйте пізніше.';
          this.loading = false;
        }
      );
  }

  // Navigate to club detail page
  goToClub(clubId: any): void {
    // Перевірка на валідність ID
    if (!clubId || isNaN(clubId)) {
      console.error('Некоректний ID клубу:', clubId);
      return; // Не робимо навігацію, якщо ID недійсний
    }
    
    // Використовуємо явне перетворення до числа для безпеки
    this.router.navigate(['/clubs', Number(clubId)]);
  }

  // Додаємо функцію isNaN для використання в шаблоні
  isNaN(value: any): boolean {
    return isNaN(value);
  }

  // Filter clubs by genre
  filterByGenre(genre: string): void {
    this.selectedGenre = genre;
    
    if (!genre) {
      this.filteredClubs = [...this.clubs];
      return;
    }
    
    if (genre === 'popular') {
      // Filter by popularity (for example, clubs with more members)
      this.filteredClubs = this.clubs
        .filter(club => club.membersCount > 5)
        .sort((a, b) => b.membersCount - a.membersCount);
    } else {
      // Filter by selected genre
      this.filteredClubs = this.clubs.filter(club => 
        club.genre && club.genre.toLowerCase() === genre.toLowerCase()
      );
    }
  }

  // Get avatar background color based on creator name
  getAvatarColor(name: string): string {
    if (!name) return '#d2905b'; // Default color
    
    // Simple hash function to generate consistent colors
    const hash = name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    // List of warm color options
    const colors = [
      '#d2905b', '#c07d48', '#b57a49', '#a06b40', 
      '#8a5a34', '#7d5230', '#6b584a', '#cc7352'
    ];
    
    return colors[hash % colors.length];
  }

  // Function to truncate text
  truncateText(text: string, maxLength: number): string {
    if (!text) {
      return '';
    }
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  // Function to format date
  formatDate(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}