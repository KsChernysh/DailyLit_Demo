import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { ChatService } from '../chat.service';
import { AuthService } from '../auth.service';

interface ChatMessage {
  bookId: string;    // ID книги
  userName: string;  // Ім'я користувача
  text: string;      // Текст повідомлення
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnChanges {
  @Input() bookId!: string;
  messages: any[] = [];
  newMessage: string = '';
  currentUserName: string = 'Гість'; // Значення за замовчуванням
  isLoading: boolean = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    console.log('ChatComponent initialized with bookId:', this.bookId);
    
    // В деяких випадках bookId може прийти пізніше, тому перевіряємо тут
    if (this.bookId) {
      this.loadMessages();
    }
    
    // Перевіряємо, чи користувач авторизований
    this.authService.isLoggedIn.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        // Тимчасово використовуємо збережене ім'я користувача або значення за замовчуванням
        const userName = localStorage.getItem('userName');
        if (userName) {
          this.currentUserName = userName;
        }
      }
    });
  }

  // Цей метод викликається, коли змінюються вхідні параметри (@Input)
  ngOnChanges(changes: SimpleChanges) {
    console.log('ChatComponent inputs changed:', changes);
    
    // Якщо змінився bookId і він не порожній, завантажуємо повідомлення
    if (changes['bookId'] && changes['bookId'].currentValue) {
      console.log('BookId changed to:', changes['bookId'].currentValue);
      this.loadMessages();
    }
  }

  loadMessages() {
    if (!this.bookId) {
      console.error('BookId is not provided!');
      return;
    }
    
    console.log(`Loading messages for book ID: ${this.bookId}`);
    this.isLoading = true;
    
    this.chatService.getMessages(this.bookId).subscribe(
      (data: any) => {
        console.log(`Received ${data ? data.length : 0} messages for book ID: ${this.bookId}`, data);
        this.messages = data || [];
        this.isLoading = false;
      },
      error => {
        console.error(`Error loading messages for book ID: ${this.bookId}`, error);
        this.isLoading = false;
      }
    );
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    if (!this.bookId) {
      console.error('Cannot send message: BookId is not provided!');
      alert('Помилка: ID книги не знайдено. Спробуйте оновити сторінку.');
      return;
    }

    // Створюємо об'єкт повідомлення відповідно до вимог API
    const message: ChatMessage = { 
      bookId: this.bookId,          // ID книги з @Input
      userName: this.currentUserName, // Ім'я поточного користувача
      text: this.newMessage          // Текст повідомлення
    };

    console.log('Sending message:', message);

    this.chatService.addMessage(message).subscribe(
      () => {
        console.log('Message sent successfully');
        this.newMessage = '';
        this.loadMessages(); // Оновлюємо список повідомлень
      },
      error => {
        console.error('Error sending message:', error);
        alert('Помилка при відправці повідомлення. Будь ласка, спробуйте ще раз.');
      }
    );
  }
}
