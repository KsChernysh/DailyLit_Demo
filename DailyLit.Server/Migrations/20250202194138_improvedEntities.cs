using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyLit.Server.Migrations
{
    /// <inheritdoc />
    public partial class improvedEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "BooksAdded",
                table: "BooksCollection",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateRead",
                table: "BooksCollection",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Rating",
                table: "BooksCollection",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "BooksCollection",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BooksAdded",
                table: "BooksCollection");

            migrationBuilder.DropColumn(
                name: "DateRead",
                table: "BooksCollection");

            migrationBuilder.DropColumn(
                name: "Rating",
                table: "BooksCollection");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "BooksCollection");
        }
    }
}
