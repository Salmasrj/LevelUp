const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

// Create a configurable transporter based on environment
function createTransporter() {
  if (process.env.DISABLE_EMAILS === 'true') {
    console.log('📧 Email sending is DISABLED. Emails will be logged instead.');
    
    // Return a mock transporter that just logs
    return {
      sendMail: (mailOptions, callback) => {
        console.log('📧 [MOCK EMAIL]');
        console.log(`📧 To: ${mailOptions.to}`);
        console.log(`📧 Subject: ${mailOptions.subject}`);
        console.log('📧 Email content would be sent (not showing for brevity)');
        
        if (callback) callback(null, { response: 'Email disabled, logging only' });
        return Promise.resolve({ response: 'Email disabled, logging only' });
      }
    };
  }
  
  // If emails are enabled, use the real transporter
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

const transporter = createTransporter();

// Send an email with a rendered template
async function sendEmail(to, subject, template, data) {
  try {
    // Render the template
    const templatePath = path.join(__dirname, '..', 'views', 'emails', `${template}.ejs`);
    const html = await ejs.renderFile(templatePath, data);
    
    // Send the email
    const info = await transporter.sendMail({
      from: `"LevelUp" <${process.env.EMAIL_USER || 'noreply@levelup.com'}>`,
      to,
      subject,
      html
    });
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = { sendEmail };