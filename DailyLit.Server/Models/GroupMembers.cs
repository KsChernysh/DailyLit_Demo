﻿using System.ComponentModel.DataAnnotations.Schema;

namespace DailyLit.Server.Models
{
    public class GroupMembers
    {
        public int Id { get; set; }
        public int GroupId { get; set; }

        [ForeignKey("UserProfile")]
        public int UserId { get; set; }
        public virtual UserProfile UserProfile { get; set; }
    }

}
