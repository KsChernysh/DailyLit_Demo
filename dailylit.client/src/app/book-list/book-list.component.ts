import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookService } from '../book.service';
import { Book } from '../book.model';
import { GlobalVariablesService } from '../global.variables.service';

@Component({
  selector: 'app-book-list',
  templateUrl: './book-list.component.html',
  styleUrls: ['./book-list.component.css']
})
export class BookListComponent implements OnInit, OnDestroy {
  books: any[] = [];
  genre: string = '';
  BaseId: string = '';
  loading: boolean = false;
  currentPage: number = 1;
  totalPages: number = 1;

  routeSubscription!: Subscription;
  constructor(private route: ActivatedRoute, private bookService: BookService, private global: GlobalVariablesService, private router: Router) {
    console.log('BookListComponent constructed');
  }

  ngOnInit(): void {
    console.log('BookListComponent initialized');
    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.genre = params.get('genre') || '';
      this.loadBooks();
    });
  }

  ngOnDestroy(): void {
    console.log('BookListComponent destroyed');
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadBooks(): void {
    console.log('loadBooks called for genre:', this.genre);
    this.loading = true;
    
    this.bookService.getBooks(this.genre).subscribe(
      (result: any[]) => {
        if (result && result.length > 0) {
          this.books = result.map((item: any) => {
            // Make sure volumeInfo exists to prevent errors
            const volumeInfo = item.volumeInfo || {};
            
            // Extract cover URL with multiple fallbacks
            let coverUrl = '';
            if (volumeInfo.imageLinks) {
              coverUrl = volumeInfo.imageLinks.thumbnail || 
                        volumeInfo.imageLinks.smallThumbnail ||
                        volumeInfo.imageLinks.medium;
            }
            
            // Skip books without covers
            if (!coverUrl) {
              return null;
            }
            
            // Fix protocol for Google Books image URLs (prevent mixed content)
            if (coverUrl && coverUrl.startsWith('http:')) {
              coverUrl = coverUrl.replace('http:', 'https:');
            }
            
            return {
              id: item.id,
              title: volumeInfo.title || 'Невідома назва',
              genre: volumeInfo.categories ? 
                  (Array.isArray(volumeInfo.categories) ? volumeInfo.categories[0] : volumeInfo.categories) : 
                  (this.genre || 'Невідомий жанр'),
              author_name: volumeInfo.authors ? 
                  (Array.isArray(volumeInfo.authors) ? volumeInfo.authors.join(', ') : volumeInfo.authors) : 
                  'Невідомий автор',
              cover_url: coverUrl,
              rating: volumeInfo.averageRating || 0,
              description: volumeInfo.description || 'Опис відсутній'
            };
          }).filter(book => book !== null); // Filter out any null entries (books without covers)
          
          console.log('Processed books with covers:', this.books);
        } else {
          this.books = [];
          console.warn('No books found for genre:', this.genre);
        }
        this.loading = false;
      },
      (error: any) => {
        console.error('Error fetching books:', error);
        this.books = [];
        this.loading = false;
      }
    );
  }
     
  apicall(id : string)
  {
    this.bookService.getBookDetails(id).subscribe(
      data => {
        console.log(data);
        this.BaseId = id;
        this.router.navigate([`/book/`, this.BaseId]);
      }
    );
  }

  changePage(pageNumber: number) {
    if (pageNumber < 1 || pageNumber > this.totalPages) {
      return;
    }
    
    this.currentPage = pageNumber;
    this.loadBooks(); // Method that loads books
  }

  addToShelf(book: any) {
    // Show shelf selection dialog
    // Add book to shelf
    console.log('Adding book to shelf:', book);
  }
}