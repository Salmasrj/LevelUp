const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Home page
router.get('/', courseController.getAllCourses);

// Course detail pages
router.get('/formations/:id', courseController.getCourseById);

module.exports = router;