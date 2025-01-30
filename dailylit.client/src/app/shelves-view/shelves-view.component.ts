import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadShelves();
  }

  loadShelves() {
    this.http.get<string[]>(`${this.api}/shelves`, { withCredentials: true }).subscribe(
      (data) => {
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
    
    /*
    Якщо сервер очікує об'єкт з властивістю `name`, використовуйте наступний підхід:

    const newShelf = { name: trimmedShelfName };
    this.http.post<any>(`${this.api}/add-shelf`, newShelf, { headers })
      .subscribe(
        (response) => {
          this.message = 'Поличка успішно додана!';
          this.shelfName = '';
          this.isDialogOpen = false;
          this.loadShelves();
        },
        (error) => {
          console.error('Error adding shelf:', error);
          this.message = 'Помилка при додаванні полиці.';
        }
      );
    */
   interface Shelf {
    name: string;
   }
  }
}
