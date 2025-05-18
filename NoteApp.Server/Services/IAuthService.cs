﻿using System.Security.Claims;

namespace NoteApp.Server.Services
{
    public interface IAuthService
    {
        string GenerateJwtToken(User user);
        string GenerateRefreshToken();
        string GeneratePasswordResetToken(); 
        Task<string?> Login(string username, string password);
        Task<User> Register(string username, string password);
        bool VerifyToken(string token);
        Task<User?> Authenticate(string username, string password);
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
    }
}