using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Groups
    {
        public int Id { get; set; }
        [ForeignKey("User")]
        public int UserId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public virtual UserProfile User { get; set; }
        public virtual ICollection<UserProfile> Members { get; set; }
        public byte[] Image { get; set; }
        

    }
}
