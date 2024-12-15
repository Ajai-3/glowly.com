import bcrypt from "bcrypt";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import User from "../../models/user.model.js";
dotenv.config();


/////////////////////////////////////////////////////////////////////////////
//////////////////////////RENDER PAGES///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

// Render Home Page
export const renderHomePage = (req, res) => {
    return res.render('user/home')
}
// Render Login Page
export const renderLoginPage = (req, res) => {
    const msg = req.flash('msg');
    return res.render('user/login', { msg })
}
// Render Signup Page
export const renderSignupPage = (req, res) => {
    const msg = req.flash('msg');
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
    console.log("Transporter initialized:", transporter);

    const info = await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "Verify your account",
        text: `Your OTP is ${OTP}`,
        html: `<b>Your OTP: ${OTP}<b>`,
    })

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
        // Check The User Email Is Exist Or Not
        const userExists = await User.findOne({ email });
        if (userExists) {
            req.flash('msg', "User with this email already exists.")
            return res.render("user/signup", { msg: req.flash('msg') })
        }
        // Check The Phone No Is Exist Or Not
        const userPhoneNoExists = await User.findOne({ phone_no });
        if (userPhoneNoExists) {
            req.flash('msg', "User with this phone number already exists.")
            return res.render("user/signup", { msg: req.flash('msg') })
        }
        // Check The Password Is Matching Or Not
        if (password !== repeatPassword) {
            req.flash('msg', "Password do not match.")
            return res.render("user/signup", { msg: req.flash('msg') })
        } 
        // Genarate OTP & Expiry Time
        const { OTP, expiryTime } = generateOTP();
        req.session.otp = OTP;
        req.session.userOTP = OTP;
        req.session.otpExpiriy = expiryTime;
        req.session.userData = { name, phone_no, email, password };

        const sendOTPEmail = await sendOTPToUserEmail(email, OTP);
        if (!sendOTPEmail) {
            req.flash('msg', 'Error sending OTP to your email.');
            return res.redirect('user/signup', { msg: req.flash('msg') });
        }

        res.render("user/otp-verification");
        console.log("OTP send", OTP)
    } catch (error) {
        console.error("Signup error", error);
        res.redirect("user/page-not-found")

    }
}

// Hndle OTP Verification
export const handleOTPVerification = async (req, res) => {
    try {
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

        await saveUserData.save()
        // Save The User ID To The Session 
        // req.session.user = saveUserData._id;
        req.flash('msg', { type: 'success', msg: "Signup Successful, login now" });
        return res.status(200).json({
            success: true,
            message: "Signup Successful, login now!",
            redirectUrl: "/user/login", // Redirect to login page
        });
        // return res.render('user/login', { msg: req.flash('msg') });        
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
       const { email } = req.session.userData;
       if (!email) {
        return res.status(400).json({ success: false, msg: "Email not found in sessiom" })
       } 
       const OTP = generateOTP();
       req.session.userOTP = OTP;

       const sendOTPEmail = await sendOTPToUserEmail(email, OTP);
       if (sendOTPEmail) {
        console.log("Resend OTP : ", OTP);
        res.status(200).json({success: true, msg: "OTP Rsend successfully" })
       } else {
        res.status(500).json({ success: false, msg: "Failed to resend OTP." })
       }
    } catch (error) {
        console.error("Error resending OTP.", error)
        res.status(500).json({ success:false, msg: "Internal server Error. Please try again" })
    }
}

// Handle User Login
export const handleUserLogin = (req, res) => {

}
