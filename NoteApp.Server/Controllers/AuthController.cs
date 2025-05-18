using Microsoft.AspNetCore.Mvc;
using NoteApp.Server.Data;
using NoteApp.Server.DTOs;
using NoteApp.Server.Models;
using NoteApp.Server.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
namespace NoteApp.Server.Controllers
{using Microsoft.AspNetCore.Authorization;


    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuthService _authService;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailService _emailService;

        public AuthController(AppDbContext context, IAuthService authService, IConfiguration config, ILogger<AuthController> logger,IEmailService emailService)
        {
            _context = context;
            _authService = authService;
            _config = config;
            _logger = logger;
            _emailService = emailService;
        }





        [HttpPost("register")]
        public async Task<IActionResult> Register(UserRegisterDTO dto)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
                return BadRequest("Username already exists");

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest("Email already used");

            if (string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("Password is required");


            using var hmac = new HMACSHA512();
            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
                PasswordSalt = hmac.Key
            };


            _context.Users.Add(user);
            await _context.SaveChangesAsync();


            return Ok(new { Message = "Registration successful" });
        }


    //     [HttpPost("register")]
    //     public async Task<IActionResult> Register(UserRegisterDTO dto)
    //     {
    //         if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
    //             return BadRequest("Username already exists");

    //         if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
    //             return BadRequest("Email already used");

    //         using var hmac = new HMACSHA512();
    //         var verificationToken = _authService.GenerateEmailVerificationToken();

    //         var user = new User
    //         {
    //             Username = dto.Username,
    //             Email = dto.Email,
    //             PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.Password)),
    //             PasswordSalt = hmac.Key,
    //             EmailVerificationToken = verificationToken,
    //             EmailVerificationTokenExpiry = DateTime.UtcNow.AddDays(1) // 1 day expiry
    //         };

    //         _context.Users.Add(user);
    //         await _context.SaveChangesAsync();

    //         // Send verification email
    //         var baseUrl = _config["ClientApp:BaseUrl"]?.TrimEnd('/') ?? $"{Request.Scheme}://{Request.Host}";
    //         var verificationLink = $"{baseUrl}/verify-email?token={verificationToken}";

    //         var emailBody = $@"
    // <div style='font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #07070a; color: #f5edf5; padding: 30px; border-radius: 10px; border: 1px solid #3a2b47;'>
    //     <h2 style='color: #b183d4; font-family: Calibri; margin-bottom: 20px;'>Verify Your Email</h2>
    //     <p style='margin-bottom: 15px;'>Hello {user.Username},</p>
    //     <p style='margin-bottom: 20px;'>Thank you for registering! Please verify your email address by clicking the button below:</p>
        
    //     <div style='margin: 25px 0; text-align: center;'>
    //         <a href='{verificationLink}' 
    //            style='background-color: #b183d4; color: white; padding: 15px 30px; 
    //                   text-decoration: none; border-radius: 5px; display: inline-block;
    //                   font-size: 16px; font-weight: bold; transition: background-color 0.3s;'>
    //             Verify Email
    //         </a>
    //     </div>

    //     <p style='color: #aaa; font-size: 14px; margin-bottom: 20px;'>
    //         This link expires in 24 hours. If you didn't create an account, please ignore this email.
    //     </p>
    // </div>";

    //         await _emailService.SendEmailAsync(
    //             user.Email,
    //             "Verify Your Email Address",
    //             emailBody);

    //         return Ok(new { Message = "Registration successful. Please check your email for verification instructions." });
    //     }






        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDTO model)
        {
            var user = await _authService.Authenticate(model.Username, model.Password);
            if (user == null)
                return Unauthorized("Invalid credentials");


            var token = _authService.GenerateJwtToken(user);
            var refreshToken = _authService.GenerateRefreshToken();


            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshTokenExpirationDays"));
            await _context.SaveChangesAsync();


            return Ok(new
            {
                accessToken = token,
                refreshToken,
                username = user.Username,
                userId = user.Id
            });
        }










        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDTO request)
        {
            var principal = _authService.GetPrincipalFromExpiredToken(request.AccessToken ?? string.Empty);
            var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);


            if (!int.TryParse(userId, out var userIdInt))
                return BadRequest("Invalid user ID in token");


            var user = await _context.Users.FindAsync(userIdInt);
            if (user == null || user.RefreshToken != request.RefreshToken ||
                user.RefreshTokenExpiry <= DateTime.UtcNow)
                return Unauthorized("Invalid refresh token");


            var newToken = _authService.GenerateJwtToken(user);
            var newRefreshToken = _authService.GenerateRefreshToken();


            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_config.GetValue<int>("Jwt:RefreshTokenExpirationDays"));
            await _context.SaveChangesAsync();


            return Ok(new
            {
                accessToken = newToken,
                refreshToken = newRefreshToken
            });
        }





        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            try
            {
                _logger.LogInformation("Password reset requested for email: {Email}", dto.Email);

                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (user == null)
                {
                    return Ok(new { Message = "If an account exists with this email, a reset link has been sent." });
                }

                var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
                user.PasswordResetToken = resetToken;
                user.ResetTokenExpires = DateTime.UtcNow.AddHours(1);
                await _context.SaveChangesAsync();

               
                var baseUrl = _config["ClientApp:BaseUrl"]?.TrimEnd('/');
                if (string.IsNullOrEmpty(baseUrl))
                {
                    
                    var request = HttpContext.Request;
                    baseUrl = $"{request.Scheme}://{request.Host}";
                    _logger.LogWarning("ClientApp:BaseUrl not configured, falling back to: {BaseUrl}", baseUrl);
                }

                
                var resetLink = $"{baseUrl}/reset-password?token={resetToken}";

                
                if (!Uri.TryCreate(resetLink, UriKind.Absolute, out _))
                {
                    throw new Exception($"Invalid reset link format: {resetLink}");
                }

                var emailBody = $@"
            <div style='font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #07070a; color: #f5edf5; padding: 30px; border-radius: 10px; border: 1px solid #3a2b47;'>
    <h2 style='color: #b183d4; font-family: Calibri; margin-bottom: 20px;'>Password Reset Request</h2>
    <p style='margin-bottom: 15px;'>Hello {user.Username},</p>
    <p style='margin-bottom: 20px;'>We received a request to reset your password. Click the button below to proceed:</p>
    
    <div style='margin: 25px 0; text-align: center;'>
        <a href='{resetLink}' 
           style='background-color: #b183d4; color: white; padding: 15px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;
                  font-size: 16px; font-weight: bold; transition: background-color 0.3s;'>
            Reset Password
        </a>
    </div>

    <p style='color: #aaa; font-size: 14px; margin-bottom: 20px;'>
        This link expires in 1 hour. If you didn't request this, please ignore this email.
    </p>
    
    <div style='background-color: #1e1e1e; padding: 15px; border-radius: 5px; border: 1px solid #3a2b47; margin-bottom: 20px;'>
        <p style='color: #aaa; font-size: 12px; margin: 0;'>
            Can't click the button? Copy this link:<br>
            <span style='color: #cabee9; word-break: break-all;'>{resetLink}</span>
        </p>
    </div>

    <p style='color: #aaa; font-size: 12px; border-top: 1px solid #3a2b47; padding-top: 20px; margin-top: 20px;'>
        For security reasons, please don't forward this email to anyone.
    </p>
</div>";

                await _emailService.SendEmailAsync(
                    user.Email,
                    "Password Reset Request",
                    emailBody);

                return Ok(new { Message = "Password reset link sent to your email" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ForgotPassword");
                return StatusCode(500, new
                {
                    Message = "We couldn't process your request. Please try again later.",
                    Details = ex.Message
                });
            }
        }






        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.PasswordResetToken == dto.Token &&
                u.ResetTokenExpires > DateTime.UtcNow);

            if (user == null)
                return BadRequest("Invalid or expired token");

            using var hmac = new HMACSHA512();
            user.PasswordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.NewPassword));
            user.PasswordSalt = hmac.Key;
            user.PasswordResetToken = null;
            user.ResetTokenExpires = null;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Password reset successful" });
        }





        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
            {
                return BadRequest("New password and confirmation don't match");
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userId, out var userIdInt))
                return BadRequest("Invalid user ID");

            var user = await _context.Users.FindAsync(userIdInt);
            if (user == null)
                return NotFound("User not found");

           
            using var hmac = new HMACSHA512(user.PasswordSalt);
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(dto.OldPassword));
            if (!computedHash.SequenceEqual(user.PasswordHash))
                return BadRequest("Old password is incorrect");

           
            using var newHmac = new HMACSHA512();
            user.PasswordHash = newHmac.ComputeHash(Encoding.UTF8.GetBytes(dto.NewPassword));
            user.PasswordSalt = newHmac.Key;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Password changed successfully" });
        }













    }






    
}

