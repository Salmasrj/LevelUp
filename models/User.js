const pool = require('../db/db');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise} - Resolves with user object or null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        [id]
      );
      
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error finding user by ID:', err);
      throw err;
    }
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise} - Resolves with user object or null
   */
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error finding user by email:', err);
      throw err;
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data (name, email, password)
   * @returns {Promise} - Resolves with created user object
   */
  static async create(userData) {
    const { name, email, password } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const result = await pool.query(
        "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
        [name, email, hashedPassword]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  }

  /**
   * Update user information
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise} - Resolves with updated user
   */
  static async update(id, updates) {
    const allowedFields = ['name', 'email'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    // Build dynamic query
    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(id); // Add ID for WHERE clause
    
    try {
      const result = await pool.query(
        `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1} RETURNING id, name, email, created_at`,
        values
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} newPassword - New password
   * @returns {Promise} - Resolves with boolean success
   */
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    try {
      const result = await pool.query(
        "UPDATE users SET password = $1 WHERE id = $2",
        [hashedPassword, id]
      );
      
      return result.rowCount > 0;
    } catch (err) {
      console.error('Error updating password:', err);
      throw err;
    }
  }

  /**
   * Validate user credentials
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise} - Resolves with user object or null if invalid
   */
  static async authenticate(email, password) {
    try {
      const user = await this.findByEmail(email);
      
      if (!user) return null;
      
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) return null;
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise} - Resolves with boolean success
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1",
        [id]
      );
      
      return result.rowCount > 0;
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  }

  /**
   * Get all users
   * @returns {Promise} - Resolves with array of users
   */
  static async getAll() {
    try {
      const result = await pool.query(
        "SELECT id, name, email, is_admin, created_at FROM users ORDER BY id"
      );
      
      return result.rows;
    } catch (err) {
      console.error('Error getting all users:', err);
      throw err;
    }
  }
  
  /**
   * Get total count of users
   * @returns {Promise} - Resolves with the count
   */
  static async count() {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM users");
      return parseInt(result.rows[0].count);
    } catch (err) {
      console.error('Error counting users:', err);
      throw err;
    }
  }
}

module.exports = User;