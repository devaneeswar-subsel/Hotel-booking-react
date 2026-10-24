/*
 * Restore a backup made by backup-db.js into a database.
 *
 *   npm run restore-db -- backups/vvgrandpark-2026-10-25_0110.sql.gz
 *
 * SAFETY: by default it refuses to run if the target database already has
 * tables — restoring REPLACES every table in the backup. Point MYSQL_URL at a
 * new, empty database (for example a fresh Railway MySQL service). Only if you
 * are certain you want to overwrite a database that has data, add --overwrite:
 *
 *   npm run restore-db -- backups/<file>.sql.gz --overwrite
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const readline = require("readline");
const mysql = require("mysql2/promise");
const { connectionOptions } = require("./db-connect");

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith("--"));
  const overwrite = args.includes("--overwrite");
  if (!fileArg) {
    console.error("Usage: npm run restore-db -- <backup file .sql.gz> [--overwrite]");
    process.exit(1);
  }
  const file = path.resolve(fileArg);
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const conn = await mysql.createConnection(connectionOptions());
  const [[{ n }]] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  const [[{ db }]] = await conn.query("SELECT DATABASE() AS db");
  if (Number(n) > 0 && !overwrite) {
    console.error(
      `\nDatabase "${db}" already has ${n} tables. Restoring would replace them.\n` +
        "Restore into an empty database, or add --overwrite if you are sure.\n",
    );
    await conn.end();
    process.exit(1);
  }

  const lines = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });

  let statement = "";
  let count = 0;
  let sawEnd = false;
  for await (const line of lines) {
    if (line.startsWith("-- END OF BACKUP")) sawEnd = true;
    if (!statement && (line.startsWith("--") || !line.trim())) continue;
    statement += (statement ? "\n" : "") + line;
    if (line.trimEnd().endsWith(";")) {
      await conn.query(statement);
      statement = "";
      count += 1;
      if (count % 50 === 0) process.stdout.write(`  ${count} statements...\r`);
    }
  }
  await conn.end();

  if (!sawEnd) {
    console.error(
      "\nWarning: the backup file has no end marker — it may be incomplete.",
    );
  }
  console.log(`\nRestore complete: ${count} statements into "${db}".`);
}

main().catch((err) => {
  console.error("Restore failed:", err.message);
  process.exit(1);
});
