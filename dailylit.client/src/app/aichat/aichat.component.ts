import { Component } from '@angular/core';
import { GeminiService } from '../gemini.service';

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
}

@Component({
  selector: 'app-aichat',
  templateUrl: './aichat.component.html',
  styleUrls: ['./aichat.component.css']
})
export class AichatComponent {
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  history: { role: string; parts: any[] }[] = [];

  constructor(private geminiService: GeminiService) {}

  sendMessage() {
    const message = this.userInput.trim();
    if (!message) return;

    // Додаємо повідомлення користувача до історії
    this.messages.push({ role: 'user', content: message });
    this.history.push({ role: 'user', parts: [{ text: message }] });
    this.userInput = '';
    this.isLoading = true;

    // Викликаємо сервіс для генерації відповіді
    this.geminiService.generateContentWithGeminiPro(message, this.history)
      .subscribe(
        (response: string) => {
          this.messages.push({ role: 'bot', content: response });
          this.history.push({ role: 'bot', parts: [{ text: response }] });
          this.isLoading = false;
        },
        (error: any) => {
          console.error('Error generating response:', error);
          this.messages.push({ role: 'bot', content: 'Виникла помилка. Спробуйте ще раз.' });
          this.isLoading = false;
        }
      );
  }

  handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}
