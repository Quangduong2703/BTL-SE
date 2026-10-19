require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const defaultConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'vocabup',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
};

const pool = process.env.DB_URL
  ? mysql.createPool({
    uri: process.env.DB_URL,
    multipleStatements: true,
  })
  : mysql.createPool(defaultConfig);

module.exports = pool;
