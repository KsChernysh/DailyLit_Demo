import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalVariablesService {
  private _selectedGenre = new BehaviorSubject<string>('classic');
  private _sortOption = new BehaviorSubject<string>('relevance');
  
  // Змінна для збереження книг після сортування
  public bookItems: any[] = [];

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
  
  get sortOption$() {
    return this._sortOption.asObservable();
  }

  set sortOption(value: string) {
    console.log('Updating sort option to:', value); // Debugging log
    this._sortOption.next(value);
  }

  get sortOption(): string {
    return this._sortOption.value;
  }
  
  public apiKey : string = "AIzaSyD3j5xgRn1CzXJPM9PWb4HoyMviziBhHks";
}