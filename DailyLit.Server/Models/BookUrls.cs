using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class BookUrls
    {
        public Guid Id { get; set; }
        public string Url { get; set; }
        public string Title { get; set; }
        public string Author { get; set; }
        public string Cover_Url { get; set; }
        public string Key { get; set; }
        public string Status { get; set; }
        public string? Rating { get; set; }
        public DateTime? BooksAdded { get; set; }
        public DateTime? DateRead { get; set; }
        [ForeignKey("Shelfs")]
        public int ShelfId { get; set; }
        public virtual Shelfs Shelf { get; set; }

    }
}
