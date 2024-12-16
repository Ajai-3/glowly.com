// Check The User Is loggined Or Not
export const authMiddleware = (req, res, next) => {
    try {
        const isLoggedIn = req.session.user;
        if (isLoggedIn && (req.path === '/login' || req.path === '/signup' || req.path === '/forgot-password' || req.path === '/new-password' || req.path === '/otp-verification')) {
            return res.redirect('/');
        }
        if (!req.session.user && (req.path !== '/login' && req.path !== '/signup' && req.path !== '/forgot-password' && req.path !== '/new-password' && req.path !== '/otp-verification')) {
            return res.redirect("/login")
        } 
        return next();
    } catch (error) {
        console.error("Error in authMiddleware", error);
        res.redirect("/page-not-found") 
    }
}