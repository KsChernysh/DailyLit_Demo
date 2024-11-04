import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private http: HttpClient) { }

  api = "https://localhost:7172/api/Auth";

  login(name: string, password: string) 
  {
    return this.http.post(this.api + "/login", { username: name, password: password }, { withCredentials: true });
  }

  register(name: string, password: string)
  {
    return this.http.post(this.api + "/register", { username: name, password: password }, { withCredentials: true });
  }

  logout()
  {
    return this.http.get(this.api + "/logout", {withCredentials: true}); // Assuming the logout API uses a POST method
  }
  //додаєм withCredentials: true для того щоб передавати куки на сервер, або отримувати їх
}
