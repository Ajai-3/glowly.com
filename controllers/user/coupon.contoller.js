import jwt from "jsonwebtoken";
import dotenv from "dotenv";dotenv.config()
import Cart from "../../models/cart.model.js";
import User from "../../models/user.model.js";
import Category from "../../models/category.model.js";

export const myCoupons = async (req, res, next) => {
  try {
    let { user, cart, cartCount, token, categories } = req;
    // const token = req.cookies.token;
    // let user;
    // let cart;
    let coupons;

    if (!token) {
      return res.redirect("/home");
    }

    // if (token) {
    //   try {
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    //     user = decoded;
    //     cart = await Cart.findOne({ user_id: user.userId });
    //   } catch (error) {
    //     console.log("Invalid or expired token:", error);
    //   }
    // }
    // const cartCount = cart?.products?.length || 0;
    // const categories = await Category.find({ isListed: true }).populate({
    //   path: "subcategories",
    //   match: { isListed: true },
    // });


    return res.render("user/my-coupons", {
      user,
      name: user ? user.name : "",
      cartCount,
      coupons,
      categories,
    });
  } catch (error) {
    console.log("Error in my coupons:", error);
    next({ statusCode: 500, message: error.message });
  }
};
