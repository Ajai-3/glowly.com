import User from "../../models/user.model.js"
import dontenv from "dotenv";dontenv.config();



/////////////////////////////////////////////////////////////////////////////
//////////////////////////RENDER PAGES///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
// Render Login Page
export const renderLoginPage = (req, res) => {
    return res.render("admin/admin-login")
}
// Rendre Dashboard Page
export const renderDashboardPage = (req, res) => {
    return res.render("admin/dashboard")
}
// Rendre Products Page
export const renderProductsPage  = (req, res) => {
    return res.render("admin/products")
}
// Rendre Add Products Page
export const renderAddProductsPage  = (req, res) => {
    return res.render("admin/add-products")
}
// Rendre Edit Products Page
export const renderEditProductsPage  = (req, res) => {
    return res.render("admin/edit-products")
}
// Rendre Orderlists Page
export const renderOrderlistsPage = (req, res) => {
    return res.render("admin/orderlists")
}
// Rendre Users Page Wirh User Data
export const renderUsersPage = async (req, res) => {
    try {
        const perPage = 8; // User Per Page
        const page = parseInt(req.query.page) || 1

        const totalUsers = await User.countDocuments();
        const users = await User.find()
               .skip((page - 1) * perPage) // Skip The Previous Pages
               .limit(perPage); // Limit The User Count Per Page

        const totalPages = Math.ceil(totalUsers / perPage) // To Calulate Total Pages     

        return res.render('admin/users', { users, currentPage: page, totalPages, perPage });
    } catch (error) {
        console.log("Error fetching users: ", error);
        return res.status(500).send("An error occurred while fetching users..")
    }
}
// Rendre Sales Report Page
export const renderSalesReportPage = (req, res) => {
    return res.render("admin/sales-report")
}
// Rendre Coupons Page
export const renderCouponsPage= (req, res) => {
    return res.render("admin/coupons")
}
// Rendre Category Page
export const renderCategoryPage= (req, res) => {
    return res.render("admin/category")
}
// Rendre Banner Management Page
export const renderBannerManagementPage= (req, res) => {
    return res.render("admin/banner-management")
}
// Rendre Settings Page
export const renderSettingsPage= (req, res) => {
    return res.render("admin/settings")
}
// Rendre Logout Page
// export const renderLogoutPage= (req, res) => {
//     return res.render("admin/logout")
// }








/////////////////////////////////////////////////////////////////////////////
//////////////////////////            ///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////

export const handleAdminLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the provided email and password match the environment variables
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            // If login is successful, render the dashboard page
            return res.render('admin/dashboard');  // Corrected path to "dashboard"
        } else {
            // If login fails, you can redirect back to login with a message or render an error page
            return res.render('admin/admin-login', { errorMessage: 'Invalid credentials!' });
        }
    } catch (error) {
        console.error("Error during admin login:", error);
        return res.status(500).send("An error occurred during login.");
    }
}

// Render User Page With User Data

