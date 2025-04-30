const { pool } = require('../db/db');

class Order {
  /**
   * Create a new order with items
   * @param {number} userId - User ID
   * @param {number} totalAmount - Order total amount
   * @param {Array} items - Array of course items with IDs and prices
   * @param {string} status - Order status ('pending', 'completed', 'cancelled')
   * @returns {Promise} - Resolves with the created order
   */
  static async createWithItems(userId, totalAmount, items, status = 'completed') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert order
      const orderResult = await client.query(
        "INSERT INTO orders (user_id, total_amount, status) VALUES ($1, $2, $3) RETURNING *",
        [userId, totalAmount, status]
      );
      
      const order = orderResult.rows[0];
      
      // Insert each order item
      for (const item of items) {
        await client.query(
          "INSERT INTO order_items (order_id, course_id, price) VALUES ($1, $2, $3)",
          [order.id, item.course.id, item.course.price]
        );
      }
      
      await client.query('COMMIT');
      
      // Return the complete order with items
      const completeOrder = await Order.findById(order.id);
      return completeOrder;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating order with items:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find order by ID
   * @param {number} id - Order ID
   * @returns {Promise} - Resolves with order object or null
   */
  static async findById(id) {
    try {
      // Get the order
      const orderResult = await pool.query(
        "SELECT * FROM orders WHERE id = $1",
        [id]
      );
      
      const order = orderResult.rows[0];
      
      if (!order) {
        return null;
      }
      
      // Get order items with course details
      const itemsResult = await pool.query(`
        SELECT oi.*, c.title, c.description, c.image_path, c.duration
        FROM order_items oi
        INNER JOIN courses c ON oi.course_id = c.id
        WHERE oi.order_id = $1
      `, [id]);
      
      order.items = itemsResult.rows;
      return order;
      
    } catch (error) {
      console.error('Error finding order by ID:', error);
      throw error;
    }
  }

  /**
   * Get orders for a user
   * @param {number} userId - User ID
   * @returns {Promise} - Resolves with array of orders
   */
  static async getByUser(userId) {
    try {
      const result = await pool.query(
        "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      
      return result.rows || [];
    } catch (error) {
      console.error('Error getting orders by user:', error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {number} id - Order ID
   * @param {string} status - New status
   * @returns {Promise} - Resolves with updated order
   */
  static async updateStatus(id, status) {
    try {
      const result = await pool.query(
        "UPDATE orders SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      
      if (result.rowCount === 0) {
        throw new Error('Order not found');
      }
      
      return await Order.findById(id);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Get detailed order with user and course information
   * @param {number} id - Order ID
   * @returns {Promise} - Resolves with detailed order
   */
  static async getDetailedOrder(id) {
    try {
      // Get order with user details
      const orderResult = await pool.query(`
        SELECT o.*, u.name, u.email
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `, [id]);
      
      const order = orderResult.rows[0];
      
      if (!order) {
        return null;
      }
      
      // Get order items with course details
      const itemsResult = await pool.query(`
        SELECT oi.*, c.title, c.description, c.image_path, c.duration
        FROM order_items oi
        INNER JOIN courses c ON oi.course_id = c.id
        WHERE oi.order_id = $1
      `, [id]);
      
      // Format the items with nested course objects
      order.items = itemsResult.rows.map(item => ({
        ...item,
        course: {
          id: item.course_id,
          title: item.title,
          description: item.description,
          image_path: item.image_path,
          duration: item.duration
        }
      }));
      
      // Create user object
      order.user = {
        id: order.user_id,
        name: order.name,
        email: order.email
      };
      order.total_amount = parseFloat(order.total_amount);
      // Clean up duplicated fields
      delete order.name;
      delete order.email;
      
      return order;
    } catch (error) {
      console.error('Error getting detailed order:', error);
      throw error;
    }
  }

  /**
   * Get total count of orders
   * @returns {Promise} - Resolves with the count
   */
  static async count() {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM orders");
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error counting orders:', error);
      return 0; // Return a default value instead of throwing
    }
  }
  
  
  /**
   * Get all orders with basic user information
   * @returns {Promise} - Resolves with array of orders
   */
  static async getAll() {
    try {
      const result = await pool.query(`
        SELECT o.*, u.name, u.email
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        ORDER BY o.created_at DESC
      `);
      
      return result.rows.map(order => ({
        ...order,
        user: {
          name: order.name,
          email: order.email
        }
      }));
    } catch (error) {
      console.error('Error getting all orders:', error);
      throw error;
    }
  }
  /**
   * Get total revenue from all completed orders
   * @returns {Promise} - Resolves with the total amount
   */
  static async getTotalRevenue() {
    try {
      const result = await pool.query(
        "SELECT SUM(total_amount) as total FROM orders WHERE status = 'completed'"
      );
      return parseFloat(result.rows[0]?.total || 0);
    } catch (error) {
      console.error('Error getting total revenue:', error);
      return 0;
    }
  }
}



module.exports = Order;