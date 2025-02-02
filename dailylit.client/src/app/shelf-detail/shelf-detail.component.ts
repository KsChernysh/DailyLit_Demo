import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BookService } from '../book.service';

@Component({
  selector: 'app-shelf-detail',
  templateUrl: './shelf-detail.component.html',
  styleUrls: ['./shelf-detail.component.css']
})
export class ShelfDetailComponent implements OnInit {
  title: string = '';
  books: BookDetails[] = [];
  id: string = '';
  api: string = "https://localhost:7172/api/Books";
  message: string = '';

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient, private bookService: BookService) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(paramMap => {
      this.title = paramMap.get('title') || '';
      this.loadBooks();
    });
  }

  loadBooks(): void {
    const encodedTitle =  this.title

    this.http.get(`${this.api}/books?shelfName=${encodedTitle}`, { withCredentials: true }).subscribe(
     data =>{
        console.log('Books loaded:', data);
        this.books = (data as any[]).map((item: any) => ({
          id: item.id,
          title: item.title || 'No Title',
          author_name: item.author || 'No Author',
          cover_url: item.cover_Url || 'assets/no-cover.png',
          status: item.status || 'No Status',
          key: item.key || 'No Key',
          rating: item.rating || 0,
          booksadded: item.booksadded || new Date(),
          dateread: item.dateread,
        }));
      
      },
      (error) => {
        this.message = 'Error loading books.';
        console.error('Error loading books:', error);
      }
    );
  }
  apicall(key : string)
 {
  this.bookService.getBookDetails(key).subscribe(
    data => {
      this.id= key;
      console.log(data);
    
      this.router.navigate([`/book/`, this.id]);
    }
  );
}
}

interface BookDetails { 
  id: string,
  title: string,
  author_name: string,
  cover_url: string,
  status: string,
  rating: number,
  key: string,
  booksadded: Date,
  dateread: Date
}

