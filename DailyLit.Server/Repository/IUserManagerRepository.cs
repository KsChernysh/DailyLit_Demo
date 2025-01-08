using DailyLit.Server.Models;
using DailyLit.Server.Profiles;

namespace DailyLit.Server.Repository
{
    public interface IUserManagerRepository
    {
        public ProfileViewModel EditProfile(ProfileViewModel userProfile);
        public List<String> GetBooks();
        public UserProfile GetProfile();
    }
}
