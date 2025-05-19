using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Club
    {
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; }
        
        public string Description { get; set; }
        
        public string Genre { get; set; }
        
        public byte[]? Image { get; set; }
        
        [ForeignKey("Creator")]
        public int CreatorId { get; set; }
        
        public virtual UserProfile Creator { get; set; }
        
        public virtual ICollection<Topic> Topics { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
