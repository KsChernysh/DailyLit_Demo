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
    const trimmedShelfName = this.shelfName.trim();

    if (!trimmedShelfName) {
      this.message = 'Назва полиці не може бути порожньою.';
      return;
    }

    // Якщо сервер очікує простий рядок, відправляємо його у форматі JSON
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = JSON.stringify(trimmedShelfName); // Перетворюємо рядок у JSON строку

    this.http.post<string>(`${this.api}/add-shelf`, body, { headers, withCredentials: true })
      .subscribe(
        (response: any) => {
          this.message = 'Поличка успішно додана!';
          this.shelfName = '';
          this.isDialogOpen = false;
          this.loadShelves();
        },
        (error: any) => {
          console.error('Error adding shelf:', error);
          this.message = 'Помилка при додаванні полиці.';
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
