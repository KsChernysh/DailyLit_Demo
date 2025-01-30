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

            var bookDomain = new BookUrls()
            {
                Id = Guid.NewGuid(),
                Url = "",
                Title = book.Title,
                Author = book.Author,
                Cover_Url = book.Cover_Url,
                Key = book.Key,
                ShelfId = shelfId,
                Shelf = shelf

            };

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

            var shelf = new Shelfs
            {
                Title = name,
                UserId = profile.Id
            };
            _context.Shelfs.Add(shelf);
            await _context.SaveChangesAsync();
            return shelf;
        }

        public async Task<List<Book>> GetBooksAsync(string name)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null || user.Identity?.Name == null)
            {
                throw new InvalidOperationException("User is not authenticated.");
            }

            var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
            {
                throw new InvalidOperationException("User ID not found.");
            }

            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == name && x.UserId == int.Parse(userId));
            if (shelf == null)
            {
                return new List<Book>();
            }

            return await _context.Books.Where(x => x.ShelfId == shelf.Id && x.UserId == int.Parse(userId)).ToListAsync();
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

            return await _context.Shelfs.Where(x => x.UserId == profile.Id).ToListAsync();
        }
    }
}
