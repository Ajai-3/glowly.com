import nodemailer from "nodemailer"
import dotenv from "dotenv";dotenv.config();

export const sendOTPToUserEmail = async (email, OTP) => {
   try {
     
    const transporter = nodemailer.createTransport({
        service: 'gmail',
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