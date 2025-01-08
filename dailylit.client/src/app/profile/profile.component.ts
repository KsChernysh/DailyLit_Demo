import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface UserProfile {
  id: number;
  userName: string;
  email?: string;
  nickName?: string;
  profilePicture?: string;
  bio?: string;
  goal?: number;
  read?: number;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  errorMessage: string | null = null;

  constructor(private http: HttpClient) {}
  api = "https://localhost:7172/api/Profile";

  ngOnInit(): void {
    this.http.get<UserProfile>(this.api + "/profile", { withCredentials: true }).subscribe(
      (data) => {
        this.userProfile = data;
      },
      (error) => {
        console.error('Error fetching profile', error);
        this.errorMessage = 'Error fetching profile. Please try again later.';
      }
    );
  }
}
