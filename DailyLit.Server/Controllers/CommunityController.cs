using DailyLit.Server.Data;
using DailyLit.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace DailyLit.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommunityController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly string _userName;

        public CommunityController(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
            _userName = _httpContextAccessor.HttpContext?.User.Identity?.Name;
        }

        // GET: api/Community/Clubs
        [HttpGet("Clubs")]
        public async Task<IActionResult> GetClubs()
        {
            var clubs = await _context.Clubs
                .Include(c => c.Creator)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.Genre,
                    c.Image,
                    
                    Creator = c.Creator.UserName,
                    CreatorImage = c.Creator.ProfilePicture,
                    CreatedAt = c.CreatedAt,
                        TopicsCount = c.Topics.Count,
                    MembersCount = _context.ClubMembers.Count(gm => gm.ClubId == c.Id) // Count members
                })
                .ToListAsync();

            return Ok(clubs);
        }

        // GET: api/Community/Clubs/Popular
        [HttpGet("Clubs/Popular")]
        public async Task<IActionResult> GetPopularClubs()
        {
            var clubs = await _context.Clubs
                .Include(c => c.Creator)
                .Include(c => c.Topics)
                .OrderByDescending(c => c.Topics.Count)
                .Take(5)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.Genre,
                    c.Image,
                    Creator = c.Creator.UserName,
                    CreatedAt = c.CreatedAt,
                    TopicsCount = c.Topics.Count
                })
                .ToListAsync();

            return Ok(clubs);
        }

        // GET: api/Community/Clubs/ByGenre/{genre}
        [HttpGet("Clubs/ByGenre/{genre}")]
        public async Task<IActionResult> GetClubsByGenre(string genre)
        {
            var clubs = await _context.Clubs
                .Include(c => c.Creator)
                .Where(c => c.Genre == genre)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.Genre,
                    c.Image,
                    Creator = c.Creator.UserName,
                    CreatorImage = c.Creator.ProfilePicture,
                    CreatedAt = c.CreatedAt,
                    TopicsCount = c.Topics.Count
                })
                .ToListAsync();

            return Ok(clubs);
        }

        // GET: api/Community/Genres
        [HttpGet("Genres")]
        public async Task<IActionResult> GetGenres()
        {
            var genres = await _context.Clubs
                .GroupBy(c => c.Genre)
                .Select(g => new 
                {
                    Value = g.Key,
                    Name = g.Key,
                    Count = g.Count()
                })
                .ToListAsync();

            return Ok(genres);
        }

        // GET: api/Community/Clubs/5
        [HttpGet("Clubs/{id}")]
        public async Task<IActionResult> GetClub(int id)
        {
            var club = await _context.Clubs
                .Include(c => c.Creator)
                .Include(c => c.Topics)
                    .ThenInclude(t => t.Creator)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (club == null)
            {
                return NotFound();
            }

            var result = new
            {
                club.Id,
                club.Name,
                club.Description,
                club.Genre,
                club.Image,
                Creator = club.Creator.UserName,
                CreatorImage = club.Creator.ProfilePicture,
                CreatedAt = club.CreatedAt,
                Topics = club.Topics.Select(t => new
                {
                    t.Id,
                    t.Title,
                    Creator = t.Creator.UserName,
                    CommentsCount = t.Comments.Count,
                    t.CreatedAt,
                    t.LastActivityAt
                }).OrderByDescending(t => t.LastActivityAt),
                MembersCount = _context.GroupMembers.Count(gm => gm.GroupId == club.Id) // Count members
            };

            return Ok(result);
        }

        // POST: api/Community/Clubs
        [HttpPost("Clubs")]
        public async Task<IActionResult> CreateClub([FromBody] Club club)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Перевіряємо чи аутентифікований користувач
                var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
                if (user == null)
                {
                    return BadRequest(new { error = "User not found. You must be logged in to create a club." });
                }

                // Встановлюємо обов'язкові поля
                club.CreatorId = user.Id;
                club.CreatedAt = DateTime.UtcNow;
                
                // Перевіряємо, чи Topics не null
                if (club.Topics == null)
                {
                    club.Topics = new List<Topic>();
                }

                // Видаляємо поле Creator, тому що воно буде автоматично заповнене Entity Framework
                // на основі CreatorId
                club.Creator = null;

                _context.Clubs.Add(club);
                await _context.SaveChangesAsync();

                // Повертаємо розширений об'єкт з додатковою інформацією для клієнта
                return CreatedAtAction(nameof(GetClub), new { id = club.Id }, new
                {
                    club.Id,
                    club.Name,
                    club.Description,
                    club.Genre,
                    Creator = user.UserName,
                    CreatorId = user.Id,
                    club.CreatedAt
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating club: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }

        // POST: api/Community/InitSampleClubs
        [HttpPost("InitSampleClubs")]
        public async Task<IActionResult> InitSampleClubs()
        {
            // Перевіряємо, чи вже існують клуби
            if (await _context.Clubs.AnyAsync())
            {
                return BadRequest("Клуби вже існують. Видаліть їх перед створенням тестових.");
            }

            // Отримуємо адміністратора або першого користувача як творця клубів
            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null)
            {
                // Якщо користувач не автентифікований, використовуємо першого користувача з бази даних
                user = await _context.Profiles.FirstOrDefaultAsync();
                if (user == null)
                {
                    return BadRequest("Не знайдено користувача для створення клубів. Спочатку створіть хоча б одного користувача.");
                }
            }

            // Створюємо список тестових клубів
            var sampleClubs = new List<Club>
            {
                new Club
                {
                    Name = "Класична література",
                    Description = "Клуб для обговорення класичної літератури: від Шекспіра до Достоєвського та Толстого.",
                    Genre = "Класика",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow
                },
                new Club
                {
                    Name = "Фентезі та магія",
                    Description = "Місце для фанатів фентезі літератури. Обговорюємо все від Толкіна до сучасних авторів.",
                    Genre = "Фентезі",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-3)
                },
                new Club
                {
                    Name = "Наукова фантастика",
                    Description = "Дослідження майбутнього, космічні подорожі, альтернативні реальності та інші сценарії.",
                    Genre = "Наукова фантастика",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                },
                new Club
                {
                    Name = "Детективні історії",
                    Description = "Від Агати Крісті до сучасних трилерів. Обговорюємо найзахопливіші детективні твори.",
                    Genre = "Детектив",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-7)
                },
                new Club
                {
                    Name = "Українська література",
                    Description = "Клуб шанувальників української літератури. Обговорюємо класику і сучасних авторів.",
                    Genre = "Українська",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-10)
                },
                new Club
                {
                    Name = "Книги для саморозвитку",
                    Description = "Обговорення книг з психології, бізнесу, саморозвитку та продуктивності.",
                    Genre = "Саморозвиток",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-12)
                },
                new Club
                {
                    Name = "Поезія",
                    Description = "Для любителів поезії всіх напрямків і часів.",
                    Genre = "Поезія",
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-15)
                },
            };

            // Додаємо клуби в базу даних
            _context.Clubs.AddRange(sampleClubs);
            await _context.SaveChangesAsync();

            // Створюємо тестові теми для перших двох клубів
            var topics = new List<Topic>
            {
                new Topic
                {
                    Title = "Улюблені твори Шекспіра",
                    ClubId = sampleClubs[0].Id,
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1),
                    LastActivityAt = DateTime.UtcNow.AddHours(-12)
                },
                new Topic
                {
                    Title = "Достоєвський - ваші враження",
                    ClubId = sampleClubs[0].Id,
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    LastActivityAt = DateTime.UtcNow.AddHours(-36)
                },
                new Topic
                {
                    Title = "Володар перснів - читаємо разом",
                    ClubId = sampleClubs[1].Id,
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    LastActivityAt = DateTime.UtcNow.AddHours(-6)
                },
                new Topic
                {
                    Title = "Сучасні українські фентезі романи",
                    ClubId = sampleClubs[1].Id,
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-4),
                    LastActivityAt = DateTime.UtcNow.AddHours(-24)
                }
            };

            _context.Topics.AddRange(topics);
            await _context.SaveChangesAsync();

            // Додаємо коментарі до першої теми
            var comments = new List<Comment>
            {
                new Comment
                {
                    Text = "Мені найбільше подобається 'Гамлет'. Неперевершена драма з глибоким філософським підтекстом.",
                    TopicId = topics[0].Id,
                    UserId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1).AddHours(-2),
                    Likes = 3
                },
                new Comment
                {
                    Text = "А я люблю комедії Шекспіра, особливо 'Сон літньої ночі'!",
                    TopicId = topics[0].Id,
                    UserId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddDays(-1).AddHours(-1),
                    Likes = 2
                },
                new Comment
                {
                    Text = "Нещодавно перечитав 'Ромео і Джульєтту'. У дорослому віці зовсім інакше сприймається цей твір.",
                    TopicId = topics[0].Id,
                    UserId = user.Id,
                    CreatedAt = DateTime.UtcNow.AddHours(-12),
                    Likes = 1
                }
            };

            _context.Comments.AddRange(comments);
            await _context.SaveChangesAsync();

            return Ok(new 
            {
                message = "Тестові клуби, теми та коментарі успішно створені", 
                clubs = sampleClubs.Select(c => new { c.Id, c.Name, c.Genre }),
                topics = topics.Select(t => new { t.Id, t.Title, t.ClubId }),
                comments = comments.Count
            });
        }

        // DELETE: api/Community/Clubs/5
        [HttpDelete("Clubs/{id}")]
        public async Task<IActionResult> DeleteClub(int id)
        {
            var club = await _context.Clubs
                .Include(c => c.Topics)
                    .ThenInclude(t => t.Comments)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (club == null)
            {
                return NotFound();
            }

            // Перевірка, чи поточний користувач є власником клубу
            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null || club.CreatorId != user.Id)
            {
                return Forbid();
            }

            // Видалення всіх коментарів до тем клубу
            foreach (var topic in club.Topics)
            {
                _context.Comments.RemoveRange(topic.Comments);
            }

            // Видалення всіх тем клубу
            _context.Topics.RemoveRange(club.Topics);

            // Видалення самого клубу
            _context.Clubs.Remove(club);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Community/Topics/5
        [HttpGet("Topics/{id}")]
        public async Task<IActionResult> GetTopic(int id)
        {
            var topic = await _context.Topics
                .Include(t => t.Creator)
                .Include(t => t.Club)
                .Include(t => t.Comments)
                    .ThenInclude(c => c.User)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (topic == null)
            {
                return NotFound();
            }

            var result = new
            {
                topic.Id,
                topic.Title,
                Creator = topic.Creator.UserName,
                topic.CreatedAt,
                topic.LastActivityAt,
                Club = new
                {
                    topic.Club.Id,
                    topic.Club.Name
                },
                Comments = topic.Comments.Select(c => new
                {
                    c.Id,
                    c.Text,
                    User = new
                    {
                        c.User.Id,
                        c.User.UserName,
                        ProfilePicture = c.User.ProfilePicture
                    },
                    c.Likes,
                    c.CreatedAt,
                    UserLiked = false // За замовчуванням, може бути реалізовано в майбутньому
                }).OrderBy(c => c.CreatedAt)
            };

            return Ok(result);
        }

        // POST: api/Community/Topics
        [HttpPost("Topics")]
        public async Task<IActionResult> CreateTopic([FromBody] TopicCreateDto topic)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
                if (user == null)
                {
                    return BadRequest(new { error = "User not found. You must be logged in to create a topic." });
                }

                // Перевіряємо наявність клубу в базі даних
                var club = await _context.Clubs.FindAsync(topic.ClubId);
                if (club == null)
                {
                    return BadRequest(new { error = "Club not found" });
                }

                // Створюємо новий об'єкт Topic з отриманих даних
                var newTopic = new Topic
                {
                    Title = topic.Title,
                    ClubId = topic.ClubId,
                    CreatorId = user.Id,
                    CreatedAt = DateTime.UtcNow,
                    LastActivityAt = DateTime.UtcNow,
                    Comments = new List<Comment>()
                };

                _context.Topics.Add(newTopic);
                await _context.SaveChangesAsync();

                // Результат для відповіді клієнту
                var result = new
                {
                    newTopic.Id,
                    newTopic.Title,
                    newTopic.ClubId,
                    Creator = user.UserName,
                    newTopic.CreatedAt,
                    newTopic.LastActivityAt,
                    Club = new
                    {
                        club.Id,
                        club.Name,
                        club.Genre
                    }
                };

                return CreatedAtAction(nameof(GetTopic), new { id = newTopic.Id }, result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error creating topic: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return StatusCode(500, new { error = $"Internal server error: {ex.Message}" });
            }
        }

        // DELETE: api/Community/Topics/5
        [HttpDelete("Topics/{id}")]
        public async Task<IActionResult> DeleteTopic(int id)
        {
            var topic = await _context.Topics
                .Include(t => t.Comments)
                .Include(t => t.Creator)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (topic == null)
            {
                return NotFound();
            }

            // Перевірка, чи поточний користувач є власником теми
            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null || (topic.CreatorId != user.Id && !User.IsInRole("Admin")))
            {
                return Forbid();
            }

            // Видалення всіх коментарів теми
            _context.Comments.RemoveRange(topic.Comments);

            // Видалення самої теми
            _context.Topics.Remove(topic);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Community/Comments
        [HttpPost("Comments")]
        public async Task<IActionResult> AddComment([FromBody] CommentCreateDto commentDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null)
            {
                return BadRequest(new { error = "User not found. You must be logged in to add a comment." });
            }

            var topic = await _context.Topics.FindAsync(commentDto.TopicId);
            if (topic == null)
            {
                return BadRequest(new { error = "Topic not found" });
            }

            if (commentDto.ReplyToCommentId.HasValue)
            {
                var replyTo = await _context.Comments.FindAsync(commentDto.ReplyToCommentId.Value);
                if (replyTo == null)
                {
                    return BadRequest(new { error = "Reply to comment not found" });
                }
            }

            var comment = new Comment
            {
                Text = commentDto.Text,
                TopicId = commentDto.TopicId,
                ReplyToCommentId = commentDto.ReplyToCommentId,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                Likes = 0
            };

            _context.Comments.Add(comment);
            topic.LastActivityAt = DateTime.UtcNow;
            _context.Entry(topic).State = EntityState.Modified;

            await _context.SaveChangesAsync();

            var result = new
            {
                comment.Id,
                comment.Text,
                User = new
                {
                    user.Id,
                    user.UserName,
                    ProfilePicture = user.ProfilePicture
                },
                comment.Likes,
                comment.CreatedAt,
                comment.TopicId,
                comment.ReplyToCommentId,
                UserLiked = false
            };

            return Ok(result);
        }

        // DELETE: api/Community/Comments/5
        [HttpDelete("Comments/{id}")]
        public async Task<IActionResult> DeleteComment(int id)
        {
            var comment = await _context.Comments
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (comment == null)
            {
                return NotFound();
            }

            // Перевірка, чи поточний користувач є власником коментаря
            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null || (comment.UserId != user.Id && !User.IsInRole("Admin")))
            {
                return Forbid();
            }

            _context.Comments.Remove(comment);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/Community/Comments/5/Like
        [HttpPost("Comments/{id}/Like")]
        public async Task<IActionResult> LikeComment(int id)
        {
            var comment = await _context.Comments.FindAsync(id);
            if (comment == null)
            {
                return NotFound();
            }

            comment.Likes += 1;
            _context.Entry(comment).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { comment.Likes });
        }

        // GET: api/Community/MyClubs
        [HttpGet("MyClubs")]
        public async Task<IActionResult> GetMyClubs()
        {
            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null)
            {
                return BadRequest("User not found");
            }

            var clubs = await _context.Clubs
                .Include(c => c.Creator)
                .Where(c => c.CreatorId == user.Id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.Genre,
                    c.Image,
                    Creator = c.Creator.UserName,
                    CreatedAt = c.CreatedAt,
                    TopicsCount = c.Topics.Count
                })
                .ToListAsync();

            return Ok(clubs);
        }

        // GET: api/Community/RecentTopics
        [HttpGet("RecentTopics")]
        public async Task<IActionResult> GetRecentTopics()
        {
            var topics = await _context.Topics
                .Include(t => t.Creator)
                .Include(t => t.Club)
                .OrderByDescending(t => t.LastActivityAt)
                .Take(20)
                .Select(t => new
                {
                    t.Id,
                    t.Title,
                    Creator = t.Creator.UserName,
                    t.CreatedAt,
                    t.LastActivityAt,
                    CommentsCount = t.Comments.Count,
                    Club = new
                    {
                        t.Club.Id,
                        t.Club.Name,
                        t.Club.Genre
                    }
                })
                .ToListAsync();

            return Ok(topics);
        }

        // POST: api/Community/Clubs/{id}/Join
        [HttpPost("Clubs/{id}/Join")]
        public async Task<IActionResult> JoinClub(int id)
        {
            var user = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);
            if (user == null)
            {
                return BadRequest(new { error = "User not found. You must be logged in to join a club." });
            }
            var profile = await _context.Profiles.FirstOrDefaultAsync(u => u.UserName == _userName);

            var club = await _context.Clubs.FirstOrDefaultAsync(x => x.Id == id);
            if (club == null)
            {
                return NotFound(new { error = "Club not found." });
            }

            var existingMembership = await _context.GroupMembers.FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == user.Id);
            if (existingMembership != null)
            {
                return BadRequest(new { error = "You are already a member of this club." });
            }

            var membership = new ClubMembers
            {
                ClubId = id,
                UserId = profile.Id,
                UserProfile = profile,
                Club = club,
            };

            _context.ClubMembers.Add(membership);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Successfully joined the club." });
        }
    }
}
