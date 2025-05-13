
using DailyLit.Server.Data;
using DailyLit.Server.Models;
using DailyLit.Server.Profiles;

namespace DailyLit.Server.Repository
{
    public class UserManagerRepository : IUserManagerRepository
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IHttpContextAccessor httpContextAccessor;
        public UserManagerRepository(ApplicationDbContext dbContext, IHttpContextAccessor httpContextAccessor)
        {
            _dbContext = dbContext;
            this.httpContextAccessor = httpContextAccessor;
        }

        public ProfileViewModel EditProfile(ProfileViewModel userProfile)
        {
            var userName = httpContextAccessor.HttpContext.User.Identity.Name;
            if (userName == null)
            {
                return null;
            }
            var user = _dbContext.Profiles.FirstOrDefault(x => x.UserName == userName);

            user.NickName = userProfile.NickName;
            user.Email = userProfile.Email;
            user.ProfilePicture = userProfile.ProfilePicture;
            user.Bio = userProfile.Bio;
            user.Goal = userProfile.Goal;
            user.Read = userProfile.Read;
            _dbContext.SaveChanges();
            return userProfile;
        }

        public List<string> GetBooks()
        {
            return _dbContext.Books.Select(x => x.Title).ToList();

        }

        public UserProfile GetProfile()
        {
            var username = httpContextAccessor.HttpContext.User.Identity.Name;
            var userProfile = _dbContext.Profiles.FirstOrDefault(x => x.UserName == username);
            if (userProfile == null)
            {
                _dbContext.Profiles.Add(new UserProfile { UserName = username });
                _dbContext.SaveChanges();
            }
            return _dbContext.Profiles.FirstOrDefault(x => x.UserName == username);
        }
        public string GetUserName()
        {
            var userName = httpContextAccessor.HttpContext.User.Identity.Name;
            if (userName == null)
            {
                return null;
            }
            return userName;
        }
    }
    }