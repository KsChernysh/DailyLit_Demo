import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookListComponent } from './book-list/book-list.component';
import { AppComponent } from './app.component';
import { GenresComponent } from './genres/genres.component';
import { BookViewerComponent } from './book-viewer/book-viewer.component';
import { BookDetailComponent } from './book-detail/book-detail.component';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { LogoutComponent } from './logout/logout.component';
import { ProfileComponent } from './profile/profile.component';
import { EditprofileComponent } from './editprofile/editprofile.component';

export const routes: Routes = [
  { path: 'list', component: BookListComponent },
  { path: 'ss', component: AppComponent },
  { path: 'genre/:genre', component: GenresComponent },
  { path: 'reader', component: BookViewerComponent },
  { path: 'book/:id', component: BookDetailComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  {path:'logout', component:LogoutComponent},
  {path:'profile', component:ProfileComponent},
  {path:'editprofile', component:EditprofileComponent}
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
