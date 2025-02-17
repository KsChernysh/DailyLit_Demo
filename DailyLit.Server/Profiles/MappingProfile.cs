namespace DailyLit.Server.Profiles
{
    using AutoMapper;
    using DailyLit.Server.Models;

    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<BooksViewModel, BookUrls>().ReverseMap();
        }
    }

}
