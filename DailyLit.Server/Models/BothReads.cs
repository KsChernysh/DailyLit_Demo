using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DailyLit.Server.Models
{
    [Index(nameof(UserId), nameof(FriendId), nameof(BookId), IsUnique = true)]
    public class BothReads
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        [ForeignKey("UserId")]
        [DeleteBehavior(DeleteBehavior.Restrict)]
        public virtual Users User { get; set; }

        public int FriendId { get; set; }
        [ForeignKey("FriendId")]
        [DeleteBehavior(DeleteBehavior.Restrict)]
        public virtual Users Friend { get; set; }

        public int BookId { get; set; }
        public string BookTitle { get; set; }
        public string BookAuthor { get; set; }
        public string BookDescription { get; set; }
        public string BookGenre { get; set; }
        public string BookRating { get; set; }
        public string BookCover { get; set; }
        public int Progress { get; set; }
    }
}