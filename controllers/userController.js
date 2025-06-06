const User = require('../models/User');
const Course = require('../models/Course');
const emailService = require('../config/email');
const bcrypt = require('bcryptjs');

// User registration
exports.register = async (req, res) => {
  try {
    const dbStatus = await require('../db/db').checkDatabaseConnection();
    if (!dbStatus) {
      return res.render('account/register', { error: 'Service temporarily unavailable. Please try again later.' });
    }
    
    const { name, email, password, confirm_password } = req.body;

    // Validation
    if (password !== confirm_password) {
      return res.render('account/register', { error: 'Les mots de passe ne correspondent pas' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.render('account/register', { error: 'Cette adresse email est déjà utilisée' });
    }

    // Create user
    const user = await User.create({ name, email, password });
    console.log('User created:', user);

    // Store user in session
    req.session.user = user;
    console.log('Session before save:', req.session);

    // Send welcome email
    try {
      await emailService.sendEmail(
        email,
        'Bienvenue sur LevelUp',
        'welcome',
        { name: name }
      );
    } catch (emailErr) {
      console.error('Error sending welcome email:', emailErr);
      // Continue even if email fails
    }

    // Save session and redirect - ONLY ONCE
    req.session.save(err => {
      if (err) {
        console.error('Session save error details:', err);
        return res.status(500).render('error', { 
          message: 'Error saving session. Please try again later.' 
        });
      }
      
      console.log('Session saved successfully');
      res.redirect('/auth/dashboard');
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('account/register', { 
      error: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.' 
    });
  }
};

// User settings page
exports.getSettings = async (req, res) => {
    try {
      res.render('account/settings', {
        user: req.session.user,
        cartCount: req.session.cart ? req.session.cart.items.length : 0
      });
    } catch (error) {
      console.error("Settings error:", error);
      res.status(500).render('error', { message: 'Erreur lors du chargement des paramètres' });
    }
};

// User login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.authenticate(email, password);
    
    if (!user) {
      return res.render('account/login', { error: 'Email ou mot de passe incorrect' });
    }
    
    // Store user in session
    req.session.user = user;
    
    // IMPORTANT: Add explicit session save
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).render('error', { message: 'Erreur lors de la connexion' });
      }
      res.redirect(req.session.returnTo || '/auth/dashboard');
      delete req.session.returnTo;
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('error', { message: 'Erreur lors de la connexion' });
  }
};

// User logout
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).render('error', { message: 'Erreur lors de la déconnexion' });
    }
    res.redirect('/');
  });
};

// User dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get courses purchased by the user
    const courses = await Course.getPurchasedByUser(req.session.user.id);
    
    res.render('account/dashboard', {
      user: req.session.user,
      courses: courses,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement du tableau de bord' });
  }
};

// User profile update
// User profile update
exports.updateProfile = async (req, res) => {
  const client = await require('../db/db').pool.connect();
  
  try {
    await client.query('BEGIN');
    const userId = req.session.user.id;
    const { name, email } = req.body;
    
    const updatedUser = await User.update(userId, { name, email });
    
    // Update session data
    req.session.user = updatedUser;
    
    await client.query('COMMIT');
    
    // Save session changes explicitly
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la sauvegarde de la session'
        });
      }
      
      res.json({
        success: true,
        user: updatedUser,
        message: 'Profil mis à jour avec succès'
      });
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  } finally {
    client.release();
  }
};

// Password change
exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { current_password, new_password, confirm_password } = req.body;
    
    // Validation
    if (new_password !== confirm_password) {
      return res.json({
        success: false,
        message: 'Les mots de passe ne correspondent pas'
      });
    }
    
    // Verify current password
    try {
        const user = await User.findByEmail(req.session.user.email);
        const isValid = await bcrypt.compare(current_password, user.password);
        
        if (!isValid) {
          return res.json({
            success: false,
            message: 'Mot de passe actuel incorrect'
          });
        }
    } catch (error) {
        console.error('Password comparison error:', error);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification du mot de passe'
        });
    }
    
    // Update password
    await User.updatePassword(userId, new_password);
    
    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};