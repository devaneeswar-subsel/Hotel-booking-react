/*
 * S-01: write the database structure (no data) to backend/schema.sql.
 *
 * The users, rooms and bookings tables are not created anywhere in the code,
 * so without this file a lost database could not be rebuilt. Run it against
 * production whenever a table or column is added, then commit schema.sql.
 *
 *   PowerShell:
 *     $env:MYSQL_URL = "<MYSQL_PUBLIC_URL from the Railway MySQL service>"
 *     npm run dump-schema
 *
 * Uses only mysql2, which the backend already depends on. Reads nothing but
 * table definitions — no guest data leaves the database.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const conn = url
    ? await mysql.createConnection({ uri: url, ssl: { rejectUnauthorized: false } })
    : await mysql.createConnection({
        host: process.env.MYSQLHOST || "127.0.0.1",
        user: process.env.MYSQLUSER || "root",
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE || "hotel_db",
        port: Number(process.env.MYSQLPORT) || 3306,
      });

  const [tables] = await conn.query(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  );

  const parts = [
    "-- VV Grand Park Residency — database schema (structure only, no data)",
    `-- Generated ${new Date().toISOString()} by backend/scripts/dump-schema.js`,
    "-- Restore order is handled by disabling foreign key checks.",
    "",
    "SET FOREIGN_KEY_CHECKS = 0;",
    "",
  ];
  for (const { name } of tables) {
    const [[row]] = await conn.query(`SHOW CREATE TABLE \`${name}\``);
    const ddl = row["Create Table"]
      // the current row counter is data, not structure
      .replace(/ AUTO_INCREMENT=\d+/, "")
      .replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ");
    parts.push(`${ddl};`, "");
  }
  parts.push("SET FOREIGN_KEY_CHECKS = 1;", "");

  const out = path.join(__dirname, "..", "schema.sql");
  fs.writeFileSync(out, parts.join("\n"));
  await conn.end();
  console.log(`Wrote ${tables.length} tables to ${out}`);
}

main().catch((err) => {
  console.error("Schema dump failed:", err.message);
  process.exit(1);
});
