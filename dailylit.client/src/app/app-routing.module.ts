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
import { ShelvesViewComponent } from './shelves-view/shelves-view.component';
import { ShelfDetailComponent } from './shelf-detail/shelf-detail.component';
import { AichatComponent } from './aichat/aichat.component';
import { CommunityComponent } from './community/community.component';
import { ClubDetailComponent } from './club-detail/club-detail.component';
import { TopicDetailComponent } from './topic-detail/topic-detail.component';
import { CreateClubComponent } from './create-club/create-club.component';
import { CreateTopicComponent } from './create-topic/create-topic.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'list', component: BookListComponent },
  { path: 'ss', component: AppComponent },
  { path: 'genre/:genre', component: GenresComponent },
  { path: 'reader', component: BookViewerComponent },
  { path: 'book/:id', component: BookDetailComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'editprofile', component: EditprofileComponent },
  { path: 'shelves', component: ShelvesViewComponent },
  { path: 'shelf/:title', component: ShelfDetailComponent },
  { path: 'aichat', component: AichatComponent },
  { path: 'community', component: CommunityComponent },
  // Змінено порядок маршрутів, щоб спочатку перевірялись статичні маршрути
  { path: 'create-club', component: CreateClubComponent },
  { path: 'clubs/:id', component: ClubDetailComponent },
  { path: 'topics/:id', component: TopicDetailComponent },
  { path: 'create-topic/:clubId', component: CreateTopicComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
