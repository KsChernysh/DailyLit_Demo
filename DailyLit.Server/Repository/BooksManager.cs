using DailyLit.Server.Data;
using DailyLit.Server.Models;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http.HttpResults;
using DailyLit.Server.Profiles;
using Microsoft.AspNetCore.Mvc;
using System.Net.Security;
using AutoMapper;

namespace DailyLit.Server.Repository
{
    public class BooksManager : IBooksManager
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        string[] defaultShelfs = ["Want to Read", "Currently reading", "Read"];
        private readonly IMapper _mapper;


        public BooksManager(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor, IMapper mapper)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _mapper = mapper;
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

            if (defaultShelfs.Contains(shelf.Title) && string.IsNullOrEmpty(book.Status))
            {
                book.Status = shelf.Title;
            }

            var bookDomain = _mapper.Map<BookUrls>(book);
            bookDomain.Id = Guid.NewGuid();
            bookDomain.ShelfId = shelfId;
            bookDomain.Shelf = shelf;

            if (_context.BooksCollection.Any(x => x.Key == book.Key && x.ShelfId == shelfId))
            {
                throw new InvalidOperationException("Book already exists.");
            }

            _context.BooksCollection.Add(bookDomain);
            await _context.SaveChangesAsync();
            return bookDomain;
        }
/*
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
*/
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

        public async Task<IActionResult> DeleteBookFromShelfAsync(string name, string key)
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

            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == name && x.UserId == profile.Id);
            if (shelf == null)
            {
                throw new InvalidOperationException("Shelf not found.");
            }

            var book = await _context.BooksCollection.FirstOrDefaultAsync(x => x.Key == key && x.ShelfId == shelf.Id);
            if (book == null)
            {
                return new NotFoundObjectResult("Book not found.");
            }

            _context.BooksCollection.Remove(book);
            await _context.SaveChangesAsync();
            return new OkResult();
        }



        public async Task<IActionResult> DeleteShelfAsync(string name)
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
            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == name && x.UserId == profile.Id);
            if (shelf == null)
            {
                return new NotFoundObjectResult("Shelf not found.");
            }
            _context.Shelfs.Remove(shelf);
            await _context.SaveChangesAsync();
            return new OkResult();
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
      

        public async Task<BooksViewModel> UpdateBookAsync(BooksEdit book, string shelfName, string key)
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

            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == shelfName && x.UserId == profile.Id);
            if (shelf == null)
            {
                throw new InvalidOperationException("Shelf not found.");
            }

            var bookDomain = await _context.BooksCollection.FirstOrDefaultAsync(x => x.Key == key && x.ShelfId == shelf.Id);
            if (bookDomain == null)
            {
                throw new InvalidOperationException("Book not found.");
            }
            if(bookDomain.Status != book.status && defaultShelfs.Contains(bookDomain.Status)&& defaultShelfs.Contains(book.status))
            {
                var newShelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == book.status && x.UserId == profile.Id);
                var changedStatus = new BookUrls()
                {
                    Id = Guid.NewGuid(),
                    Url = bookDomain.Url,
                    Title = bookDomain.Title,
                    Author = bookDomain.Author,
                    Cover_Url = bookDomain.Cover_Url,
                    Genre = bookDomain.Genre,
                    Key = bookDomain.Key,
                    Status = book.status,
                    Rating = book.rating,
                    BooksAdded = bookDomain.BooksAdded,
                    DateRead = book.dateread,
                    ShelfId = newShelf.Id,
                    Shelf = newShelf
                };
                _context.BooksCollection.Remove(bookDomain);
                _context.BooksCollection.Add(changedStatus);
                await _context.SaveChangesAsync();
            }
          
            bookDomain.Status = book.status;
            bookDomain.Rating = book.rating;
            bookDomain.DateRead = book.dateread;
            await _context.SaveChangesAsync();

           return _mapper.Map<BooksViewModel>(bookDomain);

        }

        public async Task<BooksViewModel> GetBookAsync(string key, string shelfIName)
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
            var shelf = await _context.Shelfs.FirstOrDefaultAsync(x => x.Title == shelfIName && x.UserId == profile.Id);
            var book = await _context.BooksCollection.FirstOrDefaultAsync(x => x.Key == key && x.ShelfId == shelf.Id);
            if (book == null)
            {
                throw new InvalidOperationException("Book not found.");
            }
            return _mapper.Map<BooksViewModel>(book);
          
        }
    }
}
