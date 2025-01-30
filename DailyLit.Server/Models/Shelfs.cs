using System.Collections.ObjectModel;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Shelfs
    {
        public int Id { get; set; }
        [ForeignKey("User")]
        public int UserId { get; set; }
        public string Title { get; set; }
        public byte[]? Picture { get; set; }
        public Collection<Book> Books { get; set; }
    }
}
