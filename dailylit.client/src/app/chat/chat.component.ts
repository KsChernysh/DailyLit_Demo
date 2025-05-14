import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ChatService } from '../chat.service';
import { AuthService } from '../auth.service';
import { interval, Subscription } from 'rxjs';

interface ChatMessage {
  bookId: string;    // ID книги
  userName: string;  // Ім'я користувача
  text: string;      // Текст повідомлення
  date?: Date;       // Дата повідомлення
  id?: string;       // ID повідомлення
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnChanges, OnDestroy {
  @Input() bookId!: string;
  messages: any[] = [];
  newMessage: string = '';
  currentUserName: string = 'Гість'; // Значення за замовчуванням
  isLoading: boolean = false;
  
  // Змінні для розумного оновлення
  private pollingInterval: Subscription | undefined;
  pollingActive: boolean = true;
  private lastUpdateTime: number = 0;
  private silentUpdate: boolean = true;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    console.log('ChatComponent initialized with bookId:', this.bookId);
    
    // В деяких випадках bookId може прийти пізніше, тому перевіряємо тут
    if (this.bookId) {
      this.loadMessages();
      this.startAutoRefresh(); // Починаємо автоматичне оновлення
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
      
      // Перезапускаємо автооновлення при зміні ID книги
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }
  
  // Вивільнення ресурсів при знищенні компонента
  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadMessages(silent: boolean = false) {
    if (!this.bookId) {
      console.error('BookId is not provided!');
      return;
    }
    
    console.log(`Loading messages for book ID: ${this.bookId}`);
    if (!silent) {
      this.isLoading = true;
    }
    
    this.chatService.getMessages(this.bookId).subscribe(
      (data: any) => {
        if (data) {
          // Перевірка на нові повідомлення
          const newMessages = this.getNewMessages(data);
          
          if (newMessages.length > 0) {
            // Додаємо тільки нові повідомлення, не оновлюючи весь список
            this.smartUpdateMessages(newMessages);
          } else if (data.length !== this.messages.length) {
            // Якщо кількість повідомлень змінилась, але ми не знайшли нових
            // (може статись, якщо видалили якісь повідомлення), оновлюємо весь список
            this.messages = data;
          }
        } else {
          this.messages = [];
        }
        
        this.isLoading = false;
        this.lastUpdateTime = Date.now();
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
      text: this.newMessage,         // Текст повідомлення
      date: new Date()              // Додаємо поточну дату
    };

    console.log('Sending message:', message);

    this.chatService.addMessage(message).subscribe(
      (response: any) => {
        console.log('Message sent successfully', response);
        this.newMessage = '';
        
        // Додаємо наше повідомлення до списку одразу, не чекаючи оновлення
        if (response && response.id) {
          // Якщо сервер повернув повідомлення з ID
          this.messages.push(response);
        } else {
          // Якщо сервер не повернув повідомлення, додаємо локально
          this.messages.push(message);
        }
        
        // Через 1 секунду оновлюємо список, щоб отримати остаточну версію з сервера
        setTimeout(() => this.loadMessages(true), 1000);
      },
      error => {
        console.error('Error sending message:', error);
        alert('Помилка при відправці повідомлення. Будь ласка, спробуйте ще раз.');
      }
    );
  }
  
  // Нові методи для розумного оновлення коментарів
  startAutoRefresh() {
    if (!this.bookId) return;
    
    // Оновлюємо коментарі з різними інтервалами в залежності від активності
    this.pollingInterval = interval(5000).subscribe(() => {
      if (this.pollingActive && this.bookId) {
        // Перевіряємо, чи минуло достатньо часу з останнього оновлення
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        
        // Змінюємо інтервал в залежності від часу з останньої активності
        let shouldUpdate = false;
        
        if (timeSinceLastUpdate < 30000) { // Менше 30 секунд - часте оновлення
          shouldUpdate = true;
        } else if (timeSinceLastUpdate < 120000) { // До 2 хвилин - середня частота
          shouldUpdate = now % 15000 < 5000; // Кожні 15 секунд
        } else { // Більше 2 хвилин - рідке оновлення
          shouldUpdate = now % 30000 < 5000; // Кожні 30 секунд
        }
        
        if (shouldUpdate) {
          console.log('Auto-refreshing messages silently...');
          this.loadMessages(this.silentUpdate);
        }
      }
    });
  }
  
  stopAutoRefresh() {
    if (this.pollingInterval) {
      this.pollingInterval.unsubscribe();
      this.pollingInterval = undefined;
    }
  }
  
  // Метод для ручного оновлення коментарів
  refreshMessages() {
    console.log('Manually refreshing messages...');
    this.lastUpdateTime = Date.now(); // Оновлюємо час останньої активності
    this.loadMessages(false); // Не приховуємо індикатор завантаження
  }
  
  // Метод для вмикання/вимикання автооновлення
  toggleAutoRefresh() {
    this.pollingActive = !this.pollingActive;
    console.log(`Auto-refresh ${this.pollingActive ? 'enabled' : 'disabled'}`);
    
    if (this.pollingActive && !this.pollingInterval) {
      this.startAutoRefresh();
    }
  }
  
  // Метод для перевірки нових повідомлень
  private getNewMessages(newData: any[]): any[] {
    if (!this.messages.length) return newData;
    
    // Отримуємо ID або дати поточних повідомлень
    const existingIds = new Set();
    this.messages.forEach(msg => {
      if (msg.id) {
        existingIds.add(msg.id);
      } else if (msg.date) {
        existingIds.add(new Date(msg.date).getTime().toString());
      }
    });
    
    // Знаходимо нові повідомлення
    return newData.filter(msg => {
      if (msg.id && !existingIds.has(msg.id)) {
        return true;
      }
      
      if (msg.date && !existingIds.has(new Date(msg.date).getTime().toString())) {
        return true;
      }
      
      return false;
    });
  }
  
  // Метод для розумного оновлення повідомлень
  private smartUpdateMessages(newMessages: any[]) {
    if (!newMessages.length) return;
    
    // Додаємо анімацію до нових повідомлень
    newMessages.forEach(msg => {
      msg.isNew = true; // Додаємо флаг для CSS анімації
      
      // Через 3 секунди прибираємо флаг, щоб анімація зникла
      setTimeout(() => {
        msg.isNew = false;
      }, 3000);
      
      this.messages.push(msg);
    });
    
    // Після додавання нових повідомлень прокручуємо до низу
    setTimeout(() => {
      // Знаходимо контейнер з повідомленнями і прокручуємо вниз
      const chatContainer = document.querySelector('.comments-list');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }
  
  // Перевірка чи повідомлення нове (для CSS анімації)
  isNewMessage(message: any): boolean {
    return message.isNew === true;
  }

  // Метод для генерації стабільного кольору для аватара на основі імені користувача
  getAvatarColor(userName: string): string {
    if (!userName || userName === 'Гість') {
      return '#9c8877'; // Колір за замовчуванням для гостей
    }
    
    // Генеруємо стабільний колір на основі імені
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Стильна палітра пісочних відтінків
    const colors = [
      '#d2905b', // Основний пісочний
      '#c07d48', // Темніший пісочний
      '#e9b872', // Світліший пісочний
      '#b57a49', // Коричневий пісочний
      '#d1c3b5', // Сірий пісочний
      '#796356', // Темно-коричневий
      '#a87b51', // Середній пісочний
      '#cb957a'  // Рожево-пісочний
    ];
    
    // Вибираємо колір з палітри на основі хешу імені
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  /**
   * Обробляє натискання клавіші Enter в текстовому полі
   * Відправляє повідомлення при натисканні Enter
   */
  handleKeyDown(event: Event): void {
    // Перетворення до типу KeyboardEvent
    const keyEvent = event as KeyboardEvent;
    
    // Пропускаємо обробку, якщо натиснуто Shift+Enter або Ctrl+Enter (для багаторядкового введення)
    if (keyEvent.shiftKey || keyEvent.ctrlKey) {
      return;
    }
    
    // Якщо просто Enter - відправляємо повідомлення
    if (keyEvent.key === 'Enter') {
      // Запобігаємо додаванню нового рядка в текстовому полі
      event.preventDefault();
      
      // Відправляємо повідомлення, якщо воно не порожнє
      if (this.newMessage.trim()) {
        this.sendMessage();
      }
    }
  }
}
