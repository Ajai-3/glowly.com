import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";dotenv.config();
import { generateOTP, generateResetCode, sendOTPToUserEmail, sendResetPasswordEmail } from "../../helpers/email.js";
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
    const msg = req.session.msg || null;  
    req.session.msg = null  
    return res.render('user/forgot-password', { msg })
}
// Render New Password Page
export const renderNewPasswordPage = async (req, res) => {
    try {
        const { code } = req.params;
        let msg = '';
        
        const user = await User.findOne({
            resetPasswordCode: code,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            req.session.msg = { type: "error", msg: "Reset link is expired or invalid." };
            return res.redirect('/login');
        }

        return res.render('user/new-password', { email: user.email, msg });
    } catch (error) {
        console.log("Erorr rendering new password page", error)
    }
}





/////////////////////////////////////////////////////////////////////////////
/////////////////////////// USER OPERATIONS /////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

// Genarate OTP For The Signup And The Forgot Passsword
// function generateOTP () {
//     const OTP = Math.floor(100000 + Math.random() * 900000).toString();
//     const expiryTime = Date.now() + 5 * 60 * 1000; 
//     return { OTP, expiryTime }
// }


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

        console.log("OTP sent", OTP);
        return res.redirect("user/otp-message");

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
            redirectUrl: "/home", 
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
        const user = req.session.userData;
        // console.log("User", user);

        if (!user) {
            console.error("User data not passed");
            return res.status(400).json({ success: false, msg: "User not authenticated." });
        }

        const email = user.email;
        const phone_no = user.phone_no;

        // console.log("User data from decoded token - Email:", email, "Phone:", phone_no);

        // Generate new OTP
        const { OTP, expiryTime } = generateOTP();
        // console.log("Generated OTP:", OTP);

        req.session.userOTP = OTP; 
        console.log("OTP stored in session:", req.session.userOTP);

        const sendOTPEmail = await sendOTPToUserEmail(email, OTP); 
        // console.log("Send OTP Result:", sendOTPEmail);

        if (!sendOTPEmail) {
            console.error("Error sending OTP");
            return res.status(500).json({ success: false, msg: "Error sending OTP. Please try again later." });
        }

        return res.status(200).json({ success: true, msg: "OTP resent successfully." });
    } catch (error) {
        console.error("Error in resend OTP:", error);
        return res.status(500).json({ success: false, msg: "Something went wrong, please try again later." });
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
            const msg = { type: 'error', msg: "Account blocked by Admin...!" };
            return res.render("user/login", { msg });

        }

        // Compare The Password
        const passwordMatch = await bcrypt.compare(password, user.password);

        // If The Password Dosn't Match
        if (!passwordMatch) {
            const msg = { type: 'error', msg: "Invalid Credential..!" };
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

// Hndle The Forgot Password
export const handleForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const existUser = await User.findOne({ email, role: 'user' })
        if (!existUser) {
            const msg = { type: 'error', msg: "No user found with this email." };
            return res.render("user/forgot-password", { msg });
        }

        const resetCode = generateResetCode();
        const expiryTime = Date.now() + 6 * 60 * 1000; // 6 Minuts


        existUser.resetPasswordCode = resetCode;
        existUser.resetPasswordExpires = expiryTime;
        await existUser.save();


        const resetPasswordUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetCode}`;

        const sendResetEmail = await sendResetPasswordEmail(email, resetPasswordUrl);
        if (!sendResetEmail) {
            const msg = { type: 'error', msg: "Error sending reset link to your email." };
            return res.render("user/forgot-password", { msg });
        }

        req.session.msg = { type: "success", msg: "Password reset link sent to your email." };
        return res.redirect("user/forgot-password");  

    } catch (error) {
        console.error("Error in forgot password", error);

    }
}

// Reset Password
export const handleResetPassword = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render("user/new-password", { email, msg: "Passwords do not match" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.render("user/new-password", { email, msg: "User not found" });
        }

        const updatedPassword = await hashedPassword(password);
        user.password = updatedPassword;

        user.resetPasswordCode = undefined; 
        user.resetPasswordExpires = undefined; 
        await user.save();

        req.session.msg = { type: "success", msg: "Password reset successful. Please log in." };
        return res.redirect("/user/login");
    } catch (error) {
        console.error("Error resetting password", error);
        return res.redirect("/page-not-found");
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
            return res.redirect("/home");
        });
    } catch (error) {
        console.error("Unexpected error during logout:", error);
        return res.status(500).send("Server error during logout");
    }
};

