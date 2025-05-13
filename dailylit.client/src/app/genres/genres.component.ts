import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { BookService } from '../book.service';
import { GlobalVariablesService } from '../global.variables.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-genres',
  templateUrl: './genres.component.html',
  styleUrls: ['./genres.component.css']
})
export class GenresComponent implements OnInit {
  books: any[] = [];
  genres: string[] = [
    'Fantasy', 'Science Fiction', 'Mystery', 'Non Fiction', 'Romance',
    'Business', 'Classics', 'Comics', 'Fiction', 'Horror'
  ];
  title = 'dailylit.client';
  isSidenavOpen = false;

  // Для пошуку
  searchQuery: string = '';
  filteredGenres: string[] = [];

  // Для відображення кількості книг у жанрі
  genreCounts: {[key: string]: number} = {};

  // Для сортування та відображення книг
  sortOption: string = 'relevance';
  viewMode: string = 'grid';
  selectedGenre: string = '';

  constructor(
    private http: HttpClient,
    private global: GlobalVariablesService,
    private bookService: BookService,
    private router: Router
  ) {} 

  ngOnInit() {
    // Ініціалізація фільтрованих жанрів
    this.filteredGenres = [...this.genres];
    
    // Заповнення кількості книг (приклад)
    this.genres.forEach(genre => {
      // В реальному застосуванні, ви б отримували ці дані з сервісу
      this.genreCounts[genre] = Math.floor(Math.random() * 100) + 1;
    });
  }

  toggleSidenav() {
    this.isSidenavOpen = !this.isSidenavOpen;
  }

  goTo(genre: string) {
    this.global.selectedGenre = genre;
    this.bookService.getBooks(genre).subscribe((items: any[]) => {
      console.log('Fetched items:', items);
      const formattedGenre = genre.replace(/\s+/g, '-');  // Замінюємо пробіли на дефіси
      this.router.navigate(['genre', formattedGenre]); // Зміна маршруту
    }, error => {
      console.error('Error fetching books:', error);
    });
  }

  // Метод для фільтрації жанрів при пошуку
  filterGenres() {
    if (!this.searchQuery) {
      this.filteredGenres = [...this.genres];
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredGenres = this.genres.filter(genre => 
      genre.toLowerCase().includes(query)
    );
  }

  // Метод для очищення пошуку
  clearSearch() {
    this.searchQuery = '';
    this.filterGenres();
  }

  // Метод для перегляду всіх жанрів
  viewAllGenres() {
    this.selectedGenre = '';
    this.goTo('');
  }

  // Метод для встановлення режиму перегляду
  setViewMode(mode: string) {
    this.viewMode = mode;
  }

  // Метод для сортування книг
  sortBooks() {
    // Реалізуйте сортування через сервіс або компонент книжкового списку
    console.log(`Sorting by ${this.sortOption}`);
  }
}
