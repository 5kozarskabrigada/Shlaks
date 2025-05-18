using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NoteApp.Server.Data;
using NoteApp.Server.Models;
using System.Text.Json;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<NotesController> _logger;


    public NotesController(AppDbContext context, ILogger<NotesController> logger)
    {
        _context = context;
        _logger = logger;
    }


    [HttpPost]
    public async Task<ActionResult<Note>> CreateNote([FromBody] CreateNoteDto dto)
    {
        try
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId))
            {
                return Unauthorized("Invalid user ID");
            }
            var email = User.FindFirst(ClaimTypes.Email)?.Value;

            if (string.IsNullOrEmpty(email))
            {
                _logger.LogWarning("Email claim is missing in the JWT token.");
                return Unauthorized("Email not found in token.");
            }





            var note = new Note
            {
                Title = dto.Title,
                EncryptedContent = dto.EncryptedContent,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                Email = email
            };


            _context.Notes.Add(note);
            await _context.SaveChangesAsync();


            return Ok(new Note
            {
                Id = note.Id,
                Title = note.Title,
                EncryptedContent = note.EncryptedContent,
                CreatedAt = note.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating note");
            return StatusCode(500, $"Error creating note: {ex.Message}"); // Return actual error
        }
    }

        // [HttpPost]
        // public async Task<ActionResult<Note>> CreateNote([FromBody] CreateNoteDto dto)
        // {
        //     try
        //     {
        //         _logger.LogInformation("CreateNote started");
        //         var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        //         _logger.LogInformation($"User ID string: {userIdStr}");

        //         if (!int.TryParse(userIdStr, out var userId))
        //         {
        //             _logger.LogWarning("Invalid user ID format");
        //             return Unauthorized("Invalid user ID");
        //         }

        //         _logger.LogInformation($"Creating note for user {userId}. Title length: {dto.Title?.Length}, Content length: {dto.EncryptedContent?.Length}");

        //         var note = new Note
        //         {
        //             Title = dto.Title,
        //             EncryptedContent = dto.EncryptedContent,
        //             UserId = userId,
        //             CreatedAt = DateTime.UtcNow
        //         };

        //         _context.Notes.Add(note);
        //         await _context.SaveChangesAsync();

        //         _logger.LogInformation($"Note created successfully. ID: {note.Id}");

        //         return Ok(new Note
        //         {
        //             Id = note.Id,
        //             Title = note.Title,
        //             EncryptedContent = note.EncryptedContent,
        //             CreatedAt = note.CreatedAt
        //         });
        //     }
        //     catch (Exception ex)
        //     {
        //         _logger.LogError(ex, "Error creating note");
        //         return StatusCode(500, $"Error creating note: {ex.Message}"); // Return actual error
        //     }
        // }




        [HttpGet]
    public async Task<ActionResult<IEnumerable<Note>>> GetUserNotes()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized("Invalid user ID");
        }




        var notes = await _context.Notes
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new Note
            {
                Id = n.Id,
                Title = n.Title,
                EncryptedContent = n.EncryptedContent,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();


        return Ok(notes);
    }


    [HttpGet("{id}")]
    public async Task<ActionResult<Note>> GetNote(int id)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdStr, out var userId))
        {
            return Unauthorized("Invalid user ID");
        }




        var note = await _context.Notes
            .Where(n => n.Id == id && n.UserId == userId)
            .Select(n => new Note
            {
                Id = n.Id,
                Title = n.Title,
                EncryptedContent = n.EncryptedContent,
                CreatedAt = n.CreatedAt
            })
            .FirstOrDefaultAsync();


        return note != null ? Ok(note) : NotFound();
    }
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        try
        {
            _logger.LogInformation($"Attempting to delete note with ID: {id}");

            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId))
            {
                _logger.LogWarning("Invalid user ID format");
                return Unauthorized("Invalid user ID");
            }

            _logger.LogInformation($"User ID: {userId} attempting to delete note {id}");

            var note = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (note == null)
            {
                _logger.LogWarning($"Note not found or doesn't belong to user. Note ID: {id}, User ID: {userId}");
                return NotFound();
            }

            _context.Notes.Remove(note);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Successfully deleted note ID: {id}");
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error deleting note ID: {id}");
            return StatusCode(500, "Error deleting note");
        }
    }

    [HttpPost("upload-image")]
    [Authorize]
    public async Task<IActionResult> UploadImage([FromBody] ImageUploadDto uploadDto)
    {
        try
        {
            
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId))
            {
                return Unauthorized(new { message = "Invalid user ID" });
            }

            // Validate input
            if (string.IsNullOrEmpty(uploadDto?.ImageData))
            {
                return BadRequest(new { message = "No image data received" });
            }

            
            string base64Data;
            if (uploadDto.ImageData.Contains(','))
            {
                base64Data = uploadDto.ImageData.Split(',')[1];
            }
            else
            {
                base64Data = uploadDto.ImageData;
            }

            
            var imageBytes = Convert.FromBase64String(base64Data);

            
            var uploadsDir = Path.Combine("wwwroot", "uploads");
            Directory.CreateDirectory(uploadsDir);

            
            var fileName = $"img-{Guid.NewGuid()}.png";
            var filePath = Path.Combine(uploadsDir, fileName);

            await System.IO.File.WriteAllBytesAsync(filePath, imageBytes);

            return Ok(new
            {
                imageUrl = $"{Request.Scheme}://{Request.Host}/uploads/{fileName}",

                message = "Image uploaded successfully"
            });
        }
        catch (FormatException)
        {
            return BadRequest(new { message = "Invalid base64 image data" });
        }
        catch (Exception ex)
        {
           
            _logger.LogError(ex, "Image upload failed");
            return StatusCode(500, new { message = "Image upload failed. Please try again." });
        }
    }




















    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateNote(int id, [FromBody] CreateNoteDto dto)
    {
        try
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out var userId))
            {
                return Unauthorized("Invalid user ID");
            }

            var existingNote = await _context.Notes
                .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

            if (existingNote == null)
            {
                return NotFound("Note not found.");
            }

            existingNote.Title = dto.Title;
            existingNote.EncryptedContent = dto.EncryptedContent;

            await _context.SaveChangesAsync();

            return Ok(new Note
            {
                Id = existingNote.Id,
                Title = existingNote.Title,
                EncryptedContent = existingNote.EncryptedContent,
                CreatedAt = existingNote.CreatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating note");
            return StatusCode(500, "Internal server error while updating note");
        }
    }













}

//     public class NoteResponse
// {
//     public int Id { get; set; }
//     public string? Title { get; set; }
//     public string? EncryptedContent { get; set; }
//     public DateTime CreatedAt { get; set; }
// }





