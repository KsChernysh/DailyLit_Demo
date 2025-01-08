using DailyLit.Server.Profiles;
using DailyLit.Server.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DailyLit.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly IUserManagerRepository userManager;

        public ProfileController(IUserManagerRepository userManager)
        {
            this.userManager = userManager;
        }

        [HttpGet("profile")]
        public IActionResult GetProfile()
        {
            var user = userManager.GetProfile();
            if (user == null)
            {
                return NotFound("User profile not found.");
            }
            var profile = new ProfileViewModel
            {
                UserName = user.UserName,
                Email = user.Email,
                NickName = user.NickName,
                ProfilePicture = user.ProfilePicture,
                Bio = user.Bio,
                Goal = user.Goal,
                Read = user.Read

            };
            return Ok(profile);
        }

        [HttpPost("edit")]
        public IActionResult EditProfile(ProfileViewModel userProfile)
        {

           var user = userManager.EditProfile(userProfile);

            return Ok(user);
        }
    }
}
