const User = require('../models/User');
const Course = require('../models/Course');
const emailService = require('../config/email');
const bcrypt = require('bcrypt');

// User registration
exports.register = async (req, res) => {
  try {
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

    // Store user in session
    req.session.user = user;

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
    }

    // Redirect to dashboard
    res.redirect('/auth/dashboard');

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('error', { message: 'Erreur lors de l\'inscription' });
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
    
    res.redirect('/auth/dashboard');
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
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email } = req.body;
    
    const updatedUser = await User.update(userId, { name, email });
    
    // Update session data
    req.session.user = updatedUser;
    
    res.json({
      success: true,
      user: updatedUser,
      message: 'Profil mis à jour avec succès'
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
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