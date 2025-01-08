import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface ProfileViewModel {
  userName: string;
  email?: string;
  nickName?: string;
  profilePicture?: string;
  bio?: string;
  goal?: number;
  read?: number;
}

@Component({
  selector: 'app-editprofile',
  templateUrl: './editprofile.component.html',
  styleUrls: ['./editprofile.component.css']
})
export class EditprofileComponent implements OnInit {
  profile: ProfileViewModel = {
    userName: '',
    email: '',
    nickName: '',
    profilePicture: '',
    bio: '',
    goal: 0,
    read: 0
  };
  errorMessage: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}
  api = "https://localhost:7172/api/Profile";

  ngOnInit(): void {
    this.http.get<ProfileViewModel>(this.api + "/profile", { withCredentials: true }).subscribe(
      (data) => {
        this.profile = data;
      },
      (error) => {
        console.error('Error fetching profile', error);
        this.errorMessage = 'Error fetching profile. Please try again later.';
      }
    );
  }

  onSubmit(): void {
    this.http.post<ProfileViewModel>(this.api + "/edit", this.profile, { withCredentials: true }).subscribe(
      (data) => {
        console.log('Profile updated:', data);
        this.router.navigate(['/profile']);
      },
      (error) => {
        console.error('Error updating profile', error);
        this.errorMessage = 'Error updating profile. Please try again later.';
      }
    );
  }
}
