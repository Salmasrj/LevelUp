const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const emailService = require('../config/email');

// Get checkout page
exports.getCheckout = (req, res) => {
  // Check if cart exists and has items
  if (!req.session.cart || !req.session.cart.items || req.session.cart.items.length === 0) {
    return res.redirect('/cart');
  }
  
  res.render('checkout', { 
    cart: req.session.cart,
    stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    user: req.session.user,
    cartCount: req.session.cart.items.length
  });
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    // Check if cart exists and has items
    if (!req.session.cart || !req.session.cart.items || req.session.cart.items.length === 0) {
      return res.json({ success: false, message: 'Panier vide' });
    }

    const { token } = req.body;
    const amount = Math.round(req.session.cart.total * 100); // Stripe uses cents

    // Create charge via Stripe
    const charge = await stripe.charges.create({
      amount: amount,
      currency: 'eur',
      description: 'Achat de formations sur LevelUp',
      source: token
    });

    // If successful, create order in database
    if (charge.status === 'succeeded') {
      // Use Order model to create order with items
      const order = await Order.createWithItems(
        req.session.user.id,
        req.session.cart.total,
        req.session.cart.items,
        'completed'
      );
      
      // Get detailed order with course information for the email
      const detailedOrder = await Order.getDetailedOrder(order.id);
      
      // Send confirmation email
      try {
        await emailService.sendEmail(
          req.session.user.email,
          'Confirmation de commande - LevelUp',
          'purchase-confirmation',
          { order: detailedOrder }
        );
      } catch (emailErr) {
        console.error('Error sending confirmation email:', emailErr);
      }
      
      // Clear cart
      req.session.cart = { items: [], total: 0 };
      
      res.json({ success: true, orderId: order.id });
    } else {
      res.json({ success: false, message: 'Erreur de paiement' });
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.json({ success: false, message: error.message });
  }
};

// Payment success page
exports.paymentSuccess = (req, res) => {
  res.render('payment-success', { 
    user: req.session.user,
    cartCount: 0,
    orderId: req.query.order_id
  });
};

// Payment cancel page
exports.paymentCancel = (req, res) => {
  res.render('payment-cancel', {
    user: req.session.user,
    cartCount: req.session.cart ? req.session.cart.items.length : 0
  });
};

// Get user order history
exports.getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.getByUser(req.session.user.id);
    
    res.render('account/orders', {
      user: req.session.user,
      orders: orders,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).render('error', { message: 'Erreur lors du chargement des commandes' });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.getDetailedOrder(orderId);
    
    // Check if order exists and belongs to the current user
    if (!order || order.user_id !== req.session.user.id) {
      return res.status(404).render('error', { message: 'Commande non trouvée' });
    }
    
    res.render('account/order-details', {
      user: req.session.user,
      order: order,
      cartCount: req.session.cart ? req.session.cart.items.length : 0
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).render('error', { message: 'Erreur lors du chargement de la commande' });
  }
};