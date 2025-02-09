


export const helpPage = async (req, res, next) => {
    try {

        res.render("user/help", {
            user: req.user
        });
    } catch (error) {
        console.error("Error loading help page:", error);
        next({ statusCode: 500, message: error.message });
    }
}


export const getAppPage = async (req, res, next) => {
    try {

        res.render("user/get-app", {
            user: req.user,
            categories: req.categories,
            brands: req.brands,
            cartCount: req.cartCount 
        });
    } catch (error) {
        console.error("Error loading get app page:", error);
        next({ statusCode: 500, message: error.message });
    }
}