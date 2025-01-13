import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import dotenv from "dotenv";dotenv.config();
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

        if (!admin) {
            return res.render('admin/admin-login', { msg: 'Admin not found!' });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if (!passwordMatch) {
            return res.render('admin/admin-login', { msg: 'Invalid credentials!' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "2h" }
        );

        // console.log("Generated JWT Token:", token);
        // Store the token in a cookie
        res.cookie("adminToken", token, {
            httpOnly: true,
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        res.redirect("/admin/dashboard");
    } catch (error) {
        console.error("Error during admin login:", error);
        res.status(500).send("An error occurred during login.");
    }
};


// Handle Admin Log Out
export const handleAdminLogout = (req, res) => {
    try {
        // Clear the admin token cookie
        res.clearCookie("adminToken", { httpOnly: true, secure: false });
        
        return res.redirect("/admin-login?msg=Logged%20out%20successfully");
    } catch (error) {
        console.error("Unexpected error during logout:", error);
        res.redirect("/pageerror");
    }
};
