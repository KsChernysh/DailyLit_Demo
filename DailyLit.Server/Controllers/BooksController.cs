using DailyLit.Server.Models;
using DailyLit.Server.Profiles;
using DailyLit.Server.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace DailyLit.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BooksController : ControllerBase
    {
        private readonly IBooksManager _booksManager;

        public BooksController(IBooksManager booksManager)
        {
            _booksManager = booksManager;
        }

        [HttpPost("add-shelf")]
        public async Task<IActionResult> AddShelf([FromBody] string name)
        {
            var shelf = await _booksManager.AddShelfsAsync(name);
            if (shelf == null)
            {
                return BadRequest("Error adding shelf.");
            }
            return Ok(shelf);
        }

        [HttpPost("add-book")]
        public async Task<IActionResult> AddBook([FromBody] BooksViewModel book, [FromQuery] int shelfNameKey)
        {
            var addedBook = await _booksManager.AddBookAsync(book, shelfNameKey);
            if (addedBook == null)
            {
                return BadRequest("Error adding book.");
            }
            return Ok(addedBook);
        }

        [HttpGet("shelves")]
        public async Task<IActionResult> GetShelves()
        {
            var shelves = await _booksManager.GetShelvesAsync();
            
            return Ok(shelves);
        }

        [HttpGet("books")]
        public async Task<IActionResult> GetBooks([FromQuery] string shelfName)
        {
            var books = await _booksManager.GetBooksAsync(shelfName);
            return Ok(books);
        }
    }
}
