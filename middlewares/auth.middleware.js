// Check The User Is loggined Or Not
export const isAuthenticated = (req, res, next) => {
    try {
        if (req.session.user) {
            return res.redirect("/home")
        } 
        return next();
    } catch (error) {
        console.error("Error in isAuthenticated middleware", error);
       res.redirect("/page-not-found") 
    }
}