// src/app/book.model.ts
export interface Book {
  title: string;
  author: string;
  cover_id: string; // додано поле для обкладинки
  cover_url: any; // генеруємо URL для обкладинки
  cover_edition_key: string; // додано ключ обкладинки
  description: string; // додано опис
  publisher: string; // додано видавництво
  works: string; // додано роботи
}
