const db = require('../db/db');
const bcrypt = require('bcrypt');

class User {
  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise} - Resolves with user object or null
   */
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get("SELECT id, name, email, created_at FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return reject(err);
        resolve(user || null);
      });
    });
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise} - Resolves with user object or null
   */
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (err) return reject(err);
        resolve(user || null);
      });
    });
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
    
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hashedPassword],
        function(err) {
          if (err) return reject(err);
          
          // Get and return the created user
          User.findById(this.lastID)
            .then(user => resolve(user))
            .catch(err => reject(err));
        }
      );
    });
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
      return User.findById(id);
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(id);
    
    return new Promise((resolve, reject) => {
      db.run(`UPDATE users SET ${setClause} WHERE id = ?`, values, function(err) {
        if (err) return reject(err);
        
        User.findById(id)
          .then(user => resolve(user))
          .catch(err => reject(err));
      });
    });
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} newPassword - New password
   * @returns {Promise} - Resolves with boolean success
   */
  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, id],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Validate user credentials
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise} - Resolves with user object or null if invalid
   */
  static async authenticate(email, password) {
    try {
      const user = await User.findByEmail(email);
      
      if (!user) return null;
      
      const match = await bcrypt.compare(password, user.password);
      
      if (!match) return null;
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise} - Resolves with boolean success
   */
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }
  /**
     * Get all users
     * @returns {Promise} - Resolves with array of users
     */
    static getAll() {
        return new Promise((resolve, reject) => {
        db.all(
            "SELECT id, name, email, is_admin, created_at FROM users ORDER BY id",
            (err, users) => {
            if (err) return reject(err);
            resolve(users || []);
            }
        );
        });
    }
}

module.exports = User;