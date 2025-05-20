using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class ClubMembers
    {
        public int Id { get; set; }
        [ForeignKey("Club")]
        public int ClubId { get; set; }

        [ForeignKey("UserProfile")]
        public int UserId { get; set; }
        public virtual UserProfile UserProfile { get; set; }
        public virtual Club Club { get; set; }
    }
}
