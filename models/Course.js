const pool = require('../db/db');

class Course {
  /**
   * Get all courses
   * @returns {Promise} - Resolves with array of courses
   */
  static async getAll() {
    try {
      const result = await pool.query("SELECT * FROM courses");
      return result.rows;
    } catch (err) {
      console.error('Error getting all courses:', err);
      throw err;
    }
  }

  /**
   * Find course by ID
   * @param {number} id - Course ID
   * @returns {Promise} - Resolves with course object or null
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        "SELECT * FROM courses WHERE id = $1",
        [id]
      );
      
      return result.rows[0] || null;
    } catch (err) {
      console.error('Error finding course by ID:', err);
      throw err;
    }
  }

  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @returns {Promise} - Resolves with created course object
   */
  static async create(courseData) {
    const { title, description, price, duration, image_path } = courseData;
    
    try {
      const result = await pool.query(
        "INSERT INTO courses (title, description, price, duration, image_path) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [title, description, price, duration, image_path]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error creating course:', err);
      throw err;
    }
  }

  /**
   * Get total count of courses
   * @returns {Promise} - Resolves with the count
   */
  static async count() {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM courses");
      return parseInt(result.rows[0].count);
    } catch (err) {
      console.error('Error counting courses:', err);
      throw err;
    }
  }

  /**
   * Update course information
   * @param {number} id - Course ID
   * @param {Object} updates - Fields to update
   * @returns {Promise} - Resolves with updated course
   */
  static async update(id, updates) {
    const allowedFields = ['title', 'description', 'price', 'duration', 'image_path'];
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
        `UPDATE courses SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error updating course:', err);
      throw err;
    }
  }

  /**
   * Delete a course
   * @param {number} id - Course ID
   * @returns {Promise} - Resolves with boolean success
   */
  static async delete(id) {
    try {
      const result = await pool.query(
        "DELETE FROM courses WHERE id = $1",
        [id]
      );
      
      return result.rowCount > 0;
    } catch (err) {
      console.error('Error deleting course:', err);
      throw err;
    }
  }

  /**
   * Get courses purchased by a user with actual progress
   * @param {number} userId - User ID
   * @returns {Promise} - Resolves with array of courses with progress
   */
  static async getPurchasedByUser(userId) {
    try {
      const result = await pool.query(`
        SELECT c.*, oi.price, 
        COALESCE(up.progress, 0) as progress
        FROM courses c
        INNER JOIN order_items oi ON c.id = oi.course_id
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN user_progress up ON c.id = up.course_id AND o.user_id = up.user_id
        WHERE o.user_id = $1 AND o.status = 'completed'
        GROUP BY c.id, oi.price, up.progress
      `, [userId]);
      
      return result.rows;
    } catch (err) {
      console.error('Error getting purchased courses:', err);
      throw err;
    }
  }
  
  /**
   * Update user progress in a course
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @param {number} progress - Progress percentage (0-100)
   * @returns {Promise} - Resolves with boolean success
   */
  static async updateProgress(userId, courseId, progress) {
    try {
      const result = await pool.query(`
        INSERT INTO user_progress (user_id, course_id, progress, last_activity)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, course_id) 
        DO UPDATE SET progress = $3, last_activity = CURRENT_TIMESTAMP
      `, [userId, courseId, progress]);
      
      return result.rowCount > 0;
    } catch (err) {
      console.error('Error updating course progress:', err);
      throw err;
    }
  }
}

module.exports = Course;