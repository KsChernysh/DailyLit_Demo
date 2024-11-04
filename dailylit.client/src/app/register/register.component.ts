import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  name = '';
  password = '';
  registerForm: FormGroup;

  constructor(private authService: AuthService, private formBuilder: FormBuilder) {
    this.registerForm = this.formBuilder.group({
      name: [this.name, Validators.required],
      password: [this.password, Validators.required]
    });
  }

  register(name: string, password: string) {
    if (name && password) {
      this.authService.register(name, password).subscribe({
        next: (response) => {
          console.log('Успішна реєстрація:', response);
        },
        error: (error) => {
          if (error.status === 400) {
            console.error('Помилка валідації:', error.error);
          } else {
            console.error('Помилка реєстрації:', error);
          }
        }
      });
    }
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.register(this.registerForm.value.name, this.registerForm.value.password);
    }
  }
}