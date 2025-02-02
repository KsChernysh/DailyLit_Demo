using DailyLit.Server.Models;
using DailyLit.Server.Profiles;

namespace DailyLit.Server.Repository
{
    public interface IBooksManager
    {
       public  Task<Shelfs> AddShelfsAsync(string name);
       public  Task<BookUrls> AddBookAsync(BooksViewModel book, int key);
        public Task<List<Shelfs>> GetShelvesAsync();
        public Task<List<BookUrls>> GetBooksAsync(string name);
    }
}
