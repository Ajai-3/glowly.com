import jwt from "jsonwebtoken";

export const pageMiddlware = (req, res, next) => {
    res.locals.currentPath = req.path;
    next();
}  

export const verifyAdminToken = (req, res, next) => {
    if (req.path.startsWith('/admin')) {
        const token = req.cookies.adminToken;

        if (req.path === "/admin-login" && token) {
            return res.redirect("/admin/dashboard");
        }

        if (req.path === "/admin-login") {
            return next();
        }

        if (!token) {
            return res.redirect("/admin-login?msg=Token%20not%20provided");
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            if (decoded.role !== 'admin') {
                return res.redirect("/admin-login?msg=Unauthorized");
            }

            req.admin = decoded;
            next();
        } catch (error) {
            console.error("Token verification error:", error.message);
            return res.redirect("/admin-login?msg=Session%20expired");
        }
    } else {
        next();
    }
};
