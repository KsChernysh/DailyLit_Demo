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
  count: number = 0;
  message: string = '';
  isDialogOpen: boolean = false;
  api: string = "https://localhost:7172/api/Books";
  isSuccess: boolean = true; // Для стилізації повідомлень

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadShelves();
  }

  loadBooksFromShelf(shelfName: string) {
    const encodedShelfName = encodeURIComponent(shelfName);
    this.http.get<any[]>(`${this.api}/shelf-books?shelfName=${encodedShelfName}`, { withCredentials: true }).subscribe(
      (data) => {
        console.log(`Books for shelf ${shelfName} loaded:`, data);
        
        // Find the shelf object and update its count
        const shelfIndex = this.shelves.findIndex(shelf => shelf.title === shelfName);
        if (shelfIndex !== -1) {
          this.shelves[shelfIndex].count = data.length;
        }
      },
      (error) => {
        console.error(`Error loading books for shelf ${shelfName}:`, error);
      }
    );
  }

  loadShelves() {
    console.log('Loading shelves...');
    this.http.get<any[]>(`${this.api}/shelves`, { withCredentials: true }).subscribe(
      (data) => {
        console.log('Shelves loaded:', data);
        // Initialize shelves with zero counts if not provided by API
        this.shelves = data.map(shelf => ({
          ...shelf,
          count: shelf.count || 0
        }));
        
        // Load book counts for each shelf
        this.shelves.forEach(shelf => {
          this.loadBooksFromShelf(shelf.title);
        });
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
    // Ensure title is properly trimmed
    const trimmedTitle = title.trim();
    
    // Log what we're sending to help with debugging
    console.log('Creating shelf with title:', trimmedTitle);
    
    // Send the title as a direct string, not as a JSON object
    this.http.post(`${this.api}/add-shelf`, JSON.stringify(trimmedTitle), { 
      withCredentials: true,
      headers: new HttpHeaders({ 
        'Content-Type': 'application/json' 
      })
    })
      .subscribe({
        next: (response) => {
          console.log('Shelf created successfully:', response);
          
          // Add the new shelf to the array with the same structure as API returns
          const newShelf = {
            id: response && (response as any).id ? (response as any).id : null,
            title: trimmedTitle,
            count: 0
          };
          
          this.shelves.push(newShelf);
          this.message = 'Полицю успішно створено!';
          this.isSuccess = true;
          setTimeout(() => this.message = '', 5000);
        },
        error: (error) => {
          console.error('Помилка створення полиці:', error);
          
          // Extract and display the specific validation errors if available
          if (error.error && error.error.errors) {
            console.error('Validation errors:', error.error.errors);
            this.message = 'Помилка: ' + Object.values(error.error.errors).flat().join(', ');
          } else {
            this.message = 'Не вдалося створити полицю. Спробуйте ще раз.';
          }
          
          this.isSuccess = false;
          setTimeout(() => this.message = '', 5000);
        }
      });
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
