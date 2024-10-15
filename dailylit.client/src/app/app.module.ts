import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AppComponent } from './app.component';
import { BookListComponent } from './book-list/book-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav'; // Import the MatSidenavModule
import { MatListModule } from '@angular/material/list'; // Import the MatListModule
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GenresComponent } from './genres/genres.component';
import { BookViewerComponent } from './book-viewer/book-viewer.component';
import { routes } from './app-routing.module';
import { MAT_RIPPLE_GLOBAL_OPTIONS } from '@angular/material/core';
import { BookDetailComponent } from './book-detail/book-detail.component';

@NgModule({
  declarations: [
    AppComponent,
    BookListComponent,
    GenresComponent,
    BookViewerComponent,
    BookDetailComponent
  ],
  imports: [
    BrowserModule, BrowserAnimationsModule, MatToolbarModule, MatSidenavModule, 
    MatListModule,  FormsModule, CommonModule,    RouterModule.forRoot(routes), HttpClientModule
  ],
  providers: [
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: { disabled: true } }],
  bootstrap: [AppComponent]
})
export class AppModule { }
