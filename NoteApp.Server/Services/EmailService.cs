using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MimeKit;
using MimeKit.Text;

namespace NoteApp.Server.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        // public async Task SendEmailAsync(string email, string subject, string htmlMessage)
        // {
        //     try
        //     {
        //         _logger.LogInformation("Preparing to send email to {Email}", email);

        //         // Validate email
        //         if (!MailboxAddress.TryParse(email, out var _))
        //         {
        //             throw new ArgumentException($"Invalid email address: {email}");
        //         }

        //         var message = new MimeMessage();
        //         message.From.Add(new MailboxAddress(
        //             _config["EmailSettings:FromName"] ?? "NoteApp Support",
        //             _config["EmailSettings:FromAddress"] ?? throw new ArgumentNullException("FromAddress is not configured")));
        //         message.To.Add(MailboxAddress.Parse(email));
        //         message.Subject = subject;
        //         message.Body = new TextPart(TextFormat.Html) { Text = htmlMessage };

        //         using var client = new SmtpClient();

        //         // Configure connection timeout
        //         client.Timeout = 30000; // 30 seconds

        //         var host = _config["EmailSettings:SmtpServer"];
        //         var port = int.Parse(_config["EmailSettings:SmtpPort"]);
        //         var username = _config["EmailSettings:SmtpUsername"];
        //         var password = _config["EmailSettings:SmtpPassword"];

        //         _logger.LogInformation("Connecting to {Host}:{Port}", host, port);

        //         try
        //         {
        //             // Try STARTTLS first
        //             await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        //         }
        //         catch
        //         {
        //             // Fallback to SSL if STARTTLS fails
        //             await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
        //         }

        //         client.AuthenticationMechanisms.Remove("XOAUTH2");

        //         _logger.LogInformation("Authenticating...");
        //         await client.AuthenticateAsync(username, password);

        //         _logger.LogInformation("Sending email...");
        //         await client.SendAsync(message);

        //         _logger.LogInformation("Email sent successfully");
        //     }
        //     catch (AuthenticationException authEx)
        //     {
        //         _logger.LogError(authEx, "Authentication failed");
        //         throw new Exception("Email authentication failed. Please check your credentials.");
        //     }
        //     catch (SmtpCommandException smtpEx)
        //     {
        //         _logger.LogError(smtpEx, "SMTP Error: {Status}", smtpEx.StatusCode);
        //         throw new Exception("Email service error. Please try again later.");
        //     }
        //     catch (IOException ioEx)
        //     {
        //         _logger.LogError(ioEx, "Connection error");
        //         throw new Exception("Could not connect to email server. Check your network connection.");
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Email sending failed");
        //         throw new Exception($"Failed to send email: {ex.Message}");
        //     }
        // }

        public async Task SendEmailAsync(string email, string subject, string htmlMessage)
        {
            try
            {
                _logger.LogInformation("Preparing to send email to {Email}", email);

                if (!MailboxAddress.TryParse(email, out var _))
                {
                    throw new ArgumentException($"Invalid email address: {email}");
                }

                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(
                    _config["EmailSettings:FromName"] ?? "NoteApp",
                    _config["EmailSettings:FromAddress"] ?? "noreply@yourdomain.com"));

                message.To.Add(MailboxAddress.Parse(email));
                message.Subject = subject;
                message.Body = new TextPart(TextFormat.Html) { Text = htmlMessage };


                message.Headers.Add("X-Auto-Response-Suppress", "All");
                message.Headers.Add("Auto-Submitted", "auto-generated");
                message.Headers.Add("Precedence", "bulk"); 

                using var client = new SmtpClient();
                client.Timeout = 30000;

                var host = _config["EmailSettings:SmtpServer"];
                var port = int.Parse(_config["EmailSettings:SmtpPort"] ?? "587"); 
                var username = _config["EmailSettings:SmtpUsername"];
                var password = _config["EmailSettings:SmtpPassword"];

                _logger.LogInformation("Connecting to {Host}:{Port}", host, port);


                try
                {
                    await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
                }
                catch
                {
                    await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
                }

                client.AuthenticationMechanisms.Remove("XOAUTH2");

                _logger.LogInformation("Authenticating as {Username}...", username);
                await client.AuthenticateAsync(username, password);

                _logger.LogInformation("Sending email...");
                await client.SendAsync(message);

                _logger.LogInformation("Email sent successfully from {FromAddress}",
                    _config["EmailSettings:FromAddress"]);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email sending failed");
                throw; 
            }
        }



    }
}

