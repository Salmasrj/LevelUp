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
    secret: process.env.SESSION_SECRET || 'levelup_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }));

  // Apply auth middleware to make user data available in all views
  app.use(authMiddleware.addUserData);

  // Setup CSRF protection
  const csrfProtection = csrf({ cookie: true });
  app.use((req, res, next) => {
    // Skip CSRF for API routes if needed
    if (req.path.startsWith('/api/')) {
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
    // In the startServer function, modify the app.listen call:
    // Add more detailed logging
    console.log(`Attempting to start server on port ${PORT}`);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      resolve(server);
    });
  });
}

// Execute the startServer function
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});