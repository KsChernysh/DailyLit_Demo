using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Book
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string? Author { get; set; }
        public string? Genre { get; set; }
        public string? Description { get; set; }
        public byte[]? Cover { get; set; }
        public int? Pages { get; set; }
        public int? Year { get; set; }
        public string? Language { get; set; }
        public string? Publisher { get; set; }
        public string? ISBN { get; set; }
        public int? Rating { get; set; }
        public string BookUrl { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual UserProfile User { get; set; }

        [ForeignKey("Shelfs")]
        public int ShelfId { get; set; }
        public virtual Shelfs Shelf { get; set; }



    }
}
