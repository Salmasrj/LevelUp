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
    ssl: { rejectUnauthorized: false }, // Required for Render PostgreSQL
    // Add these connection parameters
    max: 20, // Increase connection pool size
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 5000 // How long to wait for a connection
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

// IMPORTANT: Create the pool FIRST before any functions try to use it
const pool = new Pool(poolConfig);

// Add event handlers immediately after pool creation
pool.on('connect', client => {
  console.log('New database client connected');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Then define the retry function
async function connectWithRetry(maxRetries = 10, delay = 2000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const client = await pool.connect();
      console.log('Connected to PostgreSQL database');
      client.release(); // Important: release the client when done!
      return true;
    } catch (err) {
      retries++;
      console.error(`Connection attempt ${retries} failed: ${err.message}`);
      
      if (retries >= maxRetries) {
        throw err;
      }
      
      // Wait with exponential backoff
      const waitTime = delay * Math.pow(2, retries - 1);
      console.log(`Waiting ${waitTime}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Add function to test connection health
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    console.log('Database connection check successful:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection check failed:', err);
    return false;
  }
}

// Export the pool BEFORE calling connectWithRetry
module.exports = {
  pool,
  checkDatabaseConnection
};

// Call connectWithRetry AFTER the pool is created and exported
connectWithRetry().catch(err => {
  console.error('Failed to connect to database after multiple attempts:', err);
});