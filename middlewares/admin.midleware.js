
export const pageMiddlware = (req, res, next) => {
    res.locals.currentPath = req.path;
    next();
}  

export const adminAuthMiddleware = (req, res, next) => {
    if (!req.session.admin) {
        return res.redirect('/admin-login'); // Redirect non-logged-in users to login page
    }
    next(); // Allow the request to continue if admin is logged in
};
