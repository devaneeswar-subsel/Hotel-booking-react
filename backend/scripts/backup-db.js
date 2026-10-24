/*
 * Full database backup — structure AND data — to a compressed file on this
 * computer:  backend/backups/vvgrandpark-YYYY-MM-DD_HHMM.sql.gz
 *
 * Railway's free plan has no scheduled backups, so run this regularly
 * (weekly at least, and always before a big deploy):
 *
 *   PowerShell, in the backend folder:
 *     $env:MYSQL_URL = "<Public Network URL: Railway → MySQL → Database → Connect>"
 *     npm run backup-db
 *
 * The file holds guest names, phones, emails and ID numbers. It is kept out
 * of git (backend/backups is ignored). Store copies somewhere private
 * (an encrypted drive or a private cloud folder), never in the repo or chat.
 *
 * Read-only on the database. Uses only mysql2, already a backend dependency.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const mysql = require("mysql2");
const { connectionOptions } = require("./db-connect");

const ROWS_PER_INSERT = 200;

function stamp() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString();
  return `${ist.slice(0, 10)}_${ist.slice(11, 13)}${ist.slice(14, 16)}`;
}

function q(conn, sql, params = []) {
  return new Promise((resolve, reject) =>
    conn.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
  );
}

// write and wait when the gzip buffer is full, so big tables don't fill memory
function write(out, text) {
  return new Promise((resolve) => {
    if (out.write(text)) resolve();
    else out.once("drain", resolve);
  });
}

async function dumpTable(conn, out, table) {
  const [create] = await q(conn, `SHOW CREATE TABLE \`${table}\``);
  const ddl = create["Create Table"].replace(/ AUTO_INCREMENT=\d+/, "");
  await write(out, `\n-- Table ${table}\nDROP TABLE IF EXISTS \`${table}\`;\n${ddl};\n`);

  let rowCount = 0;
  let batch = [];
  let columns = null;

  const flush = async () => {
    if (!batch.length) return;
    const values = batch.map(
      (row) => `(${columns.map((c) => conn.escape(row[c])).join(",")})`,
    );
    // one statement per line — restore-db reads the file line by line
    await write(
      out,
      `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(",")}) VALUES ${values.join(",")};\n`,
    );
    batch = [];
  };

  await new Promise((resolve, reject) => {
    const stream = conn.query(`SELECT * FROM \`${table}\``).stream();
    stream.on("data", async (row) => {
      stream.pause();
      try {
        if (!columns) columns = Object.keys(row);
        batch.push(row);
        rowCount += 1;
        if (batch.length >= ROWS_PER_INSERT) await flush();
        stream.resume();
      } catch (e) {
        reject(e);
      }
    });
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  await flush();
  return rowCount;
}

async function main() {
  const conn = mysql.createConnection(connectionOptions());
  // TIMESTAMP values are written and read back in UTC, so a restore on any
  // machine gets the exact same instants
  await q(conn, "SET time_zone = '+00:00'");

  const tables = (
    await q(
      conn,
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    )
  ).map((t) => t.name);

  const dir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `vvgrandpark-${stamp()}.sql.gz`);
  const gzip = zlib.createGzip();
  const done = new Promise((resolve, reject) => {
    gzip.pipe(fs.createWriteStream(file)).on("finish", resolve).on("error", reject);
  });

  await write(
    gzip,
    [
      "-- VV Grand Park Residency — full database backup (structure + data)",
      `-- Taken ${new Date().toISOString()} by backend/scripts/backup-db.js`,
      "-- Restore with: npm run restore-db -- <this file>",
      "SET time_zone = '+00:00';",
      "SET FOREIGN_KEY_CHECKS = 0;",
      "",
    ].join("\n"),
  );

  let total = 0;
  for (const table of tables) {
    const n = await dumpTable(conn, gzip, table);
    total += n;
    console.log(`  ${table.padEnd(28)} ${n} rows`);
  }
  await write(gzip, "\nSET FOREIGN_KEY_CHECKS = 1;\n-- END OF BACKUP\n");
  gzip.end();
  await done;
  conn.end();

  const mb = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
  console.log(`\nBackup complete: ${tables.length} tables, ${total} rows, ${mb} MB`);
  console.log(`Saved to ${file}`);
  console.log("This file contains guest personal data — keep it private.");
}

main().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
