import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";dotenv.config();
import Brand from "../../models/brand.model.js"
import Product from "../../models/product.model.js"
import Category from "../../models/category.model.js";
import User from "../../models/user.model.js";



/////////////////////////////////////////////////////////////////////////////
//////////////////////////RENDER PAGES///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

// Render Home Page



// Render Login Page
export const renderLoginPage = (req, res) => {
    const msg = req.session.msg || null; 
    req.session.msg = null
    return res.render('user/login', { msg })
}
// Render Signup Page
export const renderSignupPage = (req, res) => {
    const msg = req.session.msg || null; 
    return res.render('user/signup', { msg })
}
// Render OTP Message Page
export const renderOtpStatusPage = (req, res) => {
    return res.render('user/otp-message')
}
// Render OTP Verification Page
export const renderpOtpVerificationPage = (req, res) => {
    return res.render('user/otp-verification')
}
// Render Forgot Password Page
export const renderForgotPasswordPage = (req, res) => {
    return res.render('user/forgot-password')
}
// Render New Password Page
export const renderNewPasswordPage = (req, res) => {
    return res.render('user/new-password')
}





/////////////////////////////////////////////////////////////////////////////
/////////////////////////// USER OPERATIONS /////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

// Genarate OTP For The Signup And The Forgot Passsword
function generateOTP () {
    const OTP = Math.floor(100000 + Math.random() * 900000).toString();
    // OTP Will Expire After 5 Minutes
    const expiryTime = Date.now() + 5 * 60 * 1000; 
    return { OTP, expiryTime }
}

// Send The OTP To The User
async function sendOTPToUserEmail (email, OTP) {
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
    // console.log("Transporter initialized:", transporter);

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

// Hashed Password
const hashedPassword= async (password) => {
     try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
     } catch (error) {
        console.error("Error in password hashing", error)
     }
}

// Handle User Signup
export const handleUserSignup = async (req, res) => {
    const { name, phone_no, email, password, repeatPassword } = req.body;

    try {
        // Check If The User Email Already Exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            const msg = "User with this email already exists.";
            return res.render("user/signup", { msg });
        }

        // Check If The Phone Number Already Exists
        const userPhoneNoExists = await User.findOne({ phone_no });
        if (userPhoneNoExists) {
            const msg = "Phone number already in use.";
            return res.render("user/signup", { msg });
        }

        // Check if the passwords match
        if (password !== repeatPassword) {
            const msg = "Passwords do not match.";
            return res.render("user/signup", { msg });
        }

        // Generate OTP and expiry time
        const { OTP, expiryTime } = generateOTP();
        req.session.otp = OTP;
        req.session.userOTP = OTP;
        req.session.otpExpiriy = expiryTime;
        req.session.userData = { name, phone_no, email, password };

        // Send OTP to the user email
        const sendOTPEmail = await sendOTPToUserEmail(email, OTP);
        if (!sendOTPEmail) {
            const msg = "Error sending OTP to your email.";
            return res.render("user/signup", { msg });
        }

        res.render("user/otp-message");
        console.log("OTP sent", OTP);
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("/page-not-found");
    }
};


// Hndle OTP Verification
export const handleOTPVerification = async (req, res) => {
    try {
        req.session.msg = "Successful Login now";
        req.session.type = "success";
        
       const { otp } = req.body;
       //  Compare OTP From Session And User's Input 
       if (String(otp).trim() === String(req.session.userOTP).trim()) {
          const user = req.session.userData;
          const passwordHash = await hashedPassword(user.password);
          // Save The User Data To The Database
          const saveUserData = new User({
            name: user.name,
            phone_no: user.phone_no,
            email: user.email,
            password: passwordHash
        })

        await saveUserData.save();

        const token = jwt.sign(
            { userId: saveUserData._id, name: saveUserData.name },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, { httpOnly: true, secure: true });
        // req.session.token = token;

        return res.status(200).json({
            success: true,
            message: "Signup Successful, login now!",
            redirectUrl: "/login", 
        });
     
       } else {
        // OTP Is Incorrect
         res.status(400).json({ success: false, msg: "Invalid OTP Please try again." })
       }
    } catch (error) {
       console.error("Error in verifing OTP", error)
       res.status(500).json({ success: false, msg: "An error occurs" })
    }
}

// Hnadle The Resed OTP
export const handleResendOTP = async (req, res) => {
    try {
        const token = req.cookies.token;
        
        if (!token) {
            return res.status(400).json({ success: false, msg: "User not authenticated." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        if (!decoded) {
            return res.status(401).json({ success: false, msg: "Invalid token. Please log in again." });
        }

        const { email, phone_no } = decoded;

        const otp = generateOTP();
        req.session.userOTP = otp;

        await sendOtpToUser(email, phone_no, otp);

        return res.status(200).json({ success: true, msg: "OTP resent successfully." });

    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, msg: "Error resending OTP. Please try again later." });
    }
};

// Handle User Login
export const handleUserLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        // console.log(req.body)

        // Finding The User
        const user = await User.findOne({ email, role: 'user' });
        // If The User Is Not Found
        if (!user) {
            const msg = { type: "error", msg: "User Not Found" };
            return res.render("user/login", { msg });

        }
        // Check The User Is Blocked By Admin
        if (user.status === 'blocked') {
            const msg = { type: 'error', msg: "Account blocked by admin...!" };
            return res.render("user/login", { msg });

        }

        // Compare The Password
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If The Password Dosn't Match
        if (!passwordMatch) {
            const msg = { type: 'error', msg: "Invalid Password" };
            return res.render("user/login", { msg });            
        }

        // JWT Token
        const token = jwt.sign(
            { userId: user._id, name: user.name },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' }
        )
        res.cookie('token', token, { httpOnly: true, secure: true });
        // req.session.token = token;

        // Redirect to the home page
        return res.redirect("/home");

    } catch (error) {
        console.error("Login error", error);
        const msg = { type: "error", msg: "Login Failed...Try again later" };
        res.render("user/login", { msg });
    }
}
// Hnadle The Login With Google Account
export const googleCallbackHandler = async (req, res) => {
    try {
        // Check if the user is blocked
        if (req.user.status === 'blocked') {
            req.logout((err) => {
                if (err) {
                    console.error("Logout error:", err);
                    return res.status(500).send("An error occurred during logout");
                }
                const msg = { type: 'error', msg: "Account blocked by admin...!" };
                return res.render('user/login', { msg });
            });
            return;
        }

        const existingUser = await User.findOne({ email: req.user.email });

        if (existingUser) {
            if (!existingUser.googleId) {
                const msg = { type: 'error', msg: "Google ID is missing. Please log in again." };
                return res.render('user/login', { msg });
            }
            req.session.user = { 
                _id: existingUser._id, 
                name: existingUser.name,
            };

            // JWT Token
            const token = jwt.sign(
                { userId: existingUser._id, name: existingUser.name },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '1h' }
            );
            res.cookie('token', token, { httpOnly: true, secure: true });

            return res.redirect("/home");
        } else {
            return res.status(400).send("User not found.");
        }

    } catch (error) {
        console.error("Error in Google callback handler:", error);
        res.status(500).send("An error occurred during authentication");
    }
};



// Handle Page Not Found 
export const pageNotFound = async (req, res) => {
    try {
        return res.render("user/page-404");
    } catch (error) {
        console.error("Error in rendering page-not-found", error);
        res.redirect("user/page-not-found");
    }
};

// Handle The User Logout
export const handleUserLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
                return res.status(500).send("Error during logout");
            }
            res.clearCookie('token');
            // Redirect to the login or home page
            return res.redirect("/home");
        });
    } catch (error) {
        console.error("Unexpected error during logout:", error);
        return res.status(500).send("Server error during logout");
    }
};

