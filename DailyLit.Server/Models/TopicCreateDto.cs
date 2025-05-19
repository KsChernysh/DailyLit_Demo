using System.ComponentModel.DataAnnotations;

namespace DailyLit.Server.Models
{
    public class TopicCreateDto
    {
        [Required]
        public string Title { get; set; }
        
        [Required]
        public int ClubId { get; set; }
    }
}