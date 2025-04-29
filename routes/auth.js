const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Authentication routes
router.get('/login', (req, res) => {
  res.render('account/login');
});

router.post('/login', userController.login);

router.get('/register', (req, res) => {
  res.render('account/register');
});

router.post('/register', userController.register);

router.get('/logout', userController.logout);

// Protected routes
router.get('/dashboard', authMiddleware.isAuthenticated, userController.getDashboard);

// Add this after the dashboard route:
router.get('/settings', authMiddleware.isAuthenticated, userController.getSettings);
router.post('/settings/update', authMiddleware.isAuthenticated, userController.updateProfile);
router.post('/settings/password', authMiddleware.isAuthenticated, userController.changePassword);

module.exports = router;