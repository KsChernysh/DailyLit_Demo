using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Comment
    {
        public int Id { get; set; }
        
        [Required]
        public string Text { get; set; }
        
        [Required]
        public int TopicId { get; set; }
        
        public virtual Topic Topic { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        public virtual UserProfile User { get; set; }
        
        public int Likes { get; set; } = 0;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public int? ReplyToCommentId { get; set; }
        
        public virtual Comment ReplyToComment { get; set; }
    }
}
