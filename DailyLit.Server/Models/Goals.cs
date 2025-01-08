using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class Goals
    {
        public int Id { get; set; }
        [ForeignKey("User")]
        public int UserId { get; set; }
        public int ToRead { get; set; }   
        public int Reading { get; set; }
        public int Finished { get; set; }

        public virtual UserProfile User { get; set; }
        

    }
}
