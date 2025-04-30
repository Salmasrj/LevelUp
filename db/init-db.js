/**
 * PostgreSQL database initialization script
 * Creates tables and adds seed data for LevelUp e-learning platform
 */
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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
    // Don't throw an error here to prevent app from crashing
  });

module.exports = pool;

// Tables creation function
async function createTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('Creating tables...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Courses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        duration VARCHAR(100),
        image_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_amount NUMERIC(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
        price NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        progress INTEGER NOT NULL DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, course_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);

    await client.query('COMMIT');
    console.log('Tables created successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', e);
    throw e;
  } finally {
    client.release();
  }
}

// Seed data function
async function seedData() {
  const client = await pool.connect();
  
  try {
    // Check if data already exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(userCheck.rows[0].count) > 0) {
      console.log('Data already exists, skipping seeding');
      return;
    }
    
    console.log('Seeding database with initial data...');
    await client.query('BEGIN');
    
    // Create admin and test user with hashed passwords
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert users
    const adminUser = await client.query(
      'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Admin User', 'admin@levelup.com', hashedPassword, true]
    );
    
    const regularUser = await client.query(
      'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id',
      ['Test User', 'user@levelup.com', hashedPassword, false]
    );
    
    console.log('Users created successfully');
    
    // Insert courses
    await client.query(`
      INSERT INTO courses (title, description, price, duration, image_path) VALUES 
      ('JavaScript Mastery', 'Maîtrisez JavaScript moderne, des fondamentaux aux fonctionnalités avancées. Apprenez à développer des applications web interactives et dynamiques.', 49.99, '12 heures', '/images/javascript-course.jpg'),
      ('Full-Stack Web Development', 'Devenez un développeur Full-Stack en apprenant à construire des applications complètes avec Node.js, Express, et React.', 79.99, '24 heures', '/images/fullstack-course.jpg'),
      ('UI/UX Design Fundamentals', 'Apprenez les principes fondamentaux du design UI/UX et créez des interfaces utilisateur intuitives et attrayantes.', 59.99, '15 heures', '/images/uiux-course.jpg')
    `);
    
    console.log('Courses created successfully');
    
    // Create a sample order for test user
    const order = await client.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
      [regularUser.rows[0].id, 49.99, 'completed']
    );
    
    // Add item to order
    await client.query(
      'INSERT INTO order_items (order_id, course_id, price) VALUES ($1, $2, $3)',
      [order.rows[0].id, 1, 49.99]
    );
    
    console.log('Sample order created successfully');
    
    await client.query('COMMIT');
    console.log('Database initialization complete!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', e);
    throw e;
  } finally {
    client.release();
  }
}
async function testSessionTable() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT COUNT(*) FROM session");
    console.log(`Found ${result.rows[0].count} sessions in database`);
    client.release();
  } catch (err) {
    console.error("Session table test failed:", err);
  }
}

// Run initialization
async function initialize() {
  try {
    await createTables();
    await seedData();
    await testSessionTable(); // ✅ Call before closing pool
    console.log('You can now start the application with: npm start');
  } catch (e) {
    console.error('Initialization failed:', e);
  } finally {
    await pool.end(); // Pool now closed after all operations
  }
}
initialize();
