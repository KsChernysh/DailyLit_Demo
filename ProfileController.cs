// Add these endpoints to the ProfileController

[HttpGet("genre-stats")]
public async Task<ActionResult<IEnumerable<object>>> GetGenreStats()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId))
    {
        return Unauthorized();
    }

    try
    {
        // Get Read shelf
        var readShelf = await _context.Shelves
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Title == "Read");

        if (readShelf == null)
        {
            return Ok(new List<object>());
        }

        // Get all books in the Read shelf with their genres
        var readBooks = await _context.BookShelves
            .Where(bs => bs.ShelfId == readShelf.Id)
            .Join(_context.Books, bs => bs.BookId, b => b.Id, (bs, b) => new { Book = b })
            .ToListAsync();

        // Count books by genre
        var genreCounts = readBooks
            .GroupBy(b => b.Book.Genre ?? "Інше")
            .Select(g => new { Genre = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ToList();

        // Calculate percentages
        int totalBooks = readBooks.Count;
        var result = genreCounts.Select(g => new
        {
            genre = g.Genre,
            count = g.Count,
            percentage = totalBooks > 0 ? Math.Round((double)g.Count / totalBooks * 100) : 0
        }).ToList();

        return Ok(result);
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message);
    }
}

[HttpGet("monthly-reading")]
public async Task<ActionResult<IEnumerable<object>>> GetMonthlyReading()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId))
    {
        return Unauthorized();
    }

    try
    {
        // Get Read shelf
        var readShelf = await _context.Shelves
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Title == "Read");

        if (readShelf == null)
        {
            return Ok(new List<object>());
        }

        // Get all books in the Read shelf with their DateFinished
        var readBooks = await _context.BookShelves
            .Where(bs => bs.ShelfId == readShelf.Id)
            .Select(bs => new { bs.DateAdded })
            .ToListAsync();

        // Get current year
        int currentYear = DateTime.Now.Year;

        // Create a dictionary to store the monthly counts
        var monthlyData = new Dictionary<string, int>
        {
            { "Січ", 0 }, { "Лют", 0 }, { "Бер", 0 }, { "Кві", 0 },
            { "Тра", 0 }, { "Чер", 0 }, { "Лип", 0 }, { "Сер", 0 },
            { "Вер", 0 }, { "Жов", 0 }, { "Лис", 0 }, { "Гру", 0 }
        };

        // Count books by month for the current year
        foreach (var book in readBooks)
        {
            if (book.DateAdded.Year == currentYear)
            {
                int month = book.DateAdded.Month;
                string monthName = monthlyData.Keys.ElementAt(month - 1);
                monthlyData[monthName]++;
            }
        }

        // Convert to result format
        var result = monthlyData.Select(kv => new
        {
            month = kv.Key,
            count = kv.Value
        }).ToList();

        return Ok(result);
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message);
    }
}

// Update the existing endpoint for adding a book to the "Read" shelf
// to also update the user's read count in the profile
[HttpPost("add-to-read-shelf/{bookId}")]
public async Task<IActionResult> AddToReadShelf(string bookId)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId))
    {
        return Unauthorized();
    }

    try
    {
        // Get the Read shelf
        var readShelf = await _context.Shelves
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Title == "Read");

        if (readShelf == null)
        {
            // Create Read shelf if it doesn't exist
            readShelf = new Shelf { UserId = userId, Title = "Read" };
            _context.Shelves.Add(readShelf);
            await _context.SaveChangesAsync();
        }

        // Check if the book is already in the Read shelf
        var existingBookShelf = await _context.BookShelves
            .FirstOrDefaultAsync(bs => bs.ShelfId == readShelf.Id && bs.BookId == bookId);

        if (existingBookShelf == null)
        {
            // Add the book to the Read shelf
            _context.BookShelves.Add(new BookShelf
            {
                ShelfId = readShelf.Id,
                BookId = bookId,
                DateAdded = DateTime.Now
            });

            // Update the user's read count
            var userProfile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (userProfile != null)
            {
                userProfile.Read = (userProfile.Read ?? 0) + 1;
            }

            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Book added to Read shelf successfully" });
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message);
    }
}
