﻿using DailyLit.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace DailyLit.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        public DbSet<Users> Users { get; set; }
        public DbSet<Goals> Goals { get; set; }
        public DbSet<Friends> Friends { get; set; }
        public DbSet<GroupMembers> GroupMembers { get; set; }
        public DbSet<Groups> Groups { get; set; }
        public DbSet<Shelfs> Shelfs { get; set; }
        public DbSet<BothReads> BothReads { get; set; }
        public DbSet<Book> Books { get; set; }




    }
   
}