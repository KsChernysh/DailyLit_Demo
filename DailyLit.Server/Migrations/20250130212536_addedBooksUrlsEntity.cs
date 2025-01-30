using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyLit.Server.Migrations
{
    /// <inheritdoc />
    public partial class addedBooksUrlsEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BooksCollection",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Author = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Cover_Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ShelfId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BooksCollection", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BooksCollection_Shelfs_ShelfId",
                        column: x => x.ShelfId,
                        principalTable: "Shelfs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BooksCollection_ShelfId",
                table: "BooksCollection",
                column: "ShelfId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BooksCollection");
        }
    }
}
