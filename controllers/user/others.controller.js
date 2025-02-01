


export const helpPage = async (req, res, next) => {
    try {

        res.render("user/help", {
            user: req.user,
            categories: req.categories,
            cartCount: req.cartCount
        });
    } catch (error) {
        console.error("Error loading help page:", error);
        next({ statusCode: 500, message: error.message });
    }
}