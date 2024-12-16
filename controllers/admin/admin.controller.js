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
// Rendre Users Page
export const renderUsersPage = (req, res) => {
    return res.render("admin/users")
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
    if (email === process.env.ADMIN_EMAIL && password === ADMIN_PASSWORD && role === 'admin') {
        const users = await User.find();
        return res.render('admin/users', { users })
     }
   } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).send("An error occurred while fetching users.");
   }
}
