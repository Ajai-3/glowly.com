import jwt from "jsonwebtoken";
import dotenv from "dotenv"; dotenv.config();
import User from "../models/user.model.js"
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

export const verifyToken = async (req, res, next) => {
    const token = req.cookies.token;

    // List of restricted URLs
    const restrictedUrls = [
        '/login',
        '/signup',
        '/otp-message',
        '/new-password',
        '/forgot-password',
        '/otp-verification',
    ];

    const resetPasswordPattern = /^\/reset-password\/[a-f0-9]{24}$/;
    if (resetPasswordPattern.test(req.path)) {
        if (!token) {
            return next(); 
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET_KEY);
            if (decoded) {
                return res.redirect("/home"); 
            }
        } catch (error) {
            // console.error("JWT Verification Error:", error);
            return next(); 
        }
    }
    if (resetPasswordPattern.test(req.path)) {
        if (!token) {
            return next(); 
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET_KEY);
            if (decoded) {
                return res.redirect("/home");
            }
        } catch (error) {
            // console.error("JWT Verification Error:", error);
            return next();
        }
    }
    
    if (restrictedUrls.includes(req.path)) {
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET_KEY);
                if (decoded) {
                    return res.redirect("/home");
                }
            } catch (error) {
                // console.error("JWT Verification Error:", error);
                return next();
            }
        }
        return next(); 
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET_KEY);
            if (decoded) {
                return next(); 
            }
        } catch (error) {
            // console.error("JWT Verification Error:", error.message);
            return res.redirect("/login"); 
        }
    } else {
        return res.redirect("/home"); 
    }
};



