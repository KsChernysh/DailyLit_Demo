namespace DailyLit.Server.Models
{
    public class Users
    {
     public int Id { get; set; }
     public string Username { get; set; }
     public string Password { get; set; }
     public string Email { get; set; }
     public string NickName { get; set; }
    public byte[]? ProfilePicture { get; set; }
    public string Bio { get; set; }
    public int Goal { get; set; }
    public int Read { get; set; }


    }
}
