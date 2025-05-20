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
        public DbSet<ClubMembers> ClubMembers { get; set; }
        public DbSet<Goals> Goals { get; set; }
        public DbSet<Friends> Friends { get; set; }
        public DbSet<GroupMembers> GroupMembers { get; set; }
        public DbSet<Groups> Groups { get; set; }
        public DbSet<Shelfs> Shelfs { get; set; }
        public DbSet<BothReads> BothReads { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<BookUrls> BooksCollection { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<Club> Clubs { get; set; }
        public DbSet<Topic> Topics { get; set; }
        public DbSet<Comment> Comments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships to avoid cyclic cascade delete paths
            
            // Topic relationships
            modelBuilder.Entity<Topic>()
                .HasOne(t => t.Creator)
                .WithMany()
                .HasForeignKey(t => t.CreatorId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Topic>()
                .HasOne(t => t.Club)
                .WithMany(c => c.Topics)
                .HasForeignKey(t => t.ClubId)
                .OnDelete(DeleteBehavior.Restrict);

            // Comment relationships
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.Topic)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TopicId)
                .OnDelete(DeleteBehavior.Restrict);

            // Optional: Comment reply relationship
            modelBuilder.Entity<Comment>()
                .HasOne(c => c.ReplyToComment)
                .WithMany()
                .HasForeignKey(c => c.ReplyToCommentId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);

            // Club relationships
            modelBuilder.Entity<Club>()
                .HasOne(c => c.Creator)
                .WithMany()
                .HasForeignKey(c => c.CreatorId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
