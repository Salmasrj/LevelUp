const User = require('../models/User');
const Course = require('../models/Course');
const Order = require('../models/Order');

// Admin dashboard
exports.getDashboard = async (req, res) => {
  try {
    // Get summary statistics
    const userCount = await User.count();
    const courseCount = await Course.count();
    const orderCount = await Order.count();
    const revenue = await Order.getTotalRevenue();
    
    res.render('admin/dashboard', {
      user: req.session.user,
      userCount,
      courseCount,
      orderCount,
      revenue: (revenue !== null && revenue !== undefined) ? revenue.toFixed(2) : '0.00',
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement du tableau de bord administrateur' });
  }
};

// User management
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    
    res.render('admin/users', {
      user: req.session.user,
      users,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement des utilisateurs' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const userDetails = await User.findById(userId);
    
    if (!userDetails) {
      return res.status(404).render('error', { message: 'Utilisateur non trouvé' });
    }
    
    // Get user's orders
    const orders = await Order.getByUser(userId);
    
    // Get user's courses
    const courses = await Course.getPurchasedByUser(userId);
    
    res.render('admin/user-details', {
      user: req.session.user,
      userDetails,
      orders,
      courses,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement des détails utilisateur' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    const updatedUser = await User.update(userId, updates);
    
    res.json({
      success: true,
      user: updatedUser,
      message: 'Utilisateur mis à jour avec succès'
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'utilisateur'
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    await User.delete(userId);
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur'
    });
  }
};

// Course management
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.getAll();
    courses.forEach(course => {
      course.price = parseFloat(course.price);
    });

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

exports.getNewCourseForm = (req, res) => {
  res.render('admin/course-form', {
    user: req.session.user,
    course: null,
    cartCount: req.session.cart ? req.session.cart.items.length : 0
  });
};

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
    
    res.redirect('/admin/courses');
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).render('error', { message: 'Erreur lors de la création de la formation' });
  }
};

exports.getEditCourseForm = async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).render('error', { message: 'Formation non trouvée' });
    }
    
    res.render('admin/course-form', {
      user: req.session.user,
      course,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement de la formation' });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const updates = {
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      duration: req.body.duration,
      image_path: req.body.image_path
    };
    
    await Course.update(courseId, updates);
    
    res.redirect('/admin/courses');
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).render('error', { message: 'Erreur lors de la mise à jour de la formation' });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    
    await Course.delete(courseId);
    
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

// Order management
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.getAll();
    
    res.render('admin/orders', {
      user: req.session.user,
      orders,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement des commandes' });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.getDetailedOrder(orderId);
    
    if (!order) {
      return res.status(404).render('error', { message: 'Commande non trouvée' });
    }
    
    res.render('admin/order-details', {
      user: req.session.user,
      order,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).render('error', { message: 'Erreur lors du chargement de la commande' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    
    await Order.updateStatus(orderId, status);
    
    res.json({
      success: true,
      message: 'Statut de la commande mis à jour avec succès'
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut de la commande'
    });
  }
};