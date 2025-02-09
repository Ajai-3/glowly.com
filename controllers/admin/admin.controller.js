import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import User from "../../models/user.model.js";

// ========================================================================================
// RENDER ADMIN LOGIN PAGE
// ========================================================================================
// This function renders the admin login page for administrators to log in to the system.
// ========================================================================================
export const renderLoginPage = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  const msg = req.query.msg || "";

  res.render("admin/admin-login", { msg });
};

// ========================================================================================
// HANDLE ADMIN LOGIN
// ========================================================================================
// This function processes the admin login request, validating the provided credentials
// and granting access to the admin dashboard upon successful login.
// ========================================================================================
export const handleAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, role: "admin" });

    if (!admin) {
      return res.render("admin/admin-login", { msg: "Admin not found!" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.render("admin/admin-login", { msg: "Invalid credentials!" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "2h" }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).send("An error occurred during login.");
  }
};

// ========================================================================================
// HANDLE ADMIN LOGOUT
// ========================================================================================
// This function processes the admin logout request, clearing the session and
// redirecting the admin to the login page, ensuring a secure log-out process.
// ========================================================================================
export const handleAdminLogout = (req, res) => {
  try {
    res.clearCookie("adminToken", { httpOnly: true, secure: false });

    return res.redirect("/admin/admin-login?msg=Logged%20out%20successfully");
  } catch (error) {
    console.error("Unexpected error during logout:", error);
    res.redirect("/pageerror");
  }
};
