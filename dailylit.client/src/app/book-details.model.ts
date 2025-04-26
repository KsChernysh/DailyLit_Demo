export interface BookDetails {
  title: string;           // Назва книги
  author_name: string;     // Список авторів
  cover_url: string;       // URL обкладинки
  description: string;     // Опис книги
  genre: any;           // Жанр книги
  key: string;             // Ключ книги  
  pages: number;           // Кількість сторінок
  publish_date: string;    // Дата публікації
  rating: number;          // Рейтинг книги
 
}

export class Author {
  name: string;
  key: string;

  constructor(data: any) {
    this.name = data.name;
    this.key = data.key;
  }
}
