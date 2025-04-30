const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middlewares/authMiddleware');

// View cart - accessible to all
router.get('/', cartController.getCart);

// Cart modification - recommend authentication for better user experience
router.post('/add/:courseId', cartController.addToCart);
router.post('/remove/:courseId', cartController.removeFromCart);
router.post('/clear', cartController.clearCart);

module.exports = router;