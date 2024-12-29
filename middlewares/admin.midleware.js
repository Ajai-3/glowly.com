import jwt from "jsonwebtoken";

export const pageMiddlware = (req, res, next) => {
    res.locals.currentPath = req.path;
    next();
}  

export const verifyAdminToken = (req, res, next) => {
    const token = req.cookies.adminToken;

    // If the user is already logged in, redirect them to the dashboard or another page
    if (req.path === "/admin-login" && token) {
        return res.redirect("/admin/dashboard");  // Redirect to dashboard if logged in
    }

    // Skip the token check for non-login pages
    if (req.path === "/admin-login") {
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (decoded.role !== 'admin') {
            return res.redirect("/admin-login?msg=Unauthorized");
        }

        req.admin = decoded; // Attach admin info to the request
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.redirect("/admin-login?msg=Session%20expired");
    }
};

