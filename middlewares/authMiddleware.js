/**
 * Authentication middleware
 */

// Check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    
    // Store the requested URL for redirect after login
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
  };
  
  // Check if user is NOT authenticated (for login/register pages)
  exports.isNotAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
      return next();
    }
    
    res.redirect('/auth/dashboard');
  };
  
  // Check if user is an admin
  exports.isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.is_admin) {
      return next();
    }
    
    res.status(403).render('error', { 
      message: 'Accès refusé. Vous n\'avez pas les autorisations nécessaires.'
    });
  };
  
  // Add user data to all views
  exports.addUserData = (req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cartCount = req.session.cart ? req.session.cart.items.length : 0;
    next();
  };