﻿using DailyLit.Server.Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Room4U.Server.Models.Auth;
using System.Security.Claims;

namespace DailyLit.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService authService;
        public AuthController(IAuthService authService)
        {
            this.authService = authService;
        }
        [HttpPost("register")]
        public async Task<IActionResult> RegisterAsync(RegisterModel registerModel)
        {
            var result = await authService.RegisterAsync(registerModel);
            if (result == "")
            {
                return Ok();
            }
            return BadRequest(result);
        }
        [HttpPost("login")]
        public async Task<IActionResult> LoginAsync(LoginModel loginModel)
        {
            var result = await authService.SignInAsync(loginModel);
            if (result == "")
            {
                return Ok();
            }
            return BadRequest(result);
        }
        [HttpGet("logout")]
        public async Task<IActionResult> LogoutAsync()
        {
            if (authService.SignOut())
            {
                return Ok();
            };
            return BadRequest();
        }
        // У вашому AuthController
        [Authorize]
        [HttpGet("user")]
        public IActionResult GetCurrentUser()
        {
            var userId = "11";
            var username = User.FindFirst(ClaimTypes.Name)?.Value;

            if ( string.IsNullOrEmpty(username))
            {
                return Unauthorized();
            }

            return Ok(new { id = int.Parse(userId), username });
        }

        [HttpGet("check")]
        public IActionResult CheckAuthStatus()
        {
            return Ok(User.Identity?.IsAuthenticated ?? false);
        }
    }
}
