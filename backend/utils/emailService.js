const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // Configuration for Gmail and other providers
  const emailUser = process.env.EMAIL_USER;
  
  // Determine email service based on domain
  let transportConfig;
  
  if (emailUser && emailUser.includes('@gmail.com')) {
    // Gmail configuration
    transportConfig = {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };
  } else {
    // Generic SMTP configuration for other email providers
    transportConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    };
  }
  
  return nodemailer.createTransport(transportConfig);
};

/**
 * Send verification email to user
 */
const sendVerificationEmail = async (email, firstName, verificationToken) => {
  try {
    console.log('Attempting to send verification email to:', email);
    const transporter = createTransporter();
    
    // Verify transporter configuration
    await transporter.verify();
    console.log('Email transporter verified successfully');
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;
    
    const mailOptions = {
      from: `"SecureBank" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your SecureBank Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SecureBank!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Thank you for registering with SecureBank. To complete your registration and activate your account, please verify your email address.</p>
              <p>Click the button below to verify your email:</p>
              <center>
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </center>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with SecureBank, please ignore this email.</p>
              <div class="footer">
                <p>© 2025 SecureBank. All rights reserved.</p>
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email after verification
 */
const sendWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SecureBank" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to SecureBank - Account Verified!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { margin: 15px 0; padding: 10px; background: white; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Your Account is Verified!</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${firstName}!</h2>
              <p>Your email has been successfully verified and your SecureBank account is now active.</p>
              <p><strong>Here's what you can do now:</strong></p>
              <div class="feature">✅ Transfer money securely</div>
              <div class="feature">✅ View transaction history</div>
              <div class="feature">✅ Enable biometric authentication</div>
              <div class="feature">✅ Monitor your account 24/7</div>
              <p>Your account comes with a welcome bonus already credited to your balance!</p>
              <p>For security, we recommend enabling two-factor authentication in your account settings.</p>
              <div class="footer">
                <p>© 2025 SecureBank. All rights reserved.</p>
                <p>Need help? Contact our support team anytime.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
};
