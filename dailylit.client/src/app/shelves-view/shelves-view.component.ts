import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shelves-view',
  templateUrl: './shelves-view.component.html',
  styleUrls: ['./shelves-view.component.css']
})
export class ShelvesViewComponent implements OnInit {
  shelves: any[] = [];
  shelfName: string = '';
  message: string = '';
  isDialogOpen: boolean = false;
  api: string = "https://localhost:7172/api/Books";
  isSuccess: boolean = true; // Для стилізації повідомлень

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadShelves();
  }

  loadShelves() {
    console.log('Loading shelves...');
    this.http.get<string[]>(`${this.api}/shelves`, { withCredentials: true }).subscribe(
      (data) => {
        console.log('Shelves loaded:', data);
        this.shelves = data;
      },
      (error) => {
        this.message = 'Error loading shelves.';
        console.error('Error loading shelves:', error);
      }
    );
  }

  openDialog() {
    this.isDialogOpen = true;
    this.message = '';
  }

  closeDialog() {
    this.isDialogOpen = false;
    this.shelfName = '';
    this.message = '';
  }

  onSubmit() {
    if (!this.shelfName || this.shelfName.trim() === '') {
      this.message = 'Будь ласка, введіть назву полиці';
      this.isSuccess = false;
      setTimeout(() => this.message = '', 5000);
      return;
    }

    this.createShelf(this.shelfName);
    this.closeDialog();
  }

  createShelf(title: string) {
    this.http.post(this.api + '/shelves', { title: title }, { withCredentials: true })
      .subscribe(
        response => {
          this.shelves.push({ title: title, count: 0 });
          this.message = 'Полицю успішно створено!';
          this.isSuccess = true;
          setTimeout(() => this.message = '', 5000);
        },
        error => {
          console.error('Помилка створення полиці:', error);
          this.message = 'Не вдалося створити полицю. Спробуйте ще раз.';
          this.isSuccess = false;
          setTimeout(() => this.message = '', 5000);
        }
      );
  }

  apicall(title: string) {
    const encodedTitle = encodeURIComponent(title);
    this.shelfName = title;
    this.http.get(`${this.api}/books?shelfName=${encodedTitle}`, { withCredentials: true }).subscribe(
      data => {
        console.log(data);
        this.router.navigate([`/shelf`, title]);
      },
      error => {
        console.error('Error fetching books:', error);
        this.message = 'Помилка при завантаженні книг.';
      }
    );
  }
}
