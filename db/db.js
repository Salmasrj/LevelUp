const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connection configuration
let poolConfig;

// If DATABASE_URL is provided (by Render), use it
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL
  };
} else {
  // Local development configuration
  poolConfig = {
    host: process.env.PGHOST || 'localhost',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'levelup',
    port: process.env.PGPORT || 5432
  };
}

// Create PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Test connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => {
    console.error('Error connecting to PostgreSQL database:', err.message);
    // Don't throw here, just log the error - this allows the app to start
    // even if there's a temporary database connection issue
  });

module.exports = pool;