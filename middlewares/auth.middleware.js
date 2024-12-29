import jwt from "jsonwebtoken";
import dotenv from "dotenv"; dotenv.config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

export const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    const restrictedUrls = [
        '/login',
        '/signup',
        '/forgot-password',
        '/new-password',
        '/otp-verification',
        '/page-not-found',
    ];

    if (restrictedUrls.includes(req.originalUrl)) {
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET_KEY);
                if (decoded) {
                    return res.redirect("/home");
                }
            } catch (error) {
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
            return next();
        }
    } else {
        return next();
    }
};

