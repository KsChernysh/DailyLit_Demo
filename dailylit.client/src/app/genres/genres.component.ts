import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { BookService } from '../book.service';
import { GlobalVariablesService } from '../global.variables.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-genres',
  templateUrl: './genres.component.html',
  styleUrls: ['./genres.component.css']
})
export class GenresComponent implements OnInit {
  books: any[] = [];




  constructor(private http: HttpClient, private global : GlobalVariablesService, private bookService : BookService, private router: Router) {} 

  ngOnInit() {
    
  }
  genres: string[] = ['Fantasy', 'Science Fiction', 'Mystery', 'Non-fiction', 'Romance'];
  title = 'dailylit.client';

  isSidenavOpen = false;

  toggleSidenav() {
    this.isSidenavOpen = !this.isSidenavOpen;
  }
  goTo(genre: string){
    this.global.selectedGenre = genre;
    this.bookService.getBooks(genre).subscribe((data: any[]) => {
      console.log(data);
      const formattedGenre = genre.replace(/\s+/g, '-');  // Замінюємо пробіли на дефіси
      this.router.navigate([`/${formattedGenre}`]);
    }, error => {
    }
    );}




 
}
