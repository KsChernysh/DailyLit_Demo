import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookService } from '../book.service';
import { BookDetails } from '../book-details.model';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-book-detail',
  templateUrl: './book-detail.component.html',
  styleUrls: ['./book-detail.component.css']
})
export class BookDetailComponent implements OnInit {
  book!: BookDetails | null;
  corectId: string = '';
  shelves: any[] = [];
  selectedShelfId: string = ''; // Змінено на string, оскільки ID може бути рядком
  isDialogOpen: boolean = false;
  message: string = '';
  api: string = "https://localhost:7172/api/Books";


  constructor(
    private route: ActivatedRoute,
    private bookService: BookService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      const id = paramMap.get('id');
      this.corectId = id?.toString() || '';
    
      if (this.corectId) {
        this.bookService.getBookDetails(this.corectId).subscribe(
          (book: BookDetails) => {
            if (book) {
              this.book = {
                key: this.corectId || 'No Key',
                title: book.title || 'No Title',
                author_name: book.author_name || 'No Author',
                genre: book.genre || 'Fiction',
                cover_url: book.cover_url || 'assets/no-cover.png',
                description: this.stripHtmlTags(book.description || 'No Description Available'),
                pages: book.pages || 0,
                publish_date: book.publish_date || 'No Publish Date Available',
                rating: book.rating || 0,
                keywords: book.keywords || [],
              };
            } else {
              this.book = null;
              console.warn('Не вдалося знайти деталі книги з ID:', this.corectId);
            }
          },
          (error: any) => {
            console.error('Error fetching book details:', error);
            this.book = null;
          }
        );
      }
    });

    this.loadShelves();
  }

  loadShelves() {
    console.log('Завантаження полиць...');
    this.http.get<any[]>(`${this.api}/shelves`, { withCredentials: true }).subscribe(
      (data) => {
        this.shelves = data;
        console.log('Завантажено полиці:', this.shelves);
      },
      (error) => {
        this.message = 'Error loading shelves.';
        console.error('Error loading shelves:', error);
      }
    );
  }

  stripHtmlTags(str: string): string {
    return str.replace(/<\/?[^>]+(>|$)/g, "");
  }

  openDialog() {
    this.selectedShelfId = ''; // Скидаємо вибір при відкритті
    this.isDialogOpen = true;
    
    // Перевіряємо, чи полиці завантажені
    if (this.shelves.length === 0) {
      this.loadShelves();
    }
    
    console.log('Dialog opened, shelves:', this.shelves);
    console.log('selectedShelfId reset to:', this.selectedShelfId);
  }

  closeDialog() {
    console.log('Закриття діалогу');
    this.isDialogOpen = false;
    this.selectedShelfId = '';
  }

  onSubmit() {
    console.log('Submit button clicked, selectedShelfId:', this.selectedShelfId);
    
    if (!this.selectedShelfId) {
      console.error('No shelf selected');
      this.message = 'Будь ласка, виберіть полицю';
      setTimeout(() => {
        this.message = '';
      }, 3000);
      return;
    }
    
    if (!this.book) {
      console.error('Дані про книгу відсутні');
      this.message = 'Помилка: дані про книгу відсутні';
      setTimeout(() => {
        this.message = '';
      }, 3000);
      return;
    }

    // Get the selected shelf to check if it's the "Read" shelf
    const selectedShelf = this.shelves.find(shelf => shelf.id == this.selectedShelfId);
    const isReadShelf = selectedShelf && selectedShelf.title === "Read";

    const currentDate = new Date();
    
    const newBook = {
      title: this.book.title || 'No Title',
      author: this.book.author_name || 'No Author',
      cover_url: this.book.cover_url || 'assets/no-cover.png',
      key: this.corectId || this.book.key || 'No Key',
      status: '',
      rating: '',
      genre: this.book.genre || 'No Genre',
      booksadded: currentDate,  // Set when the book was added to any shelf
      dateRead: isReadShelf ? currentDate : null  // Set DateRead only if adding to "Read" shelf
    };

    console.log('Відправляємо книгу на сервер:', newBook);
    console.log('URL запиту:', `${this.api}/add-book?shelfNameKey=${this.selectedShelfId}`);

    // Додаємо додаткові заголовки для запиту
    this.http.post(`${this.api}/add-book?shelfNameKey=${this.selectedShelfId}`, newBook, { 
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }).subscribe(
      (response: any) => {
        console.log('Книгу успішно додано, відповідь:', response);
        this.message = 'Книгу успішно додано на полицю!';
        this.isDialogOpen = false;
        
        // Повідомлення зникає через 3 секунди
        setTimeout(() => {
          this.message = '';
        }, 3000);
      },
      (error: any) => {
        console.error('Помилка додавання книги на полицю:', error);
        this.message = 'Помилка додавання книги на полицю.';
        setTimeout(() => {
          this.message = '';
        }, 3000);
      }
    );
  }

  onShelfSelected(event: any) {
    const value = event.target.value;
    console.log('Shelf selected from dropdown:', value);
    this.selectedShelfId = value;
  }

  // Метод для вибору полиці через кнопки
 

  // Оновлена функція selectShelf, яка гарантовано працюватиме
  selectShelf(shelfId: any) {
    console.log('Вибрано полицю:', shelfId);
    this.selectedShelfId = shelfId;
    
    // Додаємо цей код для забезпечення відображення в UI
    setTimeout(() => {
      console.log('Після оновлення selectedShelfId:', this.selectedShelfId);
      const selectedShelf = this.shelves.find(shelf => shelf.id == this.selectedShelfId);
      console.log('Вибрана полиця:', selectedShelf);
    }, 0);
  }

  // Метод для отримання назви вибраної полиці
  getSelectedShelfTitle(): string {
    if (!this.selectedShelfId) return '';
    
    const selectedShelf = this.shelves.find(shelf => shelf.id == this.selectedShelfId);
    return selectedShelf ? selectedShelf.title : '';
  }
}
