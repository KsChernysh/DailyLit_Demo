using Room4U.Server.Models.Auth;
using Microsoft.AspNetCore.Mvc;

namespace DailyLit.Server.Repository
{
    public interface IAuthService
    {
        public Task<string> RegisterAsync(RegisterModel model);
        public Task<string> SignInAsync(LoginModel loginModel);
        public bool SignOut();
        public string GetUserRole();
    }
}
