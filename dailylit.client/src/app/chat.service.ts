import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ChatMessage {
  bookId: string;    // ID книги
  userName: string;  // Ім'я користувача
  text: string;      // Текст повідомлення
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'https://localhost:7172/api/Chat'; // Базовий URL вашого API чату

  constructor(private http: HttpClient) { }

  getMessages(bookId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${bookId}`, { withCredentials: true });
  }

  addMessage(message: ChatMessage): Observable<any> {
    return this.http.post(this.apiUrl, message, { withCredentials: true });
  }
}
