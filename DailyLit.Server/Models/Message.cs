namespace DailyLit.Server.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string BookId { get; set; } // ID книги, до якої прив'язаний чат
        public string UserName { get; set; } // ID користувача, який залишив повідомлення
        public string Text { get; set; } // Текст повідомлення
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Час створення
    }
}
