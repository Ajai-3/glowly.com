import Review from "../../models/review.model.js";
import Product from "../../models/product.model.js";
import { StatusCodes } from "../../helpers/StatusCodes.js";

// ========================================================================================
// ADD REVIEW
// ========================================================================================
// Allows users to add a review for a product, including rating and comment, which is
// stored and displayed on the product page.
// ========================================================================================
export const review = async (req, res) => {
  try {
    const { user } = req;
    const { productId, variantId, orderId, rating, review } = req.body;

    if (!productId || !variantId || !rating || !review) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Product ID, Variant ID, rating, and review are required.",
      });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Rating must be between 1 and 5." });
    }

    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
    }

    const variant = product.variants.find(
      (variant) => variant._id.toString() === variantId
    );

    if (!variant) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Variant not found" });
    }

    const newReview = new Review({
      userId: user.userId,
      productId,
      variantId,
      orderId,
      variantShade: variant.shade,
      rating,
      review,
      edited: false,
      verified: orderId ? true : false,
      createdAt: new Date(),
    });

    const savedReview = await newReview.save();

    const reviews = await Review.find({ productId });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const newAverageRating = totalRating / reviews.length;

    product.rating = newAverageRating;
    product.reviewCount += 1;
    await product.save();

    return res
      .status(StatusCodes.CREATED)
      .json({ message: "Review submitted successfully!", review: savedReview });
  } catch (error) {
    console.error("Error in submitting review", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// EDIT REVIEW
// ========================================================================================
// Allows users to edit an existing review for a product, updating the rating and comment
// in the system.
// ========================================================================================
export const editReview = async (req, res) => {
  try {
    const { user } = req;
    const { productId, variantId, orderId, rating, review } = req.body;
    const reviewId = req.params.reviewId;

    if (!productId || !variantId || !rating || !review) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Product ID, Variant ID, rating, and review are required.",
      });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Rating must be between 1 and 5." });
    }

    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Product not found" });
    }

    const variant = product.variants.find(
      (variant) => variant._id.toString() === variantId
    );

    if (!variant) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Variant not found" });
    }

    const existingReview = await Review.findOne({ _id: reviewId });

    if (!existingReview) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Review not found" });
    }

    if (existingReview.userId.toString() !== user.userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    existingReview.rating = rating;
    existingReview.review = review;
    existingReview.edited = true;
    existingReview.verified = orderId ? true : false;
    existingReview.createdAt = new Date();
    existingReview.save();

    return res
      .status(StatusCodes.CREATED)
      .json({ success: true, message: "Review edited successfully!" });
  } catch (error) {
    console.error("Error in submitting review", error);
    return res.redirect("user/page-404");
  }
};
