using DailyLit.Server.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DailyLit.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<IdentityUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        public DbSet<UserProfile> Profiles { get; set; }
        public DbSet<Goals> Goals { get; set; }
        public DbSet<Friends> Friends { get; set; }
        public DbSet<GroupMembers> GroupMembers { get; set; }
        public DbSet<Groups> Groups { get; set; }
        public DbSet<Shelfs> Shelfs { get; set; }
        public DbSet<BothReads> BothReads { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<BookUrls> BooksCollection { get; set; }
        public DbSet<Message> Messages { get; set; }




    }

}
