const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Authentication routes - add isNotAuthenticated to prevent already logged-in users
router.get('/login', authMiddleware.isNotAuthenticated, (req, res) => {
  res.render('account/login');
});

router.post('/login', authMiddleware.isNotAuthenticated, userController.login);

router.get('/register', authMiddleware.isNotAuthenticated, (req, res) => {
  res.render('account/register');
});

router.post('/register', authMiddleware.isNotAuthenticated, userController.register);

router.get('/logout', userController.logout);

// Protected routes
router.get('/dashboard', authMiddleware.isAuthenticated, userController.getDashboard);
router.get('/settings', authMiddleware.isAuthenticated, userController.getSettings);
router.post('/settings/update', authMiddleware.isAuthenticated, userController.updateProfile);
router.post('/settings/password', authMiddleware.isAuthenticated, userController.changePassword);

module.exports = router;