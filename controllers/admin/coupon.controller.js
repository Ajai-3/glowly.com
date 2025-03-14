import cron from "node-cron";
import User from "../../models/user.model.js";
import Coupon from "../../models/coupon.model.js";
import { StatusCodes } from "../../helpers/StatusCodes.js";

// ========================================================================================
// RENDER COUPONS PAGE
// ========================================================================================
// This function renders the "Coupons" page for admins, allowing them to view, search,
// and manage the list of available coupons in the system.
// ========================================================================================
export const renderCouponsPage = async (req, res) => {
  const { page = 1, type = "all", isActive = "all" } = req.query;
  const limit = 10;

  try {
    const totalCouponsQuery = {};
    if (type !== "all") totalCouponsQuery.type = type;
    if (isActive !== "all") totalCouponsQuery.isActive = isActive === "true";
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });

    const totalCoupons = await Coupon.countDocuments(totalCouponsQuery);

    const coupons = await Coupon.find(totalCouponsQuery)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(totalCoupons / limit);
    const discountTypes = await Coupon.distinct("type");

    return res.render("admin/coupons", {
      coupons,
      discountTypes,
      currentPage: parseInt(page, 10),
      totalPages,
      selectedType: type,
      selectedStatus: isActive,
      admin,
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error rendering coupons page.");
  }
};
// ========================================================================================
// ADD COUPON
// ========================================================================================
// This function allows admins to add a new coupon to the system, including details such
// as the coupon code, discount value, and applicable conditions or restrictions.
// ========================================================================================

export const addCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      value,
      limit,
      minPrice,
      maxPrice,
      startDate,
      expiryDate,
    } = req.body;

    const newCoupon = new Coupon({
      code,
      type: discountType,
      discountValue: value,
      expiryDate,
      startDate,
      minPrice,
      maxPrice,
      usageLimit: limit,
    });

    await newCoupon.save();

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Coupon added successfully!",
    });
  } catch (error) {
    console.error(error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Error saving the coupon.");
  }
};

cron.schedule("* * * * *", async () => {
  try {
    const couponsToActivate = await Coupon.find({
      startDate: { $lte: new Date() },
      isActive: false,
      isDelete: false,
    });

    if (couponsToActivate.length > 0) {
      for (const coupon of couponsToActivate) {
        coupon.isActive = true;
        await coupon.save();
      }
    }

    const expiredCoupons = await Coupon.find({
      expiryDate: { $lt: new Date() },
      isActive: true,
      isDelete: false,
    });

    if (expiredCoupons.length > 0) {
      for (const coupon of expiredCoupons) {
        coupon.isActive = false;
        await coupon.save();
      }
    }
  } catch (error) {
    console.error("Error running cron job for coupon status update:", error);
  }
});

// ========================================================================================
// DELETE COUPON (SOFT DELETE)
// ========================================================================================
// This function allows admins to soft delete a coupon, marking it as inactive without
// permanently removing it from the system, ensuring it can be restored later if needed.
// ========================================================================================
export const removeCoupon = async (req, res) => {
  try {
    const { id } = req.body;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Coupon not found" });
    }
    coupon.isDelete = true;

    await coupon.save();
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "Coupon deleted successfully." });
  } catch (error) {
    console.error("Error in deleting coupon", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};

// ========================================================================================
// RESTORE COUPON
// ========================================================================================
// This function allows admins to restore a previously soft-deleted coupon, reactivating
// it in the system so that it can be used again by customers.
// ========================================================================================

export const restoreCoupon = async (req, res) => {
  try {
    const { id } = req.body;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "Coupon not found" });
    }
    coupon.isDelete = false;

    await coupon.save();
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: "Coupon restored successfully." });
  } catch (error) {
    console.error("Error in restoring coupon", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};
