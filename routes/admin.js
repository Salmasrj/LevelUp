const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect all admin routes
router.use(authMiddleware.isAdmin);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users/:id/update', adminController.updateUser);
router.post('/users/:id/delete', adminController.deleteUser);

// Course management
router.get('/courses', adminController.getAllCourses);
router.get('/courses/new', adminController.getNewCourseForm);
router.post('/courses/new', adminController.createCourse);
router.get('/courses/:id/edit', adminController.getEditCourseForm);
router.post('/courses/:id/update', adminController.updateCourse);
router.post('/courses/:id/delete', adminController.deleteCourse);

// Order management
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.post('/orders/:id/status', adminController.updateOrderStatus);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

module.exports = router;