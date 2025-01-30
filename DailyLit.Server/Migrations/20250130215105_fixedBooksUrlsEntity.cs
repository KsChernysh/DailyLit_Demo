using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyLit.Server.Migrations
{
    /// <inheritdoc />
    public partial class fixedBooksUrlsEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Key",
                table: "BooksCollection",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Key",
                table: "BooksCollection");
        }
    }
}
