import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { GeminiService } from '../gemini.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { BookService } from '../book.service';
import { Router } from '@angular/router';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp?: Date;
}

interface BookRecommendation {
  title: string;
  author: string;
  cover_url?: string;
  id?: string;
  description?: string;
  reason?: string;
}

// Оновлена інтерфейс ReadingPlan без полів startDate та endDate
interface ReadingPlan {
  book: string;
  author: string;
  estimatedTime: string;
  pagesPerDay?: number;
  totalDays?: number;
  priority?: number;
  notes?: string;
}

@Component({
  selector: 'app-aichat',
  templateUrl: './aichat.component.html',
  styleUrls: ['./aichat.component.css']
})
export class AichatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  history: { role: string; parts: any[] }[] = [];
  
  // Preset prompts that will be displayed as buttons
  presetPrompts: string[] = [
    'Порекомендуй мені книгу',
    'Порекомендуй мені історичний роман',
    'Порекомендуй книгу для дітей',
    'Порекомендуй науково-популярну книгу',
    'Що почитати на вихідних?',
    'Сформуй мені книжковий план'
  ];
  
  // Змінні для рекомендацій
  recommendedBooks: BookRecommendation[] = [];
  isGeneratingRecommendations: boolean = false;
  showCarousel: boolean = false;
  currentCarouselIndex: number = 0;
  
  // Змінні для книжкового плану
  isGeneratingReadingPlan: boolean = false;
  showReadingPlan: boolean = false;
  readingPlan: ReadingPlan[] = [];
  sortedReadingPlan: ReadingPlan[] = [];
  readingPlanTotalDays: number | null = null;
  readingPlanDateRange: string | null = null;
  
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
      content: 'Привіт! Я ваш AI-асистент з книг. Ви можете запитати мене про літературу або скористатися готовими запитами нижче.',
      timestamp: new Date()
    });
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  // Метод для використання заготовлених запитів
  usePresetPrompt(prompt: string) {
    if (prompt === 'Сформуй мені книжковий план') {
      this.userInput = prompt;
      this.sendMessage();
    } else {
      // Для інших кнопок просто вставляємо текст у поле вводу
      this.userInput = prompt + ' про ';
      
      // Фокус на полі вводу
      setTimeout(() => {
        const inputElement = document.querySelector('.chat-input') as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }, 100);
    }
  }

  sendMessage() {
    const message = this.userInput.trim();
    if (!message || this.isLoading) return;

    // Додаємо повідомлення користувача
    this.messages.push({ 
      role: 'user', 
      content: message,
      timestamp: new Date()
    });
    
    this.history.push({ role: 'user', parts: [{ text: message }] });
    this.userInput = '';
    this.isLoading = true;
    
    // Перевіряємо на тригерні фрази для різних функцій
    if (message.toLowerCase().includes('порекомендуй') && 
        (message.toLowerCase().includes('книгу') || message.toLowerCase().includes('книги') || 
         message.toLowerCase().includes('почитати'))) {
      this.generateBookRecommendations(message);
    } else if (message.toLowerCase().includes('сформуй') && 
              message.toLowerCase().includes('книжковий план')) {
      this.generateReadingPlan();
    } else if (message.toLowerCase().includes('що почитати на вихідних')) {
      this.generateWeekendReading(message);
    } else {
      // Звичайний запит до Gemini
      this.geminiService.generateContentWithGeminiPro(message, this.history)
        .subscribe(
          (response: string) => {
            this.messages.push({ 
              role: 'bot', 
              content: response,
              timestamp: new Date()
            });
            this.history.push({ role: 'bot', parts: [{ text: response }] });
            this.isLoading = false;
          },
          (error: any) => {
            console.error('Error generating response:', error);
            this.messages.push({ 
              role: 'bot', 
              content: 'Виникла помилка. Спробуйте ще раз.',
              timestamp: new Date()
            });
            this.isLoading = false;
          }
        );
    }
  }

  generateBookRecommendations(userMessage: string) {
    this.isGeneratingRecommendations = true;
    this.recommendedBooks = [];
    
    // Додаємо початкове повідомлення про пошук рекомендацій
    this.messages.push({ 
      role: 'bot', 
      content: 'Шукаю книги, які можуть вам сподобатися...',
      timestamp: new Date()
    });
    
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
            
            // Шукаємо детальну інформацію про кожну книгу
            this.searchRecommendedBooks(recommendations);
          } catch (error) {
            console.error('Помилка обробки рекомендацій:', error, 'Відповідь:', response);
            this.messages.push({ 
              role: 'bot', 
              content: 'Вибачте, але я не зміг згенерувати рекомендації. Спробуйте уточнити запит, наприклад: "Порекомендуй мені книги про пригоди"',
              timestamp: new Date()
            });
            this.isLoading = false;
            this.isGeneratingRecommendations = false;
          }
        },
        error => {
          console.error('Помилка генерації рекомендацій:', error);
          this.messages.push({ 
            role: 'bot', 
            content: 'Виникла помилка при генерації рекомендацій. Спробуйте пізніше.',
            timestamp: new Date()
          });
          this.isLoading = false;
          this.isGeneratingRecommendations = false;
        }
      );
  }
  
  // Метод для генерації рекомендацій на вихідні
  generateWeekendReading(userMessage: string) {
    this.isGeneratingRecommendations = true;
    this.recommendedBooks = [];
    
    // Додаємо початкове повідомлення про пошук рекомендацій
    this.messages.push({ 
      role: 'bot', 
      content: 'Підбираю книги для вашого вікенду...',
      timestamp: new Date()
    });
    
    // Створюємо промпт для отримання рекомендацій
    const prompt = `Порекомендуй 3 книги, які ідеально підходять для читання на вихідних на основі запиту: "${userMessage}".
    Враховуй те, що книга повинна бути не надто довга або мати захоплюючий сюжет.
    Надай відповідь у форматі JSON-масиву з об'єктами, які містять поля "title", "author" і коротке пояснення "reason", чому ця книга підходить на вихідні.
    Наприклад: [{"title":"Назва книги 1","author":"Автор 1","reason":"Коротка і захоплива історія, яку можна прочитати за вихідні"}].
    Не включай в відповідь нічого окрім JSON.`;
    
    this.geminiService.generateContentWithGeminiPro(prompt, [])
      .subscribe(
        (response: string) => {
          try {
            console.log("AI відповідь для вихідних:", response);
            
            // Очищаємо відповідь від markdown та інших форматувань
            const cleanedResponse = response.replace(/```json|```/g, '').trim();
            
            // Парсимо JSON
            const recommendations = JSON.parse(cleanedResponse);
            console.log("Розпізнані рекомендації:", recommendations);
            
            // Шукаємо детальну інформацію про кожну книгу
            this.searchRecommendedBooks(recommendations);
          } catch (error) {
            console.error('Помилка обробки рекомендацій:', error, 'Відповідь:', response);
            this.messages.push({ 
              role: 'bot', 
              content: 'Вибачте, але я не зміг згенерувати рекомендації на вихідні. Спробуйте уточнити запит, наприклад: "Що почитати на вихідних? Щось легке і захоплююче"',
              timestamp: new Date()
            });
            this.isLoading = false;
            this.isGeneratingRecommendations = false;
          }
        },
        error => {
          console.error('Помилка генерації рекомендацій:', error);
          this.messages.push({ 
            role: 'bot', 
            content: 'Виникла помилка при генерації рекомендацій на вихідні. Спробуйте пізніше.',
            timestamp: new Date()
          });
          this.isLoading = false;
          this.isGeneratingRecommendations = false;
        }
      );
  }

  // Метод для генерації книжкового плану читання
  generateReadingPlan() {
    this.isGeneratingReadingPlan = true;
    this.readingPlan = [];
    
    // Додаємо початкове повідомлення
    this.messages.push({ 
      role: 'bot', 
      content: 'Отримую список книг зі статусом "Want to read" та формую план читання...',
      timestamp: new Date()
    });
    
    // Отримуємо книги з полички "Want to read"
    this.http.get<any>('https://localhost:7172/api/Books/books?shelfName=Want%20to%20read', { withCredentials: true })
      .subscribe(
        (booksData: any[]) => {
          if (!booksData || booksData.length === 0) {
            this.messages.push({ 
              role: 'bot', 
              content: 'На полиці "Want to read" не знайдено книг. Додайте книги, які плануєте прочитати, щоб отримати план.',
              timestamp: new Date()
            });
            this.isLoading = false;
            this.isGeneratingReadingPlan = false;
            return;
          }
          
          // Формуємо список книг для аналізу
          const booksForAnalysis = booksData.map(book => ({
            title: book.title || 'Невідома книга',
            author: book.author || 'Невідомий автор',
            pages: book.pages || 0,
            genre: book.genre || 'Невідомий жанр',
            keywords: book.keywords || []
          }));
          
          console.log('Книги для аналізу:', booksForAnalysis);
          
          // Запитуємо користувача про його швидкість читання і вподобання
          const userMessage = this.findLastUserMessage();
          const userPreferences = this.extractUserPreferences(userMessage);
          
          // Формуємо запит до Gemini для аналізу часу читання
          const prompt = `
          Проаналізуй наступний список книг зі статусом "Want to read" і створи оптимальний план читання.
          ${userPreferences.readingSpeed ? `Швидкість читання користувача: ${userPreferences.readingSpeed} сторінок на день.` : 'Розрахуй на середню швидкість читання 20-30 сторінок на день.'}
          ${userPreferences.preferences ? `Користувач має такі вподобання: ${userPreferences.preferences}` : ''}
          ${userPreferences.timeConstraint ? `Часові обмеження: ${userPreferences.timeConstraint}` : ''}
          
          Книги:
          ${booksForAnalysis.map((book, index) => 
            `${index+1}. "${book.title}" автора ${book.author}${book.pages ? ', ' + book.pages + ' сторінок' : ''}, жанр: ${book.genre}${
              book.keywords && book.keywords.length > 0 ? ', ключові слова: ' + book.keywords.join(', ') : ''
            }`
          ).join('\n')}
          
          Завдання:
          1. Відсортуй книги за пріоритетом на основі вподобань користувача ${userPreferences.preferences ? `(${userPreferences.preferences})` : ''} та тематичної узгодженості.
          2. Визнач оптимальну послідовність читання, групуючи схожі за тематикою книги або чергуючи жанри для різноманітності.
          3. Обчисли приблизний час читання для кожної книги з урахуванням складності жанру.
          4. Запропонуй оптимальний щоденний темп читання.
          5. Склади календарний план із термінами початку і завершення кожної книги.
          
          Надай відповідь у форматі JSON-масиву з об'єктами для кожної книги, які містять поля:
          - book: назва книги
          - author: автор
          - estimatedTime: приблизний час читання (наприклад, "5-7 днів" або "2-3 тижні")
          - pagesPerDay: рекомендована кількість сторінок на день для комфортного читання
          - totalDays: приблизна кількість днів для прочитання
          - startDate: рекомендована дата початку (у форматі "YYYY-MM-DD")
          - endDate: очікувана дата завершення (у форматі "YYYY-MM-DD")
          - priority: пріоритет читання (число від 1 до ${booksForAnalysis.length}, де 1 - найвищий)
          - notes: пояснення щодо пріоритету та рекомендації (обов'язково)
          
          Наприклад:
          [{"book":"Назва книги","author":"Автор","estimatedTime":"5-7 днів","pagesPerDay":30,"totalDays":7,"startDate":"2025-05-20","endDate":"2025-05-27","priority":1,"notes":"Рекомендується прочитати першою, оскільки відповідає вподобанням користувача щодо романтики"}]
          
          Відповідь має містити ТІЛЬКИ JSON без додаткових коментарів.`;
          
          this.geminiService.generateContentWithGeminiPro(prompt, [])
            .subscribe(
              (response: string) => {
                try {
                  console.log("AI відповідь для плану читання:", response);
                  
                  // Очищаємо відповідь від markdown та інших форматувань
                  const cleanedResponse = response.replace(/```json|```/g, '').trim();
                  
                  // Парсимо JSON
                  const readingPlanData = JSON.parse(cleanedResponse);
                  this.readingPlan = readingPlanData;
                  
                  // Сортуємо за пріоритетом і зберігаємо
                  this.sortedReadingPlan = [...readingPlanData].sort((a, b) => a.priority - b.priority);
                  
                  // Обчислюємо загальну інформацію про план
                  this.calculatePlanSummary();
                  
                  // Показуємо план у UI
                  this.showReadingPlan = true;
                  
                  // Формуємо повідомлення про план для чату
                  this.generateReadingPlanMessage();
                  
                } catch (error) {
                  console.error('Помилка обробки плану читання:', error, 'Відповідь:', response);
                  this.messages.push({ 
                    role: 'bot', 
                    content: 'Вибачте, але я не зміг сформувати план читання. Спробуйте пізніше або надайте більше інформації про ваші вподобання.',
                    timestamp: new Date()
                  });
                  this.isLoading = false;
                  this.isGeneratingReadingPlan = false;
                }
              },
              error => {
                console.error('Помилка генерації плану читання:', error);
                this.messages.push({ 
                  role: 'bot', 
                  content: 'Виникла помилка при формуванні плану читання. Спробуйте пізніше.',
                  timestamp: new Date()
                });
                this.isLoading = false;
                this.isGeneratingReadingPlan = false;
              }
            );
        },
        error => {
          console.error('Помилка отримання списку книг:', error);
          this.messages.push({ 
            role: 'bot', 
            content: 'Не вдалося отримати список книг з полиці "Want to read". Перевірте підключення або спробуйте пізніше.',
            timestamp: new Date()
          });
          this.isLoading = false;
          this.isGeneratingReadingPlan = false;
        }
      );
  }

  // Обчислюємо загальну інформацію про план читання
  private calculatePlanSummary(): void {
  
  }

  // Формуємо повідомлення з планом читання для чату
  private generateReadingPlanMessage(): void {
    let planMessage = 'Я сформував для вас оптимізований план читання. Він враховує ваші читацькі вподобання та доступний час. ';
    
    if (this.readingPlanTotalDays) {
      planMessage += `Загальна тривалість плану: ${this.readingPlanTotalDays} днів${this.readingPlanDateRange ? ` (${this.readingPlanDateRange})` : ''}. `;
    }
    
    planMessage += `План містить ${this.readingPlan.length} книг, розташованих у оптимальній послідовності читання.`;
    
    // Додаємо інформацію про першу рекомендовану книгу
    if (this.sortedReadingPlan.length > 0) {
      const firstBook = this.sortedReadingPlan[0];
      planMessage += `\n\nПочніть з книги "${firstBook.book}" (${firstBook.author}). `;
      if (firstBook.notes) {
        planMessage += firstBook.notes;
      }
    }
    
    planMessage += '\n\nПодробиці плану відображаються нижче.';
    
    this.messages.push({ 
      role: 'bot', 
      content: planMessage,
      timestamp: new Date()
    });
    
    this.isLoading = false;
    this.isGeneratingReadingPlan = false;
  }

  // Закриття плану читання
  closeReadingPlan(): void {
    this.showReadingPlan = false;
  }

  // Форматує діапазон дат для відображення
  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  // Форматує дату в локальному форматі
  private formatDate(date: Date): string {
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Знаходить останнє повідомлення користувача
  private findLastUserMessage(): string {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') {
        return this.messages[i].content;
      }
    }
    return '';
  }

  // Аналізує повідомлення користувача для виявлення вподобань та швидкості читання
  private extractUserPreferences(message: string): {
    readingSpeed?: string;
    preferences?: string;
    timeConstraint?: string;
  } {
    const result: {
      readingSpeed?: string;
      preferences?: string;
      timeConstraint?: string;
    } = {};
    
    // Пошук швидкості читання
    const speedRegex = /(\d+)\s*(сторінок|сторінки|сторінку|стор\.?|pages|page)\s*(на|в|per)\s*(день|day|тиждень|week)/i;
    const speedMatch = message.match(speedRegex);
    if (speedMatch) {
      const pagesPerDay = speedMatch[1];
      const period = speedMatch[4].toLowerCase();
      
      if (period === 'тиждень' || period === 'week') {
        const dailyPages = Math.round(parseInt(pagesPerDay) / 7);
        result.readingSpeed = `${dailyPages} сторінок на день (${pagesPerDay} на тиждень)`;
      } else {
        result.readingSpeed = `${pagesPerDay} сторінок на день`;
      }
    }
    
    // Пошук тематичних вподобань
    const preferencesRegex = /(люблю|цікавлять|подобаються|хочу про|цікавить|інтерес до|love|like|interested in)\s+([^\.!?,]+)/i;
    const prefMatch = message.match(preferencesRegex);
    if (prefMatch) {
      result.preferences = prefMatch[2].trim();
    }
    
    // Часові обмеження
    const timeRegex = /(маю|є|вільний|only|have|available)\s+(\d+)\s*(годин|години|годину|год\.?|hours|hour|днів|дні|день|days|day)/i;
    const timeMatch = message.match(timeRegex);
    if (timeMatch) {
      const amount = timeMatch[2];
      const unit = timeMatch[3].toLowerCase();
      if (unit.includes('годин') || unit.includes('hour')) {
        result.timeConstraint = `${amount} годин на день для читання`;
      } else if (unit.includes('д') || unit.includes('day')) {
        result.timeConstraint = `${amount} днів на виконання всього плану`;
      }
    }
    
    return result;
  }
  
  searchRecommendedBooks(recommendations: any[]) {
    // Створимо масив запитів для пошуку кожної книги
    const searchRequests = recommendations.map(book => {
      // Спочатку пробуємо пошук українською
      return this.searchBookWithFallback(book);
    });
    
    // Виконуємо всі запити паралельно
    forkJoin(searchRequests).subscribe(
      (results) => {
        this.recommendedBooks = results;
        this.showCarousel = true;
        this.isLoading = false;
        this.isGeneratingRecommendations = false;
        
        // Оновлюємо останнє повідомлення
        const lastMessageIndex = this.messages.findIndex(
          msg => msg.role === 'bot' && (msg.content.includes('Шукаю книги') || msg.content.includes('Підбираю книги'))
        );
        
        if (lastMessageIndex !== -1) {
          let bookMessage = 'Ось декілька книг, які можуть вам сподобатися. Ви можете переглянути їх нижче.';
          
          // Додаємо причини рекомендацій, якщо вони є
          if (results.some(book => book.reason)) {
            bookMessage += '\n\nЧому я рекомендую ці книги:\n';
            results.forEach(book => {
              if (book.reason) {
                bookMessage += `\n"${book.title}" - ${book.reason}`;
              }
            });
          }
          
          this.messages[lastMessageIndex].content = bookMessage;
        } else {
          this.messages.push({ 
            role: 'bot', 
            content: 'Ось декілька книг, які можуть вам сподобатися. Ви можете переглянути їх нижче.',
            timestamp: new Date()
          });
        }
        
        console.log("Знайдені книги:", this.recommendedBooks);
      },
      (error) => {
        console.error('Помилка пошуку книг:', error);
        this.messages.push({ 
          role: 'bot', 
          content: 'Я знайшов рекомендації, але не зміг отримати детальну інформацію про книги. Спробуйте пізніше.',
          timestamp: new Date()
        });
        this.isLoading = false;
        this.isGeneratingRecommendations = false;
      }
    );
  }

  // Метод для пошуку книги з автоматичним переходом на англомовний запит, якщо потрібно
  private searchBookWithFallback(book: any): Observable<BookRecommendation> {
    // Спочатку українською
    const ukrainianQuery = `intitle:${book.title} inauthor:${book.author}`;
    
    return this.http.get<any>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(ukrainianQuery)}&maxResults=1`)
      .pipe(
        switchMap(response => {
          // Перевіряємо, чи є результати і чи є зображення обкладинки
          if (response && response.items && response.items.length > 0 && 
              response.items[0].volumeInfo && response.items[0].volumeInfo.imageLinks) {
            const item = response.items[0];
            return of({
              id: item.id,
              title: book.title,
              author: book.author,
              cover_url: item.volumeInfo.imageLinks.thumbnail,
              description: item.volumeInfo.description || 'Опис відсутній',
              reason: book.reason || null
            });
          } else {
            // Якщо немає результатів або немає зображення, пробуємо англійською
            console.log(`Для книги "${book.title}" не знайдено українською, спробуємо англійською`);
            
            // Спробуємо перекласти найбільш релевантну інформацію для пошуку
            return this.searchBookInEnglish(book);
          }
        }),
        catchError(error => {
          console.error('Помилка пошуку українською:', error);
          return this.searchBookInEnglish(book);
        })
      );
  }

  // Метод для пошуку книги англійською
  private searchBookInEnglish(book: any): Observable<BookRecommendation> {
    // Формуємо запит англійською - спрощуємо запит для більшої ймовірності знаходження
    const englishQuery = `intitle:${book.title} inauthor:${book.author}&langRestrict=en`;
    
    return this.http.get<any>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(englishQuery)}&maxResults=3`)
      .pipe(
        map(response => {
          if (response && response.items && response.items.length > 0) {
            // Шукаємо першу книгу з обкладинкою
            const bookWithCover = response.items.find((item: any) => 
              item.volumeInfo && item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail
            );
            
            const item = bookWithCover || response.items[0];
            
            return {
              id: item.id,
              title: book.title, // Зберігаємо оригінальну назву українською
              author: book.author, // Зберігаємо оригінального автора
              cover_url: item.volumeInfo?.imageLinks?.thumbnail || 'assets/no-cover.png',
              description: item.volumeInfo?.description || 'Опис відсутній',
              reason: book.reason || null
            };
          }
          
          // Якщо і англійською не знайдено, повертаємо книгу без обкладинки
          return {
            title: book.title,
            author: book.author,
            cover_url: 'assets/no-cover.png',
            description: 'Інформація не знайдена',
            reason: book.reason || null
          };
        }),
        catchError(() => {
          return of({
            title: book.title,
            author: book.author,
            cover_url: 'assets/no-cover.png',
            description: 'Помилка пошуку',
            reason: book.reason || null
          });
        })
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