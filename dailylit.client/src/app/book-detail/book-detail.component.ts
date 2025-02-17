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
  selectedShelfId: number = 0;
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
                genre: book.genre || 'No Genre',
                cover_url: book.cover_url || 'assets/no-cover.png',
                description: book.description || 'No Description Available'
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
    this.http.get<string[]>(`${this.api}/shelves`, { withCredentials: true }).subscribe(
      (data) => {
        this.shelves = data;
      },
      (error) => {
        this.message = 'Error loading shelves.';
        console.error('Error loading shelves:', error);
      }
    );
  }

  openDialog() {
    this.isDialogOpen = true;
  }

  closeDialog() {
    this.isDialogOpen = false;
    this.selectedShelfId = 0;
  }

  onSubmit() {
    if (this.book && this.selectedShelfId) {
      const newBook = {
      
        title: this.book.title || 'No Title',
        author: this.book.author_name || 'No Author',
        cover_url:  this.book.cover_url || 'assets/no-cover.png',
        key: this.corectId || 'No Key',
        status: '',
        rating: '',
        genre: this.book.genre || 'No Genre',
        booksadded: new Date(),
        
      };
      this.http.post(`${this.api}/add-book?shelfNameKey=${this.selectedShelfId}`, newBook, { withCredentials: true }).subscribe(
        (response: any) => {
          this.message = 'Book added to shelf successfully!';
          this.isDialogOpen = false;
        },
        (error: any) => {
     
          this.message = 'Error adding book to shelf.';
          console.error('Error adding book to shelf:', error);
        }
      );
    }
  }
  
}
