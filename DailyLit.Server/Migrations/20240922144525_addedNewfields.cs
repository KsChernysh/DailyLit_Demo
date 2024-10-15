using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyLit.Server.Migrations
{
    /// <inheritdoc />
    public partial class addedNewfields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "GroupsId",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "Image",
                table: "Groups",
                type: "varbinary(max)",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "BookCover",
                table: "BothReads",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Progress",
                table: "BothReads",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Rating",
                table: "Books",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Users_GroupsId",
                table: "Users",
                column: "GroupsId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Groups_GroupsId",
                table: "Users",
                column: "GroupsId",
                principalTable: "Groups",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Groups_GroupsId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_GroupsId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GroupsId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Image",
                table: "Groups");

            migrationBuilder.DropColumn(
                name: "BookCover",
                table: "BothReads");

            migrationBuilder.DropColumn(
                name: "Progress",
                table: "BothReads");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "Books");
        }
    }
}
