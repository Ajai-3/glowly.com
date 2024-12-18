import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../../models/user.model.js"



/////////////////////////////////////////////////////////////////////////////
//////////////////////////RENDER PAGES///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
// Render Login Page
export const renderLoginPage = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard");
    }
    const msg = '';
    res.render("admin/admin-login", { msg });
};

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
// // Rendre Users Page Wirh User Data
// export const renderUsersPage = async (req, res) => {
//     try {
//         const perPage = 8; // User Per Page
//         const page = parseInt(req.query.page) || 1

//         const totalUsers = await User.countDocuments();
//         const users = await User.find()
//                .skip((page - 1) * perPage) // Skip The Previous Pages
//                .limit(perPage); // Limit The User Count Per Page

//         const totalPages = Math.ceil(totalUsers / perPage) // To Calulate Total Pages     

//         return res.render('admin/users', { users, currentPage: page, totalPages, perPage });
//     } catch (error) {
//         console.log("Error fetching users: ", error);
//         return res.status(500).send("An error occurred while fetching users..")
//     }
// }
// Rendre Sales Report Page
export const renderSalesReportPage = (req, res) => {
    return res.render("admin/sales-report")
}
// Rendre Coupons Page
export const renderCouponsPage= (req, res) => {
    return res.render("admin/coupons")
}
// // Rendre Category Page
// export const renderCategoryPage= (req, res) => {
//     return res.render("admin/category")
// }
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
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, role: 'admin' });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true; // Set the session for admin login
                return res.redirect("/admin/dashboard"); // Redirect to dashboard after login
            } else {
                return res.render('admin/admin-login', { msg: 'Invalid credentials!' });
            }
        } else {
            return res.render('admin/admin-login', { msg: 'Admin not found!' });
        }
    } catch (error) {
        console.error("Error during admin login:", error);
        return res.status(500).send("An error occurred during login.");
    }
};

// Handle Admin Log Out
export const handleAdminLogout = async (req, res) => {
    try {
       req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session", err);
            return res.redirect("/pageerror")
        }
        res.redirect("/admin/admin-login")
       }) 
    } catch (error) {
       console.error("Unnexpected error during logout", error);
       res.redirect("/pageerror") 
    }
}

