using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class GroupMembers
    {
        public int Id { get; set; }
        public int GroupId { get; set; }
        [ForeignKey("User")]
        public int UserId { get; set; }
        public virtual Users User { get; set; }
    }
}
