namespace DailyLit.Server.Models
{
    public class UserProfile
    {
     public int Id { get; set; }
     public string UserName { get; set; }
     public string? Email { get; set; }
     public string? NickName { get; set; }
    public byte[]? ProfilePicture { get; set; }
    public string? Bio { get; set; }
    public int? Goal { get; set; }
    public int? Read { get; set; }


    }
}
