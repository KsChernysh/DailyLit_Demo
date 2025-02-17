using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyLit.Server.Migrations
{
    /// <inheritdoc />
    public partial class extendedEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Genre",
                table: "BooksCollection",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Genre",
                table: "BooksCollection");
        }
    }
}
