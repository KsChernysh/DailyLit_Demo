import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AppComponent } from './app.component';
import { BookListComponent } from './book-list/book-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSidenavModule } from '@angular/material/sidenav'; // Import the MatSidenavModule
import { MatListModule } from '@angular/material/list'; // Import the MatListModule
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GenresComponent } from './genres/genres.component';
import { BookViewerComponent } from './book-viewer/book-viewer.component';
import { BookDetailComponent } from './book-detail/book-detail.component';
import { RegisterComponent } from './register/register.component';
import { routes } from './app-routing.module';
import { MAT_RIPPLE_GLOBAL_OPTIONS } from '@angular/material/core';
import { LoginComponent } from './login/login.component';
import { AppRoutingModule } from './app-routing.module';
import { LogoutComponent } from './logout/logout.component';
import { ProfileComponent } from './profile/profile.component';
import { EditprofileComponent } from './editprofile/editprofile.component';
import { ShelvesViewComponent } from './shelves-view/shelves-view.component';
import { ShelfDetailComponent } from './shelf-detail/shelf-detail.component';
import { AichatComponent } from './aichat/aichat.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';


@NgModule({
  declarations: [
    AppComponent,
    BookListComponent,
    GenresComponent,
    BookViewerComponent,
    BookDetailComponent,
    RegisterComponent,
    LogoutComponent,
    ProfileComponent,
    EditprofileComponent,
    ShelvesViewComponent,
    ShelfDetailComponent,
    AichatComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    CommonModule,
    RouterModule.forRoot(routes),
    HttpClientModule, // Ensure HttpClientModule is imported here
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    { provide: MAT_RIPPLE_GLOBAL_OPTIONS, useValue: { disabled: true } }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
