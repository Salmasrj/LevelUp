const Course = require('../models/Course');

function initializeCart(req) {
  if (!req.session.cart) {
    req.session.cart = {
      items: [],
      total: 0
    };
  }
  return req.session.cart;
}

// Add the getCart function referenced in routes/cart.js
exports.getCart = (req, res) => {
  res.render('cart', {
    cart: req.session.cart || { items: [], total: 0 },
    user: req.session.user
  });
};

// Add to cart function
exports.addToCart = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const cart = initializeCart(req);
    
    // Check if course already in cart
    const existingItemIndex = cart.items.findIndex(item => item.course.id === courseId);
    
    if (existingItemIndex >= 0) {
      return res.json({
        success: false,
        cartCount: cart.items.length,
        message: 'Cette formation est déjà dans votre panier'
      });
    }
    
    // Get course details from database using the model
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Formation non trouvée'
      });
    }
    
    // Add to cart
    cart.items.push({
      course: course
    });
    
    // Update total
    cart.total = cart.items.reduce((sum, item) => sum + parseFloat(item.course.price), 0);
    
    // IMPORTANT: Add explicit session save
    req.session.save(err => {
      if (err) {
        console.error('Failed to save session:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la sauvegarde de la session'
        });
      }
      
      return res.json({
        success: true,
        cartCount: cart.items.length,
        message: `"${course.title}" a été ajouté à votre panier`
      });
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout au panier'
    });
  }
};

// Remove item from cart
exports.removeFromCart = (req, res) => {
  const courseId = parseInt(req.params.courseId);
  
  if (!req.session.cart || !req.session.cart.items) {
    return res.json({
      success: false,
      message: 'Panier vide'
    });
  }
  
  // Find and remove the item
  const itemIndex = req.session.cart.items.findIndex(item => item.course.id === courseId);
  
  if (itemIndex >= 0) {
    // Remove item
    req.session.cart.items.splice(itemIndex, 1);
    
    // Update total
    req.session.cart.total = req.session.cart.items.reduce(
      (sum, item) => sum + parseFloat(item.course.price), 0
    );
    
    // IMPORTANT: Add explicit session save
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la sauvegarde de la session'
        });
      }
      
      return res.json({
        success: true,
        cartCount: req.session.cart.items.length,
        cartTotal: req.session.cart.total,
        message: 'Formation retirée du panier'
      });
    });
  } else {
    res.json({
      success: false,
      message: 'Formation non trouvée dans le panier'
    });
  }
};

// Clear entire cart
exports.clearCart = (req, res) => {
  req.session.cart = {
    items: [],
    total: 0
  };
  
  // IMPORTANT: Add explicit session save
  req.session.save(err => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la sauvegarde de la session'
      });
    }
    
    res.json({
      success: true,
      message: 'Panier vidé avec succès'
    });
  });
};