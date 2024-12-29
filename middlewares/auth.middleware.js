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





// export const authMiddleware = async (req, res, next) => {
//     try {
//         const isLoggedIn = req.session.user;
        
//         // If the user is logged in and trying to access login/signup pages, redirect them to home page
//         if (isLoggedIn && (req.path === '/login' || req.path === '/signup' || req.path === '/forgot-password' || req.path === '/new-password' || req.path === '/otp-verification')) {
//             return res.redirect('/');
//         }

//         // If the user is not logged in and trying to access restricted pages, redirect them to login page
//         if (!isLoggedIn && (req.path !== '/login' && req.path !== '/signup' && req.path !== '/forgot-password' && req.path !== '/new-password' && req.path !== '/otp-verification')) {
//             return res.redirect("/login");
//         }

//         // Check if the user is blocked
//         if (isLoggedIn) {
//             const user = await User.findById(req.session.user._id); // Assuming the user id is stored in session

//             // If the user is blocked, redirect to the login page
//             if (user && user.blocked) {
//                 req.session.destroy(); // Destroy the session to log out the blocked user
//                 return res.redirect("/login"); // Redirect to login page
//             }
//         }

//         // Proceed to the next middleware or route if the user is not blocked and has valid access
//         return next();
//     } catch (error) {
//         console.error("Error in authMiddleware:", error);
//         res.redirect("/page-not-found"); // Redirect to a 404 page in case of error
//     }
// };