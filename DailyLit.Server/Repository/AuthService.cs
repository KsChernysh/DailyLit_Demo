
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Room4U.Server.Models.Auth;
using Room4U.Server.Models;
using DailyLit.Server.Data;

namespace DailyLit.Server.Repository
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext context;
        private readonly IHttpContextAccessor httpContextAccessor;
        private readonly UserManager<IdentityUser> userManager;
        public AuthService(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor, UserManager<IdentityUser> userManager)
        {
            this.context = context;
            this.httpContextAccessor = httpContextAccessor;
            this.userManager = userManager;
        }

        public async Task<string> RegisterAsync(RegisterModel registerModel)
        {
            var user = new IdentityUser
            {
                UserName = registerModel.UserName
            };
            var userExists = await userManager.FindByNameAsync(registerModel.UserName);
            if (userExists != null)
            {
                return "The user already exists";
            }
            var result = await userManager.CreateAsync(user, registerModel.Password);
            if (result.Succeeded)
            {
                var createdUser = await userManager.FindByNameAsync(registerModel.UserName);



                await SignInAsync(new LoginModel
                {
                    UserName = registerModel.UserName,
                    Password = registerModel.Password
                });
            }
            else
            {
                return result.Errors.ToString();
            }
            return "";
        }

        public async Task<string> SignInAsync(LoginModel loginModel)
        {
            var hasher = new PasswordHasher<IdentityUser>();
            var user = context.Users.FirstOrDefault(x => x.UserName == loginModel.UserName);

            if (user is null)
            {
                return "The user doesn't exists";
            }

            var isCorrectPassword = hasher.VerifyHashedPassword(user, user.PasswordHash, loginModel.Password);

            if (isCorrectPassword != PasswordVerificationResult.Success)
            {
                return "Wrong password";
            }

            var role = await userManager.GetRolesAsync(user);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.UserName),
                new Claim(ClaimTypes.Role, role.FirstOrDefault() ?? "User")
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

            var httpContext = httpContextAccessor.HttpContext;
            if (httpContext != null)
            {
                await httpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(identity),
                    new AuthenticationProperties
                    {
                        IsPersistent = true,
                        AllowRefresh = true,
                        ExpiresUtc = DateTimeOffset.UtcNow.AddHours(24),
                    });
            }

            return "";
        }
        
        public bool SignOut()
        {
            var result = httpContextAccessor.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (result.IsCompletedSuccessfully)
            {
                return true;
            }
            return false;
        }

        public string GetUserRole()
        {
            var role = httpContextAccessor.HttpContext.User.FindFirst(ClaimTypes.Role)?.Value;
            return role;
        }
    }
}
