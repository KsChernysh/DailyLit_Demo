// Add this endpoint to the BooksController

[HttpGet("shelves-with-counts")]
public async Task<ActionResult<IEnumerable<object>>> GetShelvesWithCounts()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId))
    {
        return Unauthorized();
    }

    try
    {
        // Get all shelves for the user
        var shelves = await _context.Shelves
            .Where(s => s.UserId == userId)
            .ToListAsync();

        // Get the count of books for each shelf
        var result = new List<object>();
        foreach (var shelf in shelves)
        {
            var count = await _context.BookShelves
                .Where(bs => bs.ShelfId == shelf.Id)
                .CountAsync();

            result.Add(new { title = shelf.Title, count });
        }

        return Ok(result);
    }
    catch (Exception ex)
    {
        return StatusCode(500, ex.Message);
    }
}
