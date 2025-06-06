# 📘 DailyLit 

> *Інтелектуальна веб-платформа для управління особистою бібліотекою з AI-асистентом, системою рекомендацій та спільнотою читачів.*

---

## 👤 Автор

- **ПІБ**: Черниш Оксана
- **Група**: ФЕІ-44
- **Керівник**: Павлик Михайло, кандидат фізико-математичних наук, доцент
- **Дата виконання**: 24.04.2025
---

## 📌 Загальна інформація

- **Тип проєкту**: Веб-платформа
- **Мова програмування**: С#, TypeScript
- **Фреймворки / Бібліотеки**: ASP.NET Core, Entity Framework Core, Angular, Bootstrap, Gemini API, Google Books API
- **База даних**: Microsoft SQL Server
---

## 🧠 Опис функціоналу

### 📚 Управління бібліотекою
- 📖 Створення персональних полиць для книг (Read, Want to read, Currently reading)
- 🔍 Пошук книг через Google Books API
- ⭐ Оцінювання та рецензування прочитаних книг
- 📊 Відстеження прогресу читання та статистика

### 🤖 AI-функціонал
- 💬 AI-чат асистент на базі Gemini AI
- 🎯 Персоналізовані рекомендації книг (гібридний алгоритм)
- 📅 Генерація планів читання
- 🏷️ Автоматичне витягування ключових слів та жанрів

### 👥 Соціальні функції
- 🏛️ Книжкові клуби та обговорення
- 💬 Чат-кімнати для обговорення книг
- 🌐 Спільнота читачів

### 📱 Додатковий функціонал
- 📖 Вбудований EPUB-читач

---
## 🧱 Опис основних класів / файлів

### Backend (C#)
| Клас / Файл | Призначення |
|-------------|-------------|
| BooksController.cs | REST API для управління книгами та полицями |
| CommunityController.cs | API для книжкових клубів та обговорень |
| `ApplicationDbContext.cs` | Контекст Entity Framework для роботи з БД |
| `BookDetails.cs` | Модель даних для книги |
| `Profile.cs` | Модель користувача |

### Frontend (TypeScript/Angular)
| Компонент / Сервіс | Призначення |
|-------------------|-------------|
| `AichatComponent` | AI-чат асистент з рекомендаціями |
| `ShelfDetailComponent` | Управління полицями та рекомендації |
| `BookViewerComponent` | EPUB-читач з навігацією |
| `GenresComponent` | Перегляд книг за жанрами |
| `CommunityComponent` | Книжкові клуби та обговорення |
| `BookService` | Сервіс для роботи з Google Books API |
| `GeminiService` | Інтеграція з Gemini AI |

---

## ▶️ Як запустити проєкт "з нуля"

### 1. Встановлення інструментів

- **.NET 8.0** SDK
- **Node.js v18+** + npm
- **Microsoft SQL Server** (LocalDB або повна версія)
- **Visual Studio 2022** або **VS Code**
- **Angular CLI** (`npm install -g @angular/cli`)

### 2. Клонування репозиторію

git clone https://github.com/KsChernysh/DailyLit_Demo
cd DailyLit_Demo

### 3. Налаштування Backend

```bash
cd DailyLit.Server

# Відновлення пакетів
dotnet restore

# Налаштування connection string в appsettings.json
# Створення та застосування міграцій
dotnet ef database update
```

### 4. Налаштування Frontend

```bash
cd ../dailylit.client

# Встановлення залежностей
npm install

# Збірка проєкту
ng build
```

### 5. Створення `appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=DailyLitDB;Trusted_Connection=true;MultipleActiveResultSets=true"
  },
  "Authentication": {
    "Google": {
      "ClientId": "your-google-client-id",
      "ClientSecret": "your-google-client-secret"
    }
  },
  "ApiKeys": {
    "GoogleBooks": "your-google-books-api-key",
    "GeminiAI": "your-gemini-api-key"
  }
}
```

### 6. Запуск

```bash
# Backend (з кореневої папки DailyLit.Server)
dotnet run
# Відкрийте браузер: https://localhost:7172 (замініть на власний порт)
```

---

## 🔌 API приклади

### 📚 Книги та полиці

**GET /api/Books/shelves**
```
Отримати список всіх полиць користувача
```

**GET /api/Books/books?shelfName=Read**
```
Отримати книги з конкретної полиці
```

**POST /api/Books/add-book?shelfNameKey=2**
```json
{
  "key": "book_id_123",
  "title": "Назва книги",
  "author_name": "Автор",
  "cover_url": "https://example.com/cover.jpg",
  "genre": "Fantasy",
  "keywords": ["magic", "adventure"],
  "rating": 5
}
```

**PUT /api/Books/update-book**
```json
{
  "id": 1,
  "rating": 4,
  "review": "Чудова книга!",
  "status": "read"
}
```

### 🏛️ Спільнота

**GET /api/Community/clubs**
```
Отримати список книжкових клубів
```

**POST /api/Community/Topics**
```json
{
  "title": "Обговорення нової книги",
  "clubId": 1
}
```

**POST /api/Community/Comments**
```json
{
  "content": "Цікава думка!",
  "topicId": 5
}
```
## 🖱️ Інструкція для користувача

### 🏠 Головна сторінка
1. **Реєстрація/Вхід**
2. **Пошук книг** у верхній панелі навігації
3. **Перегляд за жанрами** для відкриття нових книг

### 📚 Робота з бібліотекою
1. **Додавання книг**:
   - Знайти книгу → Клік "Додати на полицю" → Вибрати полицю
2. **Управління полицями**:
   - "Shelves" → Обрати полицю → Редагувати/Оцінити книги
3. **Отримання рекомендацій**:
   - Перейти на полицю → Переглянути рекомендації внизу сторінки

### 🤖 AI-асистент
1. **Відкрити чат**: Меню → "AI Chat"
2. **Готові запити**:
   - "Порекомендуй мені книгу про..."
   - "Сформуй мені книжковий план"
   - "Що почитати на вихідних?"
3. **Персональні плани**: AI аналізує полицю "Want to read"

### 👥 Спільнота
1. **Книжкові клуби**: Меню → "Community"
2. **Створення обговорень**: Обрати клуб → "Створити тему"
3. **Участь в дискусіях**: Коментувати та відповідати

### 📖 Читання
1. **EPUB Reader**: Завантажити файл → Читати з налаштуваннями
2. **Збереження прогресу**: Автоматичне збереження позиції

---

## 🧪 Проблеми і рішення

| Проблема | Рішення |
|----------|---------|
| **CORS помилки** | Налаштувати CORS policy в `Program.cs` |
| **Gemini AI не відповідає** | Перевірити API ключ його валідність та обмеження |
| **Google Books пошук не працює** | Перевірити API ключ Google Books |
| **База даних не підключається** | Перевірити connection string та SQL Server |
| **Рекомендації не генеруються** | Переконатися що є книги з рейтингами та чи працює Books API


## 🧾 Використані джерела / література

- [Angular Documentation](https://angular.io/docs)
- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [Entity Framework Core Guide](https://docs.microsoft.com/en-us/ef/core/)
- [Google Books API Documentation](https://developers.google.com/books/docs/v1/using)
- [Gemini AI API Documentation](https://ai.google.dev/gemini-api/docs/document-processing)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/)
- [ePub.js Documentation](https://github.com/futurepress/epub.js/)
