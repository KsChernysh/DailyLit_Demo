
using DailyLit.Server.Data;

namespace DailyLit.Server.Repository
{
    public class UserManagerRepository : IUserManagerRepository
    {
        private readonly ApplicationDbContext _dbContext;
        public UserManagerRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext;
        }


        public List<string> GetBooks()
        {
           return _dbContext.Books.Select(x => x.Title).ToList();

        }
    }
}
