import Review from "../../models/review.model.js";
import Product from "../../models/product.model.js";

// ========================================================================================
// ADD REVIEW
// ========================================================================================
// Allows users to add a review for a product, including rating and comment, which is
// stored and displayed on the product page.
// ========================================================================================
export const review = async (req, res, next) => {
  try {
    const { user } = req;
    const { productId, variantId, orderId, rating, review } = req.body;

    if (!productId || !variantId || !rating || !review) {
      return res
        .status(400)
        .json({
          message: "Product ID, Variant ID, rating, and review are required.",
        });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5." });
    }

    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.find(
      (variant) => variant._id.toString() === variantId
    );

    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const newReview = new Review({
      userId: user.userId,
      productId,
      variantId,
      orderId,
      variantShade: variant.shade,
      rating,
      review,
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
      .status(201)
      .json({ message: "Review submitted successfully!", review: savedReview });
  } catch (error) {
    console.error("Error in submitting review", error);
    next({ statusCode: 500, message: error.message });
  }
};

// ========================================================================================
// EDIT REVIEW
// ========================================================================================
// Allows users to edit an existing review for a product, updating the rating and comment
// in the system.
// ========================================================================================
