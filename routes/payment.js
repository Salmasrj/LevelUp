const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Payment routes
router.get('/checkout', authMiddleware.isAuthenticated, paymentController.getCheckout);
router.post('/process', authMiddleware.isAuthenticated, paymentController.processPayment);
router.get('/success', authMiddleware.isAuthenticated, paymentController.paymentSuccess);
router.get('/cancel', authMiddleware.isAuthenticated, paymentController.paymentCancel);

module.exports = router;