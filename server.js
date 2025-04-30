const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const fs = require('fs');
const { exec } = require('child_process');
const csrf = require('csurf');

// Load environment variables
dotenv.config();

// Database validation check
const db = require('./db/db');

// Optional: Initialize database if needed
if (process.env.INITIALIZE_DB) {
  console.log('Initializing database...');
  exec('npm run init-db', (error) => {
    if (error) {
      console.error('Error initializing database:', error);
      process.exit(1);
    }
    console.log('Database initialized successfully.');
  });
}

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

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
        csrfToken: req.csrfToken ? req.csrfToken() : '' 
      });
    }
    
    // Handle other errors
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: req.app.get('env') === 'development' ? err : {},
      csrfToken: req.csrfToken ? req.csrfToken() : ''
    });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;