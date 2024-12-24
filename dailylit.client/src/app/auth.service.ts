import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) { }

  api = "https://localhost:7172/api/Auth";

  login(name: string, password: string): Observable<any> {
    return this.http.post(this.api + "/login", { username: name, password: password }, { withCredentials: true });
  }

  register(name: string, password: string): Observable<any> {
    return this.http.post(this.api + "/register", { username: name, password: password }, { withCredentials: true });
  }

  logout(): Observable<any> {
    return this.http.get(this.api + "/logout", { withCredentials: true });
  }

  setLoggedIn(value: boolean) {
    this.loggedIn.next(value);
  }

  get isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }
}
