import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import ePub, { Book, Rendition, Contents } from 'epubjs';

// Adding missing TypeScript interfaces to match EPUBJS structure
interface DisplayedLocation {
  displayed: {
    page: number;
    total: number;
  };
  href: string;
  location?: number; // Optional as it may not always exist
  percentage?: number; // Optional as it may not always exist
  cfi: string;
}

interface NavigationItem {
  href: string;
  label: string;
  subitems?: NavigationItem[];
}

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
  cfi?: string; // Додаємо CFI для точної навігації
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
  isLoading: boolean = false;
  
  // Налаштування
  fontSize: number = 100;
  currentTheme: 'light' | 'sepia' | 'dark' = 'light';
  margins: number = 20;
  
  // Поточна книга - ключ localStorage для зберігання
  private currentBookKey: string = '';
  
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

  constructor() { }

  ngAfterViewInit() {
    // Перевіряємо, чи є книга в локальному сховищі
    this.checkForStoredBook();
  }
  
  ngOnDestroy() {
    if (this.book) {
      // Зберігаємо позицію перед закриттям
      this.saveCurrentPosition();
      this.book.destroy();
    }
    
    // Видаляємо обробник клавіш при знищенні компонента
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  // Перевіряємо наявність збереженої книги в localStorage
  checkForStoredBook() {
    const lastBookKey = localStorage.getItem('lastBookKey');
    if (lastBookKey) {
      this.currentBookKey = lastBookKey;
      const storedBook = localStorage.getItem(`book_${lastBookKey}`);
      
      if (storedBook) {
        try {
          const bookData = JSON.parse(storedBook);
          this.bookTitle = bookData.title || 'Без назви';
          this.bookAuthor = bookData.author || '';
          
          // Для тесту, щоб бачити що відбувається
          console.log('Found stored book:', bookData.title);
        } catch (error) {
          console.error('Error parsing stored book data', error);
        }
      }
    }
  }
  
  // Зберігаємо поточну позицію в книзі до localStorage
  saveCurrentPosition() {
    if (!this.book || !this.currentBookKey) return;
    
    try {
      const location = this.rendition.currentLocation();
      // Fix: Ensure we're using the correct property access
      const currentCfi = location?.cfi || '';
      
      if (currentCfi) {
        const storedBookJson = localStorage.getItem(`book_${this.currentBookKey}`);
        
        if (storedBookJson) {
          const storedBook = JSON.parse(storedBookJson);
          storedBook.cfi = currentCfi;
          storedBook.progress = this.readingProgress;
          storedBook.lastOpened = new Date();
          
          localStorage.setItem(`book_${this.currentBookKey}`, JSON.stringify(storedBook));
          console.log('Saved reading position:', currentCfi);
        }
      }
    } catch (error) {
      console.error('Error saving current position', error);
    }
  }
  
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      this.isLoading = true;
      this.bookFile = input.files[0];
      
      // Генеруємо унікальний ключ для цієї книги
      this.currentBookKey = Date.now().toString();
      localStorage.setItem('lastBookKey', this.currentBookKey);
      
      // Читаємо файл як ArrayBuffer
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        this.bookData = e.target.result;
        await this.initReader();
        this.isLoading = false;
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        this.isLoading = false;
        alert('Помилка читання файлу. Спробуйте інший файл.');
      };
      reader.readAsArrayBuffer(this.bookFile);
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
      
      // Зберігаємо інформацію про книгу в localStorage
      const bookInfo = {
        id: this.currentBookKey,
        title: this.bookTitle,
        author: this.bookAuthor,
        cover: coverUrl,
        lastOpened: new Date(),
        progress: 0,
        cfi: ''
      };
      
      localStorage.setItem(`book_${this.currentBookKey}`, JSON.stringify(bookInfo));
      
      // Перевіряємо наявність елемента для рендерингу
      if (!this.epubViewer || !this.epubViewer.nativeElement) {
        throw new Error('EPUB viewer element not found');
      }
      
      // Очищаємо контейнер перед створенням нового рендерингу
      this.epubViewer.nativeElement.innerHTML = '';
      
      // Створюємо рендеринг
      this.rendition = this.book.renderTo(this.epubViewer.nativeElement, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated'
      });
      
      // Перш ніж відобразити книгу, генеруємо локації
      await this.book.locations.generate(1024);
      console.log('Locations generated:', this.book.locations.length());
      
      // Встановлюємо обробники подій
      this.setupEventHandlers();
      
      // Позначаємо, що книга завантажена і зберігаємо налаштування
      this.bookLoaded = true;
      this.applySettings();
      
      // Завантажуємо зміст
      this.loadTOC();
      
      // Відображаємо перший екран
      await this.rendition.display();
      
      // Оновлюємо інформацію про сторінку
      this.updatePageInfo();
    } catch (error) {
      console.error('Error initializing EPUB reader:', error);
      this.isLoading = false;
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
  
  setupEventHandlers() {
    if (!this.rendition) {
      console.warn('Cannot setup event handlers: rendition not ready');
      return;
    }
    
    this.rendition.on('relocated', (location: DisplayedLocation) => {
      console.log('Page relocated:', location);
      
      // Fix: Adapt to the actual structure of location object
      if (location) {
        // Get the current page number from location
        const page = location.location || 0;
        
        // Update state
        this.currentPageNum = page;
        this.totalPages = this.book.locations.length();
        this.currentHref = location.href || '';
        this.currentPage = `Сторінка ${page}`;
        
        // Calculate progress
        const totalPages = this.book.locations.length();
        if (totalPages > 0) {
          this.readingProgress = Math.round((page / totalPages) * 100);
        } else if (location.percentage) {
          this.readingProgress = Math.round(location.percentage * 100);
        }
        
        // First/last page status
        this.isFirstPage = page <= 1;
        this.isLastPage = page >= totalPages;
        
        // Save position
        this.saveCurrentPosition();
      }
    });
    
    // Обробка натискання клавіш
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Обробка посилань
    this.rendition.on('linkClicked', (href: string) => {
      if (href) this.rendition.display(href);
    });
  }
  
  handleKeyDown(event: KeyboardEvent) {
    if (!this.bookLoaded) return;
    
    if (event.key === 'ArrowRight') {
      this.nextPage();
      event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
      this.prevPage();
      event.preventDefault();
    }
  }
  
  navigateToChapter(href: string) {
    if (this.rendition && href) {
      this.rendition.display(href);
      this.tocVisible = false;
    }
  }
  
  // Оновлена інформація про сторінку
  updatePageInfo() {
    if (!this.rendition || !this.bookLoaded || !this.book.locations) return;
    
    try {
      const location = this.rendition.currentLocation() as DisplayedLocation;
      if (location) {
        // Fix: Use the correct property access for the location object
        const page = location.location || 0;
        const total = this.book.locations.length();
        
        this.currentPageNum = page;
        this.totalPages = total;
        this.currentPage = `Сторінка ${page}`;
        
        if (total > 0) {
          this.readingProgress = Math.round((page / total) * 100);
        }
        
        this.isFirstPage = page <= 1;
        this.isLastPage = page >= total;
      }
    } catch (error) {
      console.error('Error updating page info:', error);
    }
  }
  
  // Покращена стабільна навігація
  nextPage() {
    if (!this.bookLoaded || !this.rendition) return;
    
    try {
      this.rendition.next();
    } catch (error) {
      console.error('Error navigating to next page:', error);
    }
  }
  
  prevPage() {
    if (!this.bookLoaded || !this.rendition) return;
    
    try {
      this.rendition.prev();
    } catch (error) {
      console.error('Error navigating to previous page:', error);
    }
  }
  
  // Перехід на конкретну сторінку
  goToPage(event: Event) {
    if (!this.bookLoaded || !this.rendition || !this.book.locations) return;
    
    const input = event.target as HTMLInputElement;
    const pageNumber = parseInt(input.value, 10);
    
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > this.totalPages) {
      input.value = this.currentPageNum.toString();
      return;
    }
    
    try {
      const cfi = this.book.locations.cfiFromLocation(pageNumber - 1);
      if (cfi) {
        this.rendition.display(cfi);
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
    if (this.rendition && this.rendition.themes) {
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
    if (this.rendition && this.rendition.themes) {
      this.rendition.themes.override('margin', `0 ${this.margins}px`);
    }
  }
  
  applySettings() {
    if (this.rendition && this.rendition.themes) {
      // Розмір шрифту
      this.applyFontSize();
      
      // Тема
      this.setTheme(this.currentTheme);
      
      // Відступи
      this.applyMargins();
    }
  }
  
  downloadBook() {
    if (!this.bookFile) {
      console.warn('No book file available for download');
      return;
    }

    try {
      const url = URL.createObjectURL(this.bookFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.bookFile.name || `${this.bookTitle?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'book'}.epub`;
      
      document.body.appendChild(a);
      a.click();
      
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