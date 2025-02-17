using DailyLit.Server.Models;
using DailyLit.Server.Profiles;
using Microsoft.AspNetCore.Mvc;

namespace DailyLit.Server.Repository
{
    public interface IBooksManager
    {
       public  Task<Shelfs> AddShelfsAsync(string name);
       public  Task<BookUrls> AddBookAsync(BooksViewModel book, int key);
        public Task<List<Shelfs>> GetShelvesAsync();
        public Task<List<BookUrls>> GetBooksAsync(string name);
        public Task<BooksViewModel> GetBookAsync (string key, string shelfName);
        public Task<IActionResult> DeleteShelfAsync(string name);
        public Task<IActionResult> DeleteBookFromShelfAsync(string name,string key);
        public Task<BooksViewModel> UpdateBookAsync(BooksEdit book, string shelfName, string key);
    }
}
