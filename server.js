const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const fs = require('fs');
const { exec } = require('child_process');
const csrf = require('csurf');
const util = require('util');
const execPromise = util.promisify(exec);

// Load environment variables
dotenv.config();

// Database validation check
const db = require('./db/db');

// Session testing function
async function testSessionWrite() {
  try {
    const client = await require('./db/db').pool.connect();
    
    // Test insert a dummy session
    const testSessionId = `test-session-${Date.now()}`;
    const testSessionData = JSON.stringify({ 
      test: true, 
      timestamp: new Date().toISOString() 
    });
    
    await client.query(
      'INSERT INTO session(sid, sess, expire) VALUES($1, $2, $3) ON CONFLICT (sid) DO UPDATE SET sess = $2, expire = $3', 
      [testSessionId, testSessionData, new Date(Date.now() + 60000)]
    );
    
    // Try to retrieve it
    const result = await client.query('SELECT * FROM session WHERE sid = $1', [testSessionId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Session write/read test successful');
    } else {
      console.error('❌ Session write/read test failed - could not retrieve test session');
    }
    
    // Clean up
    await client.query('DELETE FROM session WHERE sid = $1', [testSessionId]);
    client.release();
  } catch (err) {
    console.error('❌ Session write/read test failed:', err);
  }
}

async function verifySessionTable() {
  try {
    const client = await require('./db/db').pool.connect();
    
    // Check if session table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log(`Session table exists: ${tableExists}`);
    
    if (tableExists) {
      // Check if we can access the table
      const sessionCount = await client.query('SELECT COUNT(*) FROM session');
      console.log(`Current session count: ${sessionCount.rows[0].count}`);
      
      // Check session table structure
      const columnsCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
        ORDER BY column_name;
      `);
      
      console.log('Session table columns:', columnsCheck.rows.map(r => r.column_name).join(', '));
    } else {
      console.warn('⚠️ Session table does not exist! Sessions will not persist.');
    }
    
    client.release();
  } catch (err) {
    console.error('Failed to verify session table:', err);
    console.warn('⚠️ Session storage may not be working correctly!');
  }
}

// Start the application server
async function startServer() {
  // Initialize database if needed
  if (process.env.INITIALIZE_DB === 'true') {
    console.log('Initializing database...');
    try {
      await execPromise('node db/init-db.js');
      console.log('Database initialized successfully.');
    } catch (error) {
      console.error('Error initializing database:', error);
      process.exit(1);
    }
  }

  // Verify session table and test writing to it
  await verifySessionTable();
  try {
    await testSessionWrite();
  } catch (err) {
    console.error('Session write test failed:', err);
  }
  
  // Start Express server
  const app = express();
  const PORT = process.env.PORT || 3000;
    
  // Import routes
  const indexRoutes = require('./routes/index');
  const authRoutes = require('./routes/auth');
  const cartRoutes = require('./routes/cart');
  const paymentRoutes = require('./routes/payment');
  const adminRoutes = require('./routes/admin');
  const authMiddleware = require('./middlewares/authMiddleware');
  const pgSession = require('connect-pg-simple')(session);

  // View engine setup
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // Session configuration
  app.use(session({
    store: new pgSession({
      pool: require('./db/db').pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'levelup_secret',
    resave: true,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));

  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      // Log creation of new sessions
      if (!req.session.initialized) {
        console.log(`New session created: ${req.sessionID}`);
        req.session.initialized = true;
        req.session.save(err => {
          if (err) console.error('Error saving new session:', err);
        });
      }
      next();
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    app.get('/debug-session', (req, res) => {
      res.json({
        sessionID: req.sessionID,
        session: req.session,
        hasUser: !!req.session.user,
        hasCart: !!req.session.cart,
        cartItems: req.session.cart ? req.session.cart.items.length : 0
      });
    });
  }
  if (process.env.NODE_ENV !== 'production') {
    app.get('/debug-cart', (req, res) => {
      res.json({
        sessionID: req.sessionID,
        cartExists: !!req.session.cart,
        cartItemsCount: req.session.cart ? req.session.cart.items.length : 0,
        cartItems: req.session.cart ? req.session.cart.items : [],
        cartTotal: req.session.cart ? req.session.cart.total : 0
      });
    });
  }

  // Apply auth middleware to make user data available in all views
  app.use(authMiddleware.addUserData);

  // Setup CSRF protection
  const csrfProtection = csrf({ cookie: true });
  app.use((req, res, next) => {
    // Temporarily disable CSRF for auth routes during debugging
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth/')) {
      return next();
    }
    csrfProtection(req, res, next);
  });

  // Make CSRF token available to all views
  app.use((req, res, next) => {
    if (req.csrfToken) {
      res.locals.csrfToken = req.csrfToken();
    } else {
      res.locals.csrfToken = '';
    }
    next();
  });

  // Routes - now after CSRF middleware
  app.use('/', indexRoutes);
  app.use('/auth', authRoutes);
  app.use('/cart', cartRoutes);
  app.use('/payment', paymentRoutes);
  app.use('/admin', adminRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      // Handle CSRF token errors specifically
      return res.status(403).render('error', {
        message: 'Session expirée ou formulaire invalide. Veuillez réessayer.',
        csrfToken: res.locals.csrfToken
      });
    }
    
    // Handle other errors
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: req.app.get('env') === 'development' ? err : {},
      csrfToken: res.locals.csrfToken
    });
  });

  // THIS IS THE CRITICAL PART - Start listening on the port
  return new Promise((resolve) => {
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`PORT environment variable: ${process.env.PORT}`);
    console.log(`DATABASE_URL defined: ${Boolean(process.env.DATABASE_URL)}`);
  
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      resolve(server);
    });
    
    server.on('error', (error) => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
  });
}

// Execute the startServer function
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});