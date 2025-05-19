using System.ComponentModel.DataAnnotations;

namespace DailyLit.Server.Models
{
    public class CommentCreateDto
    {
        [Required]
        public string Text { get; set; }

        [Required]
        public int TopicId { get; set; }

        public int? ReplyToCommentId { get; set; }
    }
}