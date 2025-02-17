import crypto from 'crypto';
import nodemailer from "nodemailer"
import dotenv from "dotenv";dotenv.config();


// ========================================================================================
// GENERATE RANDOM STRING FOR RESEND EMAIL
// ========================================================================================
// This function generates a random string to be used for resending email verification.
// ========================================================================================
export const generateResetCode = () => {
  return crypto.randomBytes(20).toString('hex');
};

// ========================================================================================
// GENERATE OTP
// ========================================================================================
// This function generates a one-time password (OTP) for authentication or verification.
// ========================================================================================
export const  generateOTP = () => {
  const OTP = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryTime = Date.now() + 5 * 60 * 1000; 
  return { OTP, expiryTime }
}

// ========================================================================================
// GENERATE REFERRAL CODE
// ========================================================================================
// This function generates a unique referral code for users to share and earn rewards.
// ========================================================================================
export const generateReferralCode = (length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let referralCode = '';
  for (let i = 0; i < length; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return referralCode;
}

// ========================================================================================
// SEND OTP TO USER EMAIL
// ========================================================================================
// This function generates a one-time password (OTP) and sends it to the user's email 
// for authentication or verification purposes.
// ========================================================================================
export const sendOTPToUserEmail = async (email, OTP) => {
   try {
     
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",  
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    })

    const info = await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "Your OTP for Glowly E-commerce Registration", 
        text: `Hi, 
               Thank you for registering with Glowly E-commerce! 
               Your OTP is: ${OTP}.
               If you didn't request this OTP, please ignore this message.
               Best regards, 
               Glowly Team`,  
        html: `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f7f7f7;
              }
              .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                padding: 20px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              }
              .header {
                background-color: #e80071;
                padding: 20px;
                text-align: center;
                color: white;
              }
              .content {
                padding: 20px;
                font-size: 16px;
                color: #333333;
              }
              .otp {
                font-size: 24px;
                font-weight: bold;
                color: #e80071;
                margin-top: 20px;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                color: #888888;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Glowly E-commerce</h1>
              </div>
              <div class="content">
                <p>Hi,</p>
                <p>Thank you for registering with Glowly E-commerce! To complete your registration, please use the following One-Time Password (OTP):</p>
                <div class="otp">${OTP}</div>
                <p>If you did not request this OTP, please ignore this message.</p>
                <p>Best regards,</p>
                <p><strong>Glowly Team</strong></p>
              </div>
              <div class="footer">
                <p>© 2024 Glowly E-commerce. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,  // Your styled HTML content
    });

    return info.accepted.length > 0
   } catch (error) {
      console.error("Error sending email.", error);
      return false
   }
}


// ========================================================================================
// SEND RESET PASSWORD EMAIL
// ========================================================================================
// This function sends an email to the user with a reset password link or OTP 
// to help them securely reset their account password.
// ========================================================================================
export const sendResetPasswordEmail = async (email, resetPasswordUrl) => {
  try {
      // Create a transporter object for nodemailer (example with Gmail)
      const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
              user: process.env.NODEMAILER_EMAIL, 
              pass: process.env.NODEMAILER_PASSWORD
          },
      });

      // Email content
      const mailOptions = {
          from: process.env.NODEMAILER_EMAIL,  
          to: email,
          subject: 'Password Reset Request',
          html: `
              <html>
                  <head>
                      <style>
                          body {
                              font-family: Arial, sans-serif;
                              margin: 0;
                              padding: 0;
                              background-color: #f7f7f7;
                          }
                          .container {
                              width: 100%;
                              max-width: 600px;
                              margin: 0 auto;
                              background-color: #ffffff;
                              padding: 20px;
                              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                          }
                          .header {
                              background-color: #e80071;
                              padding: 20px;
                              text-align: center;
                              color: white;
                          }
                          .content {
                              padding: 20px;
                              font-size: 16px;
                              color: #333333;
                          }
                          .otp {
                              font-size: 24px;
                              font-weight: bold;
                              color: #e80071;
                              margin-top: 20px;
                          }
                          .footer {
                              text-align: center;
                              font-size: 12px;
                              color: #888888;
                              margin-top: 30px;
                          }
                          a {
                              color: #e80071;
                              text-decoration: none;
                          }
                      </style>
                  </head>
                  <body>
                      <div class="container">
                          <div class="header">
                              <h1>Glowly E-commerce</h1>
                          </div>
                          <div class="content">
                              <p>Hi,</p>
                              <p>You requested a password reset for your Glowly E-commerce account.</p>
                              <p>To reset your password, click the link below:</p>
                              <p>This link will expire after 6 minutes. </p>
                              <p><a href="${resetPasswordUrl}">Reset Password</a></p>
                              <p>If you didn't request this, please ignore this email.</p>
                              <p>Best regards,</p>
                              <p><strong>Glowly Team</strong></p>
                          </div>
                          <div class="footer">
                              <p>© 2024 Glowly E-commerce. All rights reserved.</p>
                          </div>
                      </div>
                  </body>
              </html>
          `,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      return info.accepted.length > 0;
  } catch (error) {
      console.error("Error sending OTP email:", error);
      return false;
  }
};

