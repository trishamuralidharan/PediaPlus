const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'pediaplus',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4',
});

pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected →', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
    console.error('    → Check .env DB_* values and ensure MySQL is running');
    process.exit(1);
  });

module.exports = pool;
