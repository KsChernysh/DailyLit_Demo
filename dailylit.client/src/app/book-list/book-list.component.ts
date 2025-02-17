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
    
    this.bookService.getBooks(this.genre).subscribe(
      (result: any[]) => {
        if (result.length > 0) {
          this.books = result.map((item: any) => ({
            id: item.id,
            title: item.volumeInfo.title || 'No Title',
            genre: item.volumeInfo.categories || 'No Genre',
            author_name: item.volumeInfo.authors?.join(', ') || 'No Author',
            cover_url: item.volumeInfo.imageLinks?.thumbnail || 'assets/no-cover.png',
          }));
          console.log('Processed books:', this.books);
        } else {
          this.books = [];
          console.warn('No books found for genre:', this.genre);
        }
      },
      (error: any) => {
        console.error('Error fetching books:', error);
        this.books = [];
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
}