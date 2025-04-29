const db = require('../db/db');

class Order {
  /**
   * Create a new order with items
   * @param {number} userId - User ID
   * @param {number} totalAmount - Order total amount
   * @param {Array} items - Array of course items with IDs and prices
   * @param {string} status - Order status ('pending', 'completed', 'cancelled')
   * @returns {Promise} - Resolves with the created order
   */
  static createWithItems(userId, totalAmount, items, status = 'completed') {
    return new Promise((resolve, reject) => {
      // Begin transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert order
        db.run(
          "INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)",
          [userId, totalAmount, status],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
            
            const orderId = this.lastID;
            const orderItems = [];
            let itemsProcessed = 0;
            
            // Insert each order item
            items.forEach(item => {
              db.run(
                "INSERT INTO order_items (order_id, course_id, price) VALUES (?, ?, ?)",
                [orderId, item.course.id, item.course.price],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  
                  orderItems.push({
                    id: this.lastID,
                    course_id: item.course.id,
                    price: item.course.price
                  });
                  
                  itemsProcessed++;
                  
                  // If all items processed, commit and return
                  if (itemsProcessed === items.length) {
                    db.run('COMMIT', async (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                      }
                      
                      try {
                        // Get the complete order
                        const order = await Order.findById(orderId);
                        order.items = orderItems;
                        resolve(order);
                      } catch (error) {
                        reject(error);
                      }
                    });
                  }
                }
              );
            });
          }
        );
      });
    });
  }

  /**
   * Find order by ID
   * @param {number} id - Order ID
   * @returns {Promise} - Resolves with order object or null
   */
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
        if (err) return reject(err);
        
        if (!order) {
          return resolve(null);
        }
        
        // Get order items
        db.all(`
          SELECT oi.*, c.title, c.description, c.image_path, c.duration
          FROM order_items oi
          INNER JOIN courses c ON oi.course_id = c.id
          WHERE oi.order_id = ?
        `, [id], (err, items) => {
          if (err) return reject(err);
          
          order.items = items;
          resolve(order);
        });
      });
    });
  }

  /**
   * Get orders for a user
   * @param {number} userId - User ID
   * @returns {Promise} - Resolves with array of orders
   */
  static getByUser(userId) {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId], (err, orders) => {
        if (err) return reject(err);
        resolve(orders || []);
      });
    });
  }

  /**
   * Update order status
   * @param {number} id - Order ID
   * @param {string} status - New status
   * @returns {Promise} - Resolves with updated order
   */
  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, id],
        function(err) {
          if (err) return reject(err);
          
          if (this.changes === 0) {
            return reject(new Error('Order not found'));
          }
          
          Order.findById(id)
            .then(order => resolve(order))
            .catch(err => reject(err));
        }
      );
    });
  }

  /**
   * Get detailed order with user and course information
   * @param {number} id - Order ID
   * @returns {Promise} - Resolves with detailed order
   */
  static getDetailedOrder(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT o.*, u.name, u.email
        FROM orders o
        INNER JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [id], (err, order) => {
        if (err) return reject(err);
        
        if (!order) {
          return resolve(null);
        }
        
        // Get order items with course details
        db.all(`
          SELECT oi.*, c.title, c.description, c.image_path, c.duration
          FROM order_items oi
          INNER JOIN courses c ON oi.course_id = c.id
          WHERE oi.order_id = ?
        `, [id], (err, items) => {
          if (err) return reject(err);
          
          order.items = items.map(item => ({
            ...item,
            course: {
              id: item.course_id,
              title: item.title,
              description: item.description,
              image_path: item.image_path,
              duration: item.duration
            }
          }));
          
          order.user = {
            id: order.user_id,
            name: order.name,
            email: order.email
          };
          
          // Clean up duplicated fields
          delete order.name;
          delete order.email;
          
          resolve(order);
        });
      });
    });
  }
  /**
 * Get total count of orders
 * @returns {Promise} - Resolves with the count
 */
static count() {
    return new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM orders", (err, result) => {
        if (err) return reject(err);
        resolve(result ? result.count : 0);
      });
    });
  }
  
  /**
   * Get total revenue from all completed orders
   * @returns {Promise} - Resolves with the total amount
   */
  static getTotalRevenue() {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT SUM(total_amount) as revenue FROM orders WHERE status = 'completed'",
        (err, result) => {
          if (err) return reject(err);
          resolve(result ? (result.revenue || 0) : 0);
        }
      );
    });
  }
}

module.exports = Order;