using DailyLit.Server.Data;
using DailyLit.Server.Models;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;
using DailyLit.Server.Profiles;

namespace DailyLit.Server.Repository
{
    public class BooksManager : IBooksManager
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        string[] defaultShelfs = ["Want to Read", "Currently reading", "Read"];

        public BooksManager(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<BookUrls> AddBookAsync(BooksViewModel book, int shelfId)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.Name == null)
            {
                throw new InvalidOperationException("User is not authenticated.");
            }

            var profile = await _context.Profiles.FirstOrDefaultAsync(x => x.UserName == user.Identity.Name);
            if (profile == null)
            {
                throw new InvalidOperationException("User profile not found.");
            }

            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Id == shelfId && x.UserId == profile.Id);
            if (shelf == null)
            {
                throw new InvalidOperationException("Shelf not found.");
            }
            if(defaultShelfs.Contains(shelf.Title) && book.Status=="")
            {
               book.Status = shelf.Title;
            }
            var bookDomain = new BookUrls()
            {
                Id = Guid.NewGuid(),
                Url = "",
                Title = book.Title,
                Author = book.Author,
                Cover_Url = book.Cover_Url,
                Key = book.Key,
                Status = book.Status == null ? "Want to Read" : book.Status,
                Rating = book.Rating,
                BooksAdded = book.BooksAdded,
                DateRead = book.DateRead,
                ShelfId = shelfId,
                Shelf = shelf

            };
            if(bookDomain == _context.BooksCollection.FirstOrDefault(x => x.Key == book.Key && x.ShelfId == shelfId))
            {
                throw new InvalidOperationException("Book already exists.");
            }
            _context.BooksCollection.Add(bookDomain);
            await _context.SaveChangesAsync();
            return bookDomain;
        }

        public async Task<Shelfs> AddShelfsAsync(string name)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.Name == null)
            {
                throw new InvalidOperationException("User is not authenticated.");
            }

            var profile = await _context.Profiles.FirstOrDefaultAsync(x => x.UserName == user.Identity.Name);
            if (profile == null)
            {
                throw new InvalidOperationException("User profile not found.");
            }
            var shelfslist = await _context.Shelfs.Where(x => x.UserId == profile.Id).ToListAsync();
        
            if (shelfslist.Any(x => x.Title == name))
            {
                throw new InvalidOperationException("Shelf already exists.");
            }
           
            var shelf = new Shelfs
            {
                Title = name,
                UserId = profile.Id
            };
            _context.Shelfs.Add(shelf);
            await _context.SaveChangesAsync();
            return shelf;
        }

        public async Task<List<BookUrls>> GetBooksAsync(string name)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.Name == null)
            {
                throw new InvalidOperationException("User is not authenticated.");
            }
            
           var profile = await _context.Profiles.FirstOrDefaultAsync(x => x.UserName == user.Identity.Name);
            if (profile == null)
            {
                throw new InvalidOperationException("User is not found.");
            }

            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == name && x.UserId == profile.Id);
            if (shelf == null)
            {
                return new List<BookUrls>();
            }

            return await _context.BooksCollection.Where(x => x.ShelfId == shelf.Id).ToListAsync();
        }

        public async Task<List<Shelfs>> GetShelvesAsync()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.Name == null)
            {
                throw new InvalidOperationException("User is not authenticated.");
            }

            var profile = await _context.Profiles.FirstOrDefaultAsync(x => x.UserName == user.Identity.Name);
            if (profile == null)
            {
                return new List<Shelfs>();
            }
            var shelfslist = await _context.Shelfs.Where(x => x.UserId == profile.Id).ToListAsync();
            if (shelfslist.Count == 0)
            {
                  foreach (var item in defaultShelfs)
                {
                    var defShelf = new Shelfs
                    {
                        Title = item,
                        UserId = profile.Id
                    };
                   await _context.Shelfs.AddAsync(defShelf);
                   await _context.SaveChangesAsync();

                }
            }

            return await _context.Shelfs.Where(x => x.UserId == profile.Id).ToListAsync();
        }
    }
}
