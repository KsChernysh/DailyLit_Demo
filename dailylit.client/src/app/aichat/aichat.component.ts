import { Component, OnInit } from '@angular/core';
import { GeminiService } from '../gemini.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BookService } from '../book.service';
import { Router } from '@angular/router';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

interface BookRecommendation {
  title: string;
  author: string;
  cover_url?: string;
  id?: string;
  description?: string;
}

@Component({
  selector: 'app-aichat',
  templateUrl: './aichat.component.html',
  styleUrls: ['./aichat.component.css']
})
export class AichatComponent implements OnInit {
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  history: { role: string; parts: any[] }[] = [];
  
  // Змінні для рекомендацій
  recommendedBooks: BookRecommendation[] = [];
  isGeneratingRecommendations: boolean = false;
  showCarousel: boolean = false;
  currentCarouselIndex: number = 0;
  
  constructor(
    private geminiService: GeminiService, 
    private http: HttpClient,
    private bookService: BookService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Додаємо привітальне повідомлення
    this.messages.push({
      role: 'bot',
      content: 'Привіт! Я ваш AI-асистент з книг. Ви можете запитати мене про літературу або написати "Порекомендуй мені книгу" для отримання рекомендацій.'
    });
  }

  sendMessage() {
    const message = this.userInput.trim();
    if (!message || this.isLoading) return;

    // Додаємо повідомлення користувача
    this.messages.push({ role: 'user', content: message });
    this.history.push({ role: 'user', parts: [{ text: message }] });
    this.userInput = '';
    this.isLoading = true;
    
    // Перевіряємо на тригерну фразу
    if (message.toLowerCase().includes('порекомендуй') && 
        message.toLowerCase().includes('книгу')) {
      this.generateBookRecommendations(message);
    } else {
      // Звичайний запит до Gemini
      this.geminiService.generateContentWithGeminiPro(message, this.history)
        .subscribe(
          (response: string) => {
            this.messages.push({ role: 'bot', content: response });
            this.history.push({ role: 'bot', parts: [{ text: response }] });
            this.isLoading = false;
          },
          (error: any) => {
            console.error('Error generating response:', error);
            this.messages.push({ role: 'bot', content: 'Виникла помилка. Спробуйте ще раз.' });
            this.isLoading = false;
          }
        );
    }
  }

  generateBookRecommendations(userMessage: string) {
    this.isGeneratingRecommendations = true;
    this.recommendedBooks = [];
    
    // Створюємо промпт для отримання рекомендацій
    const prompt = `Порекомендуй 5 книг на основі запиту: "${userMessage}".
    Надай відповідь у форматі JSON-масиву з об'єктами, які містять поля "title" і "author".
    Наприклад: [{"title":"Назва книги 1","author":"Автор 1"},{"title":"Назва книги 2","author":"Автор 2"}].
    Не включай в відповідь нічого окрім JSON.`;
    
    this.geminiService.generateContentWithGeminiPro(prompt, [])
      .subscribe(
        (response: string) => {
          try {
            console.log("AI рекомендаційна відповідь:", response);
            
            // Очищаємо відповідь від markdown та інших форматувань
            const cleanedResponse = response.replace(/```json|```/g, '').trim();
            
            // Парсимо JSON
            const recommendations = JSON.parse(cleanedResponse);
            console.log("Розпізнані рекомендації:", recommendations);
            
            // Відображаємо користувачу початкове повідомлення
            this.messages.push({ 
              role: 'bot', 
              content: 'Ось декілька книг, які можуть вам сподобатися. Я шукаю більше інформації про них...' 
            });
            
            // Шукаємо детальну інформацію про кожну книгу
            this.searchRecommendedBooks(recommendations);
          } catch (error) {
            console.error('Помилка обробки рекомендацій:', error, 'Відповідь:', response);
            this.messages.push({ 
              role: 'bot', 
              content: 'Вибачте, але я не зміг згенерувати рекомендації. Спробуйте уточнити запит, наприклад: "Порекомендуй мені книги про пригоди"' 
            });
            this.isLoading = false;
            this.isGeneratingRecommendations = false;
          }
        },
        error => {
          console.error('Помилка генерації рекомендацій:', error);
          this.messages.push({ 
            role: 'bot', 
            content: 'Виникла помилка при генерації рекомендацій. Спробуйте пізніше.' 
          });
          this.isLoading = false;
          this.isGeneratingRecommendations = false;
        }
      );
  }
  
  searchRecommendedBooks(recommendations: any[]) {
    // Створимо масив запитів для пошуку кожної книги
    const searchRequests = recommendations.map(book => {
      const query = `intitle:${book.title} inauthor:${book.author}`;
      return this.http.get<any>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`)
        .pipe(
          map(response => {
            if (response && response.items && response.items.length > 0) {
              const item = response.items[0];
              return {
                id: item.id,
                title: book.title,
                author: book.author,
                cover_url: item.volumeInfo?.imageLinks?.thumbnail || 'assets/no-cover.png',
                description: item.volumeInfo?.description || 'Опис відсутній'
              };
            }
            return {
              title: book.title,
              author: book.author,
              cover_url: 'assets/no-cover.png',
              description: 'Інформація не знайдена'
            };
          }),
          catchError(() => {
            return of({
              title: book.title,
              author: book.author,
              cover_url: 'assets/no-cover.png',
              description: 'Помилка пошуку'
            });
          })
        );
    });
    
    // Виконуємо всі запити паралельно
    forkJoin(searchRequests).subscribe(
      (results) => {
        this.recommendedBooks = results;
        this.showCarousel = true;
        this.isLoading = false;
        this.isGeneratingRecommendations = false;
        
        // Додаємо повідомлення з результатами
        this.messages.push({ 
          role: 'bot', 
          content: 'Готово! Я знайшов деталі для рекомендованих книг. Ви можете побачити їх нижче.' 
        });
        
        console.log("Знайдені книги:", this.recommendedBooks);
      },
      (error) => {
        console.error('Помилка пошуку книг:', error);
        this.messages.push({ 
          role: 'bot', 
          content: 'Я знайшов рекомендації, але не зміг отримати детальну інформацію про книги. Спробуйте пізніше.' 
        });
        this.isLoading = false;
        this.isGeneratingRecommendations = false;
      }
    );
  }
  
  // Методи для керування каруселлю
  nextSlide() {
    this.currentCarouselIndex = 
      (this.currentCarouselIndex + 1) % this.recommendedBooks.length;
  }
  
  prevSlide() {
    this.currentCarouselIndex = 
      (this.currentCarouselIndex - 1 + this.recommendedBooks.length) % this.recommendedBooks.length;
  }
  
  viewBookDetails(bookId: string) {
    if (bookId) {
      this.router.navigate(['/book', bookId]);
    }
  }
  
  closeCarousel() {
    this.showCarousel = false;
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}