const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Cart routes
router.get('/', cartController.getCart);
router.post('/add/:courseId', cartController.addToCart);
router.post('/remove/:courseId', cartController.removeFromCart);
router.post('/clear', cartController.clearCart);

module.exports = router;