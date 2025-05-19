using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Topic
    {
        public int Id { get; set; }
        
        [Required]
        public string Title { get; set; }

        [ForeignKey("Club")]
        public int ClubId { get; set; }
        
        public virtual Club Club { get; set; }
        
        [ForeignKey("Creator")]
        public int CreatorId { get; set; }
        
        public virtual UserProfile Creator { get; set; }
        
        public virtual ICollection<Comment> Comments { get; set; } = new List<Comment>();
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    }
}
