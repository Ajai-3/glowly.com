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
    const msg = req.query.msg || '';
    res.render("admin/admin-login", { msg });
};

// Rendre Dashboard Page
export const renderDashboardPage = (req, res) => {
    return res.render("admin/dashboard")
}

// Rendre Orderlists Page
export const renderOrderlistsPage = (req, res) => {
    return res.render("admin/orderlists")
}

// Rendre Sales Report Page
export const renderSalesReportPage = (req, res) => {
    return res.render("admin/sales-report")
}


// Rendre Banner Management Page
export const renderBannerManagementPage= (req, res) => {
    return res.render("admin/banner-management")
}
// Rendre Settings Page
export const renderSettingsPage= (req, res) => {
    return res.render("admin/settings")
}








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
  
        delete req.session.admin;
        res.redirect("/admin/admin-login?msg=Logged%20out%20successfully")

    } catch (error) {
       console.error("Unnexpected error during logout", error);
       res.redirect("/pageerror") 
    }
}

