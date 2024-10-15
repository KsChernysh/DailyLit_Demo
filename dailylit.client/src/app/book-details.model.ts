export class BookDetails {
  title: string;           // Назва книги
  author: Author | null; // Додайте | null      // Список авторів
  cover_id?: number;       // Ідентифікатор обкладинки
  covers : any;
  cover_url: string; // генеруємо URL для обкладинки
  cover_edition_key?: string; // Ключ обкладинки
  edition_count: number;   // Кількість видань
  first_publish_year?: number; // Рік першої публікації
  subjects?: string[];     // Список жанрів або предметів
  description?: string[];    // Опис книги
  isbn?: string;          // ISBN книги
  publisher?: string;     // Видавництво
  language?: string;      // Мова книги
  pages?: number;         // Кількість сторінок
  rating?: number;        // Рейтинг книги (якщо є)

  constructor(data: any) {
    this.title = data.title;
    this.author = data.authors.map((author: any) => new Author(author));
    this.cover_id = data.cover_id;
    this.cover_edition_key = data.cover_edition_key;
    this.cover_url = `https://covers.openlibrary.org/b/id/${this.cover_id}-L.jpg`;
    this.edition_count = data.edition_count;
    this.first_publish_year = data.first_publish_year;
    this.subjects = data.subjects;
    this.description = data.description;
    this.isbn = data.isbn;
    this.publisher = data.publisher;
    this.language = data.language;
    this.pages = data.pages;
    this.rating = data.rating;
  }
}

export class Author {
  name: string;
  key: string;

  constructor(data: any) {
    this.name = data.name;
    this.key = data.key;
  }
}
