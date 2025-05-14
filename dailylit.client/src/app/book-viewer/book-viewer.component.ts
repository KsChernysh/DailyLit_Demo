import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import ePub, { Book, Rendition, Contents } from 'epubjs';

interface TocItem {
  href: string;
  label: string;
  subitems?: TocItem[];
}

interface RecentBook {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  lastOpened: Date;
  filePath?: string;
  progress?: number;
}

interface DisplayedPage {
  page: number;
  // Інші поля, якщо вони є
}

interface LocationStart {
  displayed?: DisplayedPage;
  location?: number;
  percentage?: number;
  href?: string;
  cfi?: string;
}

interface EpubLocation {
  start: LocationStart;
  end?: LocationStart;
  total?: number;
}

@Component({
  selector: 'app-book-viewer',
  templateUrl: './book-viewer.component.html',
  styleUrls: ['./book-viewer.component.css']
})
export class BookViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('epubViewer') epubViewer!: ElementRef;
  
  private book!: Book;
  private rendition!: Rendition;
  private bookData: ArrayBuffer | null = null;
  private bookFile: File | null = null;
  
  // Стан книги
  bookLoaded: boolean = false;
  bookTitle: string = '';
  bookAuthor: string = '';
  currentPage: string = '';
  currentPageNum: number = 0;
  totalPages: number = 0;
  readingProgress: number = 0;
  currentHref: string = '';
  isFirstPage: boolean = true;
  isLastPage: boolean = false;
  
  // Стан інтерфейсу
  tocVisible: boolean = false;
  settingsVisible: boolean = false;
  tocItems: TocItem[] = [];
  loadingTOC: boolean = false;
  
  // Налаштування
  fontSize: number = 100;
  currentTheme: 'light' | 'sepia' | 'dark' = 'light';
  margins: number = 20;
  
  // Нещодавні книги
  recentBooks: RecentBook[] = [];
  
  private themes = {
    light: {
      body: { 
        background: '#ffffff', 
        color: '#333333' 
      }
    },
    sepia: {
      body: { 
        background: '#f8f2e3', 
        color: '#5b4636' 
      }
    },
    dark: {
      body: { 
        background: '#262626', 
        color: '#cccccc' 
      }
    }
  };

  constructor() {
    // Завантаження списку нещодавніх книг з локального сховища
    this.loadRecentBooks();
  }

  ngAfterViewInit() {
    // Початково відображаємо екран завантаження книги
  }
  
  ngOnDestroy() {
    // Закриваємо книгу при знищенні компонента
    if (this.book) {
      this.book.destroy();
    }
  }
  
  loadRecentBooks() {
    const recentBooksJson = localStorage.getItem('recentBooks');
    if (recentBooksJson) {
      try {
        this.recentBooks = JSON.parse(recentBooksJson);
      } catch (error) {
        console.error('Error parsing recent books from localStorage', error);
        this.recentBooks = [];
      }
    }
  }
  
  saveRecentBooks() {
    localStorage.setItem('recentBooks', JSON.stringify(this.recentBooks));
  }
  
  addToRecentBooks(book: RecentBook) {
    // Видаляємо книгу зі списку, якщо вона вже є
    this.recentBooks = this.recentBooks.filter(b => b.id !== book.id);
    
    // Додаємо книгу на початок списку
    this.recentBooks.unshift(book);
    
    // Обмежуємо список до 5 книг
    if (this.recentBooks.length > 5) {
      this.recentBooks = this.recentBooks.slice(0, 5);
    }
    
    // Зберігаємо оновлений список
    this.saveRecentBooks();
  }
  
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      this.bookFile = input.files[0];
      
      // Читаємо файл як ArrayBuffer
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        this.bookData = e.target.result;
        await this.initReader();
      };
      reader.readAsArrayBuffer(this.bookFile);
    }
  }
  
  async openRecentBook(book: RecentBook) {
    if (book.filePath) {
      try {
        // Тут логіка для відкриття з файлової системи, але це не можливо з безпекою браузера
        // Натомість просто показуємо повідомлення
        alert('Завантажте книгу знову');
      } catch (error) {
        console.error('Error opening recent book', error);
        alert('Помилка при відкритті книги. Завантажте файл знову.');
      }
    }
  }

  // Оптимізуємо функцію ініціалізації читалки
  async initReader() {
    if (!this.bookData) {
      console.warn('No book data available');
      return;
    }
    
    try {
      // Очищаємо попередні дані, якщо вони є
      if (this.book) {
        this.book.destroy();
      }
      
      // Скидаємо статус і початкові дані
      this.bookLoaded = false;
      this.currentPageNum = 0;
      this.totalPages = 0;
      this.readingProgress = 0;
      
      // Створюємо нову книгу
      this.book = ePub(this.bookData);
      
      // Чекаємо на завантаження основних даних книги
      await this.book.ready;
      
      // Отримуємо метадані
      const metadata = await this.book.loaded.metadata;
      this.bookTitle = metadata.title || 'Без назви';
      this.bookAuthor = metadata.creator || '';
      
      // Отримуємо обкладинку, якщо вона є
      let coverUrl: string | undefined;
      try {
        coverUrl = (await this.book.coverUrl()) || undefined;
      } catch (error) {
        console.warn('Cover not available');
      }
      
      // Додаємо до нещодавніх книг
      const bookId = Date.now().toString();
      this.addToRecentBooks({
        id: bookId,
        title: this.bookTitle,
        author: this.bookAuthor,
        cover: coverUrl,
        lastOpened: new Date(),
        progress: 0
      });
      
      // Перевіряємо наявність елемента для рендерингу
      if (!this.epubViewer || !this.epubViewer.nativeElement) {
        throw new Error('EPUB viewer element not found');
      }
      
      // Створюємо рендеринг
      this.rendition = this.book.renderTo(this.epubViewer.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated'
      });
      
      // Перш ніж відобразити книгу, спробуємо згенерувати локації
      try {
        // Генеруємо спрощені локації для швидшого старту
        await this.book.locations.generate(500);
        console.log('Basic locations generated');
      } catch (err) {
        console.warn('Could not generate basic locations');
      }
      
      // Встановлюємо обробники подій ДО відображення книги
      this.setupEventHandlers();
      
      // Відображаємо першу сторінку
      await this.rendition.display();
      
      // Позначаємо, що книга завантажена
      this.bookLoaded = true;
      
      // Застосовуємо налаштування відображення
      this.applySettings();
      
      // Завантажуємо зміст у фоновому режимі
      this.loadTOC();
      
      // Запускаємо повну генерацію локацій у фоновому режимі для кращої навігації
      setTimeout(async () => {
        try {
          // Генеруємо більш точні локації у фоні
          await this.book.locations.generate(1024);
          console.log('Full locations generated');
          // Перевіряємо доступність locations.total
          console.log('Locations:', this.book.locations);
          // Оновлюємо інформацію про сторінку
          this.updatePageInfo();
        } catch (err) {
          console.warn('Could not generate full locations');
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing EPUB reader:', error);
      alert('Помилка при відкритті EPUB файлу. Спробуйте інший файл.');
    }
  }
  
  async loadTOC() {
    this.loadingTOC = true;
    
    try {
      const navigation = await this.book.loaded.navigation;
      if (navigation && navigation.toc) {
        this.tocItems = navigation.toc.map((item: any) => ({
          href: item.href,
          label: item.label,
          subitems: item.subitems
        }));
      }
    } catch (error) {
      console.error('Error loading TOC', error);
    } finally {
      this.loadingTOC = false;
    }
  }
  
  // Оновіть цей метод
  setupEventHandlers() {
    if (!this.rendition) {
      console.warn('Cannot setup event handlers: rendition not ready');
      return;
    }
    
    // Використовуємо правильний тип для параметра location
    this.rendition.on('relocated', (location: EpubLocation) => {
      console.log('Page changed:', location);
      
      // Безпечне отримання даних про розташування
      if (location && location.start) {
        // Використовуємо безпечне читання властивостей
        const page = location.start.displayed && location.start.displayed.page || 
                     location.start.location || 
                     0;
                     
        // Отримуємо загальну кількість сторінок
        let total = location.total || 0;
        
        // Якщо total все ще 0, спробуємо отримати з book.locations
        if (total === 0 && this.book && this.book.locations) {
          // Використовуємо as any для обходу перевірки типів
          const locationsTotal = (this.book.locations as any).total;
          if (typeof locationsTotal === 'number') {
            total = locationsTotal;
          }
        }
        
        this.currentPageNum = page;
        this.totalPages = total;
        this.currentHref = location.start.href || '';
        this.currentPage = `Сторінка ${page}`;
        
        // Розраховуємо прогрес
        if (total > 0) {
          this.readingProgress = Math.round((page / total) * 100);
        } else if (location.start.percentage) {
          // Альтернативний спосіб через відсоток
          this.readingProgress = Math.round(location.start.percentage * 100);
        } else {
          this.readingProgress = 0;
        }
        
        // Статус першої/останньої сторінки
        this.isFirstPage = page <= 1;
        this.isLastPage = (total > 0 && page >= total) || this.readingProgress >= 99;
        
        // Зберігаємо прогрес
        this.updateReadingProgress();
      }
    });
    
    // Решта коду залишається без змін
    this.rendition.on('linkClicked', (href: string) => {
      if (href) this.rendition.display(href);
    });
    
    this.rendition.on('keyup', (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        this.nextPage();
      } else if (event.key === 'ArrowLeft') {
        this.prevPage();
      }
    });
  }
  
  updateReadingProgress() {
    if (this.recentBooks.length > 0) {
      const book = this.recentBooks[0];
      book.progress = this.readingProgress;
      book.lastOpened = new Date();
      this.saveRecentBooks();
    }
  }
  
  navigateToChapter(href: string) {
    if (this.rendition) {
      this.rendition.display(href);
      // Закриваємо сайдбар після навігації на мобільних пристроях
      if (window.innerWidth < 768) {
        this.tocVisible = false;
      }
    }
  }
  
  // Спрощена функція для оновлення інформації про сторінку
  updatePageInfo() {
    if (!this.rendition || !this.bookLoaded) return;
    
    const location = this.rendition.currentLocation() as unknown as EpubLocation;
    
    if (location && location.start) {
      // Безпечне отримання даних
      const page = location.start.displayed && location.start.displayed.page || 
                   location.start.location || 
                   0;
      
      // Спершу спробуємо отримати total з location
      let total = location.total || 0;
      
      // Якщо total все ще 0, спробуємо отримати з book.locations
      if (total === 0 && this.book && this.book.locations) {
        // Використовуємо as any для обходу перевірки типів
        const locationsTotal = (this.book.locations as any).total;
        if (typeof locationsTotal === 'number') {
          total = locationsTotal;
        }
      }
      
      this.currentPageNum = page;
      this.totalPages = total;
      this.currentPage = `Сторінка ${page}`;
      
      if (total > 0) {
        this.readingProgress = Math.round((page / total) * 100);
      } else if (location.start.percentage) {
        this.readingProgress = Math.round(location.start.percentage * 100);
      }
      
      this.isFirstPage = page <= 1;
      this.isLastPage = (total > 0 && page >= total) || this.readingProgress >= 99;
    }
  }
  
  // Покращені методи навігації
  nextPage() {
    if (!this.bookLoaded || !this.rendition) return;
    
    try {
      // Відстежуємо успішність навігації
      const result = this.rendition.next();
      console.log('Next page result:', result);
    } catch (error) {
      console.error('Error navigating to next page:', error);
    }
  }
  
  prevPage() {
    if (!this.bookLoaded || !this.rendition) return;
    
    try {
      // Відстежуємо успішність навігації
      const result = this.rendition.prev();
      console.log('Previous page result:', result);
    } catch (error) {
      console.error('Error navigating to previous page:', error);
    }
  }
  
  // Покращений метод переходу на конкретну сторінку
  goToPage(event: Event) {
    if (!this.bookLoaded || !this.rendition || !this.book) return;
    
    const input = event.target as HTMLInputElement;
    const pageNumber = parseInt(input.value, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      input.value = this.currentPageNum.toString();
      return;
    }
    
    try {
      // Використовуємо percentage для надійнішої навігації
      const percentage = Math.min((pageNumber - 1) / Math.max(this.totalPages, 1), 1);
      
      if (this.book.locations && typeof this.book.locations.cfiFromPercentage === 'function') {
        // Якщо у нас є локації, використовуємо їх для точнішої навігації
        const cfi = this.book.locations.cfiFromPercentage(percentage);
        if (cfi) {
          this.rendition.display(cfi);
        }
      } else {
        // Інакше використовуємо відсоток
        this.rendition.display(percentage);
      }
    } catch (error) {
      console.error('Error navigating to page:', error);
      input.value = this.currentPageNum.toString();
    }
  }
  
  toggleTOC() {
    this.tocVisible = !this.tocVisible;
    if (this.tocVisible) {
      this.settingsVisible = false;
    }
  }
  
  toggleSettings() {
    this.settingsVisible = !this.settingsVisible;
    if (this.settingsVisible) {
      this.tocVisible = false;
    }
  }
  
  decreaseFontSize() {
    if (this.fontSize > 50) {
      this.fontSize -= 10;
      this.applyFontSize();
    }
  }
  
  increaseFontSize() {
    if (this.fontSize < 200) {
      this.fontSize += 10;
      this.applyFontSize();
    }
  }
  
  applyFontSize() {
    if (this.rendition) {
      this.rendition.themes.fontSize(`${this.fontSize}%`);
    }
  }
  
  setTheme(theme: 'light' | 'sepia' | 'dark') {
    this.currentTheme = theme;
    
    if (this.rendition && this.rendition.themes) {
      // Видаляємо попередні теми
      this.rendition.themes.default({ body: {} });
      
      // Застосовуємо нову тему
      const themeStyles = this.themes[theme];
      this.rendition.themes.register(theme, themeStyles);
      this.rendition.themes.select(theme);
    }
  }
  
  decreaseMargins() {
    if (this.margins > 0) {
      this.margins -= 5;
      this.applyMargins();
    }
  }
  
  increaseMargins() {
    if (this.margins < 100) {
      this.margins += 5;
      this.applyMargins();
    }
  }
  
  applyMargins() {
    if (this.rendition) {
      this.rendition.themes.override('margin', `0 ${this.margins}px`);
    }
  }
  
  applySettings() {
    if (this.rendition) {
      // Розмір шрифту
      this.applyFontSize();
      
      // Тема
      this.setTheme(this.currentTheme);
      
      // Відступи
      this.applyMargins();
    }
  }
  
  // Спрощений метод завантаження файлу без file-saver
  downloadBook() {
    if (!this.bookFile) {
      console.warn('No book file available for download');
      return;
    }

    try {
      // Створюємо URL
      const url = URL.createObjectURL(this.bookFile);
      
      // Створюємо посилання для завантаження
      const a = document.createElement('a');
      a.href = url;
      a.download = this.bookFile.name || `${this.bookTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'book'}.epub`;
      
      // Додаємо, клікаємо і видаляємо
      document.body.appendChild(a);
      a.click();
      
      // Очищаємо через 100мс
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading book:', error);
      alert('Помилка при завантаженні файлу. Спробуйте ще раз.');
    }
  }
}
