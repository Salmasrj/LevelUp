/**
 * Database initialization script
 * Creates tables and adds seed data for LevelUp e-learning platform
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
require('dotenv').config();

// Get database path from .env or use default
const dbPath = process.env.DB_PATH 
  ? path.resolve(process.env.DB_PATH) 
  : path.join(__dirname, 'database.sqlite');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log(`Initializing database at: ${dbPath}`);

// Connect to database (creates file if it doesn't exist)
const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Courses table
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      duration TEXT,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Order items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE RESTRICT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE CASCADE,
      UNIQUE(user_id, course_id)
    )
  `);

  console.log("Tables created successfully.");

  // Check if we already have data
  db.get('SELECT COUNT(*) as count FROM users', async (err, result) => {
    if (err) {
      console.error('Error checking for existing data:', err);
      return;
    }
    
    // If data exists, don't add sample data
    if (result && result.count > 0) {
      console.log('Users already exist, skipping seeding data.');
      db.close();
      return;
    }
    
    // Add sample data
    console.log('Seeding database with initial data...');

    try {
      // Create admin and test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Insert admin user
      db.run(`
        INSERT INTO users (name, email, password, is_admin) VALUES 
        ('Admin User', 'admin@levelup.com', ?, 1),
        ('Test User', 'user@levelup.com', ?, 0)
      `, [hashedPassword, hashedPassword], function(err) {
        if (err) {
          console.error('Error inserting users:', err);
          return;
        }
        console.log('Users created successfully.');
        
        // Insert courses
        db.run(`
          INSERT INTO courses (title, description, price, duration, image_path) VALUES 
          ('JavaScript Mastery', 'Maîtrisez JavaScript moderne, des fondamentaux aux fonctionnalités avancées. Apprenez à développer des applications web interactives et dynamiques.', 49.99, '12 heures', '/images/javascript-course.jpg'),
          ('Full-Stack Web Development', 'Devenez un développeur Full-Stack en apprenant à construire des applications complètes avec Node.js, Express, et React.', 79.99, '24 heures', '/images/fullstack-course.jpg'),
          ('UI/UX Design Fundamentals', 'Apprenez les principes fondamentaux du design UI/UX et créez des interfaces utilisateur intuitives et attrayantes.', 59.99, '15 heures', '/images/uiux-course.jpg')
        `, function(err) {
          if (err) {
            console.error('Error inserting courses:', err);
            return;
          }
          console.log('Courses created successfully.');
          
          // Create a sample order for test user
          db.run(`
            INSERT INTO orders (user_id, total_amount, status) VALUES
            (2, 49.99, 'completed')
          `, function(err) {
            if (err) {
              console.error('Error inserting order:', err);
              return;
            }

            const orderId = this.lastID;
            
            // Add item to order
            db.run(`
              INSERT INTO order_items (order_id, course_id, price) VALUES
              (?, 1, 49.99)
            `, [orderId], function(err) {
              if (err) {
                console.error('Error inserting order item:', err);
                return;
              }
              console.log('Sample order created successfully.');
              
              console.log('Database initialization complete!');
              console.log('You can now start the application with: npm start');
              db.close();
            });
          });
        });
      });
    } catch (error) {
      console.error('Error hashing password:', error);
      db.close();
    }
  });
});