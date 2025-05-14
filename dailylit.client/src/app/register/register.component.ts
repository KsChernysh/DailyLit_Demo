import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isSubmitting: boolean = false;
  registrationError: string = '';
  
  constructor(
    private authService: AuthService, 
    private formBuilder: FormBuilder, 
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  register(name: string, password: string) {
    if (name && password) {
      this.isSubmitting = true;
      this.registrationError = '';
      
      this.authService.register(name, password).subscribe({
        next: (response) => {
          console.log('Успішна реєстрація:', response);
          this.router.navigate(['/login'], { 
            queryParams: { 
              registered: 'success',
              username: name
            }
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          
          if (error.status === 400) {
            if (error.error && error.error.message) {
              this.registrationError = error.error.message;
            } else {
              this.registrationError = 'Помилка валідації даних';
            }
            console.error('Помилка валідації:', error.error);
          } else {
            this.registrationError = 'Помилка при реєстрації. Спробуйте пізніше.';
            console.error('Помилка реєстрації:', error);
          }
        }
      });
    }
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.register(
        this.registerForm.value.name, 
        this.registerForm.value.password
      );
    } else {
      // Позначаємо всі поля як "торкнуті", щоб показати помилки валідації
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
    }
  }
  
  // Геттери для зручного доступу у шаблоні
  get nameControl() { return this.registerForm.get('name'); }
  get passwordControl() { return this.registerForm.get('password'); }
  get termsControl() { return this.registerForm.get('termsAccepted'); }
}