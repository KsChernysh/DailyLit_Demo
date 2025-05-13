using DailyLit.Server.Profiles;
using System;
using System.Collections.Generic;
using System.Linq;

namespace DailyLit.Server.Repository
{
    public class BooksRecommender
    {
        // Побудова профілю користувача з вагами ключових слів
        public Dictionary<string, float> BuildUserProfile(List<BooksCollection> readBooks)
        {
            var keywordScores = new Dictionary<string, float>();

            foreach (var book in readBooks.Where(b => int.TryParse(b.Rating, out _)))
            {
                int weight = int.Parse(book.Rating);
                foreach (var keyword in book.Keywords.Distinct())
                {
                    if (!keywordScores.ContainsKey(keyword))
                        keywordScores[keyword] = 0;
                    keywordScores[keyword] += weight;
                }
            }
            return keywordScores;
        }

        // Контент-бейзд рекомендації з урахуванням рейтингу
        public List<(BooksCollection, float)> RecommendFromRatedBooks(List<BooksCollection> userBooks)
        {
            var readBooks = userBooks
                .Where(b => b.ShelfName == "Read" && int.TryParse(b.Rating, out _))
                .ToList();

            var profile = BuildUserProfile(readBooks);
            var recommendations = new List<(BooksCollection, float)>();

            var unreadBooks = userBooks.Where(b => b.ShelfName != "Read").ToList();

            foreach (var book in unreadBooks)
            {
                float score = 0;
                foreach (var keyword in book.Keywords.Distinct())
                {
                    if (profile.TryGetValue(keyword, out float weight))
                        score += weight;
                }

                if (readBooks.Any(b => b.Genre == book.Genre))
                    score += 1.0f;

                if (score > 0)
                    recommendations.Add((book, score));
            }

            return recommendations.OrderByDescending(r => r.Item2).ToList();
        }

        // Контент-бейзд рекомендації без урахування рейтингу
        public List<(BooksCollection, float)> RecommendBySimilarity(List<BooksCollection> userBooks)
        {
            var referenceBooks = userBooks
                .Where(b => b.ShelfName != "Read") // наприклад, "Читаю", "Хочу прочитати"
                .ToList();

            var keywords = referenceBooks
                .SelectMany(b => b.Keywords)
                .GroupBy(k => k)
                .ToDictionary(g => g.Key, g => g.Count());

            var recommendations = new List<(BooksCollection, float)>();

            var candidateBooks = userBooks.Except(referenceBooks).ToList();

            foreach (var book in candidateBooks)
            {
                float score = 0;
                foreach (var keyword in book.Keywords)
                {
                    if (keywords.TryGetValue(keyword, out int weight))
                        score += weight;
                }

                if (referenceBooks.Any(b => b.Genre == book.Genre))
                    score += 1;

                if (score > 0)
                    recommendations.Add((book, score));
            }

            return recommendations.OrderByDescending(b => b.Item2).ToList();
        }

        // Головний метод — обирає алгоритм за ім’ям полиці
        public List<(BooksCollection, float)> GetRecommendationsByShelf(List<BooksCollection> books)
        {
            bool hasReadBooks = books.Any(b => b.ShelfName == "Read" && int.TryParse(b.Rating, out _));
            return hasReadBooks
                ? RecommendFromRatedBooks(books)
                : RecommendBySimilarity(books);
        }
    }
}
