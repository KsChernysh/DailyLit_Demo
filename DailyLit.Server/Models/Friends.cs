using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Friends
    {
        public int Id { get; set; }
       
        public int UserId { get; set; }
        [ForeignKey("User")]
        public int FriendId { get; set; }
        public virtual UserProfile User { get; set; }

    }
}
