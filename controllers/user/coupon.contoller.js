import Coupon from "../../models/coupon.model.js"


export const myCoupons = async (req, res, next) => {
  try {
    let { user, cart, brands, cartCount, token, categories } = req;

    let coupons = await Coupon.find({ isDelete: false });


    if (!token) {
      return res.redirect("/home");
    }

    return res.render("user/my-coupons", {
      user,
      name: user ? user.name : "",
      cartCount,
      coupons,
      brands,
      categories,
    });
  } catch (error) {
    console.log("Error in my coupons:", error);
    next({ statusCode: 500, message: error.message });
  }
};
