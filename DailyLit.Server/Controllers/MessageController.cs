using DailyLit.Server.Data;
using DailyLit.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[Route("api/Chat")]
[ApiController]
public class MessageController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _userName;
    public MessageController(IHttpContextAccessor httpContextAccessor, ApplicationDbContext context)
    {
        _httpContextAccessor = httpContextAccessor;
        _userName = _httpContextAccessor.HttpContext.User.Identity.Name;
        _context = context;
    }
 

    [HttpGet("{bookId}")]
    public async Task<IActionResult> GetMessages( string bookId)
    {
        var messages = await _context.Messages
            .Where(m => m.BookId == bookId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        return Ok(messages);
    }

    [HttpPost]
    public async Task<IActionResult> AddMessage([FromBody] Message message)
    {
        if (message == null || string.IsNullOrWhiteSpace(message.Text))
        {
            return BadRequest("Message text is required.");
        }

        message.BookId = message.BookId;
        message.CreatedAt = DateTime.UtcNow;
        message.UserName = _userName;
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        return Ok(message);
    }
}
