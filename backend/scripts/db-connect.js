/*
 * Shared connection settings for the maintenance scripts (dump-schema,
 * backup-db, restore-db). Reads MYSQL_URL, or the separate MYSQL* variables.
 *
 * From your laptop you must use Railway's PUBLIC address
 * (MySQL service → Database → Connect → Public Network, "...proxy.rlwy.net").
 * The private "mysql.railway.internal" address only works inside Railway.
 */
function connectionOptions(extra = {}) {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const host = url ? safeHost(url) : process.env.MYSQLHOST || "127.0.0.1";

  if (/\.railway\.internal$/i.test(host || "")) {
    console.error(
      `\n"${host}" is Railway's PRIVATE address and only works inside Railway.\n` +
        "Use the Public Network URL instead:\n" +
        "  Railway → MySQL → Database → Connect → Public Network\n" +
        "  (it contains .proxy.rlwy.net)\n",
    );
    process.exit(1);
  }

  const common = {
    // keep DATE/DATETIME/TIMESTAMP exactly as stored — no timezone shifting
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    ...extra,
  };

  return url
    ? { uri: url, ssl: { rejectUnauthorized: false }, ...common }
    : {
        host,
        user: process.env.MYSQLUSER || "root",
        password: process.env.MYSQLPASSWORD,
        database: process.env.MYSQLDATABASE || "hotel_db",
        port: Number(process.env.MYSQLPORT) || 3306,
        ...common,
      };
}

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    console.error(
      "\nMYSQL_URL is not a valid URL. It should look like:\n" +
        "  mysql://root:PASSWORD@xxxx.proxy.rlwy.net:12345/railway\n",
    );
    process.exit(1);
  }
}

module.exports = { connectionOptions };
