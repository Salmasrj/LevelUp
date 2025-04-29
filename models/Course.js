const db = require('../db/db');

class Course {
  /**
   * Get all courses
   * @returns {Promise} - Resolves with array of courses
   */
  static getAll() {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM courses", (err, courses) => {
        if (err) return reject(err);
        resolve(courses || []);
      });
    });
  }

  /**
   * Find course by ID
   * @param {number} id - Course ID
   * @returns {Promise} - Resolves with course object or null
   */
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM courses WHERE id = ?", [id], (err, course) => {
        if (err) return reject(err);
        resolve(course || null);
      });
    });
  }

  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @returns {Promise} - Resolves with created course object
   */
  static create(courseData) {
    const { title, description, price, duration, image_path } = courseData;
    
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO courses (title, description, price, duration, image_path) VALUES (?, ?, ?, ?, ?)",
        [title, description, price, duration, image_path],
        function(err) {
          if (err) return reject(err);
          
          // Get and return the created course
          Course.findById(this.lastID)
            .then(course => resolve(course))
            .catch(err => reject(err));
        }
      );
    });
  }

  /**
     * Get total count of courses
     * @returns {Promise} - Resolves with the count
     */
    static count() {
        return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM courses", (err, result) => {
            if (err) return reject(err);
            resolve(result ? result.count : 0);
        });
        });
    }

  /**
   * Update course information
   * @param {number} id - Course ID
   * @param {Object} updates - Fields to update
   * @returns {Promise} - Resolves with updated course
   */
  static update(id, updates) {
    const allowedFields = ['title', 'description', 'price', 'duration', 'image_path'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) {
      return Course.findById(id);
    }
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(id);
    
    return new Promise((resolve, reject) => {
      db.run(`UPDATE courses SET ${setClause} WHERE id = ?`, values, function(err) {
        if (err) return reject(err);
        
        Course.findById(id)
          .then(course => resolve(course))
          .catch(err => reject(err));
      });
    });
  }

  /**
   * Delete a course
   * @param {number} id - Course ID
   * @returns {Promise} - Resolves with boolean success
   */
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM courses WHERE id = ?", [id], function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }

  /**
     * Get courses purchased by a user with actual progress
     * @param {number} userId - User ID
     * @returns {Promise} - Resolves with array of courses with progress
     */
    static getPurchasedByUser(userId) {
        return new Promise((resolve, reject) => {
        db.all(`
            SELECT c.*, oi.price, 
            COALESCE(up.progress, 0) as progress
            FROM courses c
            INNER JOIN order_items oi ON c.id = oi.course_id
            INNER JOIN orders o ON oi.order_id = o.id
            LEFT JOIN user_progress up ON c.id = up.course_id AND o.user_id = up.user_id
            WHERE o.user_id = ? AND o.status = 'completed'
            GROUP BY c.id
        `, [userId], (err, courses) => {
            if (err) return reject(err);
            resolve(courses || []);
        });
        });
    }
  
  /**
   * Update user progress in a course
   * @param {number} userId - User ID
   * @param {number} courseId - Course ID
   * @param {number} progress - Progress percentage (0-100)
   * @returns {Promise} - Resolves with boolean success
   */
  static updateProgress(userId, courseId, progress) {
    return new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO user_progress (user_id, course_id, progress, last_activity)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, course_id) 
        DO UPDATE SET progress = ?, last_activity = CURRENT_TIMESTAMP
      `, [userId, courseId, progress, progress], function(err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      });
    });
  }
}

module.exports = Course;