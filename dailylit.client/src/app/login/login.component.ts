import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  standalone: true,
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  name: string = '';
  password: string = '';
  loggedIn: boolean = false;

  constructor(private router: Router, private authService: AuthService) {
    this.authService.isLoggedIn.subscribe(value => {
      this.loggedIn = value;
    });
  }

  onSubmit() {
    this.authService.login(this.name, this.password).subscribe(
      (response: any) => {
        // Handle successful login
        this.authService.setLoggedIn(true);
        this.router.navigate(['/profile']);
      },
      (error: any) => {
        // Handle login error
        alert('Invalid name or password');
      }
    );
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.authService.setLoggedIn(false);
      this.router.navigate(['/login']);
    });
  }
}
