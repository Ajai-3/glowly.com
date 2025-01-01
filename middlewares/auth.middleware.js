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

    if (restrictedUrls.includes(req.path)) {
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET_KEY);
                // console.log('Decoded JWT:', decoded);
                if (decoded) {
                    return res.redirect("/home");
                }
            } catch (error) {
                console.error("JWT Verification Error:", error);
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
            console.error("JWT Verification Error:", error.message);
            return next(); 
        }
    } else {
        return res.redirect("/home"); 
    }
};



