const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send email
async function sendEmail(to, subject, template, data) {
    try {
      const templatePath = path.join(__dirname, '../views/emails', `${template}.ejs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Add BASE_URL to the data object
      const templateData = {
        ...data,
        process: {
          env: {
            BASE_URL: process.env.BASE_URL || 'http://localhost:3000'
          }
        }
      };
      
      const html = ejs.render(templateContent, templateData);
      
      const mailOptions = {
        from: `"LevelUp" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };
      
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
}

module.exports = { sendEmail };