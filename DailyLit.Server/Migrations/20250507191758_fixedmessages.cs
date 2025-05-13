using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyLit.Server.Migrations
{
    /// <inheritdoc />
    public partial class fixedmessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Messages",
                newName: "UserName");

            migrationBuilder.AlterColumn<string>(
                name: "BookId",
                table: "Messages",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "UserName",
                table: "Messages",
                newName: "UserId");

            migrationBuilder.AlterColumn<int>(
                name: "BookId",
                table: "Messages",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}
