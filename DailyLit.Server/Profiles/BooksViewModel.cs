namespace DailyLit.Server.Profiles
{
    public class BooksViewModel
    {
        public string Title { get; set; }
        public string Author { get; set; }
        public string Cover_Url { get; set; }
        public string Key { get; set; }
        public string? Status { get; set; }
        public string? Rating { get; set; }
        public DateTime? BooksAdded { get; set; }
        public DateTime? DateRead { get; set; }


    }
}
