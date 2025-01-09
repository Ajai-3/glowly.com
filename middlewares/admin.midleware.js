import jwt from "jsonwebtoken";

export const pageMiddlware = (req, res, next) => {
    res.locals.currentPath = req.path;
    next();
}  
export const verifyAdminToken = (req, res, next) => {
    const token = req.cookies.adminToken;

    if (!token) {
        return res.render("admin/admin-login", { 
            msg: { type: "error", msg: "Please log in to access the admin panel" } 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.admin = decoded;

        if (req.path === "/admin-login") {
            return res.render("admin/dashboard", { 
                admin: req.admin 
            });
        }

        next();
    } catch (error) {
        console.error("Token verification error:", error.message);
        res.clearCookie("adminToken");
        return res.render("admin/admin-login", { msg: "Invalid or expired token. Please log in again." });
    }
};



