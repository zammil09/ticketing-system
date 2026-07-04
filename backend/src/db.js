const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // مثال: postgresql://user:password@localhost:5432/ticketing_system
});

pool.on("error", (err) => {
  console.error("خطأ غير متوقع بمجمع اتصالات قاعدة البيانات:", err);
});

module.exports = pool;
