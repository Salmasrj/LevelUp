const Course = require('../models/Course');

// Get all courses for the homepage
// Get all courses for the homepage
exports.getAllCourses = async (req, res) => {
    try {
      const courses = await Course.getAll();
      
      // Handle cart message
      let notification = null;
      if (req.query.message) {
        const courseId = req.query.courseId;
        const course = courseId ? await Course.findById(courseId) : null;
        const courseTitle = course ? course.title : '';
        
        switch(req.query.message) {
          case 'success':
            notification = {
              type: 'success',
              message: `"${courseTitle}" a été ajouté à votre panier.`
            };
            break;
          case 'already':
            notification = {
              type: 'info',
              message: `"${courseTitle}" est déjà dans votre panier.`
            };
            break;
          case 'error':
            notification = {
              type: 'error',
              message: 'Une erreur est survenue. Veuillez réessayer.'
            };
            break;
        }
      }
      
      res.render('index', { 
        courses,
        user: req.session.user || null,
        cartCount: req.session.cart ? req.session.cart.items.length : 0,
        notification
      });
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).render('error', { message: 'Erreur lors du chargement des formations' });
    }
};

// Get single course by ID
exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).render('error', { message: 'Formation non trouvée' });
    }
    
    res.render('formations/formation' + courseId, { 
      course,
      user: req.session.user || null,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement de la formation' });
  }
};

// Admin: Create course
exports.createCourse = async (req, res) => {
  try {
    const courseData = {
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      duration: req.body.duration,
      image_path: req.body.image_path || '/images/default-course.jpg'
    };
    
    const course = await Course.create(courseData);
    
    res.status(201).json({
      success: true,
      course
    });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la formation'
    });
  }
};

// Admin: Update course
exports.updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const updates = req.body;
    
    const course = await Course.update(courseId, updates);
    
    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la formation'
    });
  }
};

// Admin: Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const success = await Course.delete(courseId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Formation non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Formation supprimée avec succès'
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la formation'
    });
  }
};