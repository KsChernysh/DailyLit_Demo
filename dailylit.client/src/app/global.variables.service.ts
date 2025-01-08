import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalVariablesService {
  private _selectedGenre = new BehaviorSubject<string>('classic');

  get selectedGenre$() {
    return this._selectedGenre.asObservable();
  }

  set selectedGenre(value: string) {
    console.log('Updating selected genre to:', value); // Debugging log
    this._selectedGenre.next(value);
  }

  get selectedGenre(): string {
    return this._selectedGenre.value;
  }
  public apiKey : string = "AIzaSyD3j5xgRn1CzXJPM9PWb4HoyMviziBhHks";
}