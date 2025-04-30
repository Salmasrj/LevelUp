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

// Modified getCart function
exports.getCart = (req, res) => {
  console.log('Session ID:', req.sessionID);
  console.log('Cart in session:', req.session.cart);
  
  // Create a new cart if it doesn't exist
  if (!req.session.cart) {
    req.session.cart = {
      items: [],
      total: 0
    };
    
    // Save the new empty cart
    req.session.save(err => {
      if (err) console.error('Error saving new empty cart:', err);
      renderCart();
    });
  } else {
    renderCart();
  }
  
  // Separate function to render the cart
  function renderCart() {
    // Ensure proper formatting of prices
    if (req.session.cart && req.session.cart.items && req.session.cart.items.length > 0) {
      req.session.cart.items.forEach(item => {
        if (item.course && item.course.price) {
          item.course.price = parseFloat(item.course.price);
        }
      });
      
      // Recalculate total
      req.session.cart.total = req.session.cart.items.reduce((sum, item) => {
        return sum + parseFloat(item.course.price || 0);
      }, 0);
    }
    
    res.render('cart', {
      cart: req.session.cart || { items: [], total: 0 },
      user: req.session.user
    });
  }
};

exports.formatPrice = (price) => {
  return parseFloat(price || 0);
};

// Add to cart function
exports.addToCart = async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    // Use initializeCart consistently
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
    
    // Add to cart with all necessary properties
    cart.items.push({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        price: parseFloat(course.price),
        image_path: course.image_path,
        duration: course.duration
      }
    });
    
    // Update total
    cart.total = cart.items.reduce((sum, item) => sum + parseFloat(item.course.price || 0), 0);
    
    // Force session save and use Promise to ensure completion
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Failed to save session:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    return res.json({
      success: true,
      cartCount: cart.items.length,
      message: `"${course.title}" a été ajouté à votre panier`
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