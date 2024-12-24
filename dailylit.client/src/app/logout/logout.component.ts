import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrl: './logout.component.css'
})
export class LogoutComponent {
  constructor(private authService: AuthService, private router: Router) {
    this.logout();
  }
logout() {
  this.authService.logout().subscribe(
    (response: any) => {
      // Handle successful logout
      this.router.navigate(['/']);
    },
    (error: any) => {
      // Handle logout error
      alert('Error logging out');
    }
  );
}
}
