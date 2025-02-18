import Offer from "../models/offer.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

export const resetCategoryOffer = async () => {
    try {
        const currentDate = new Date();

        // Get active offers
        const activeOffers = await Offer.find({
            isDeleted: false,
            startDate: { $lte: currentDate },
        });

        const eligibleProducts = await Product.find({
            isDeleted: false,
            $and: [
                { productOffer: { $in: ["Not applied", null, ""] } }, 
                { categoryOffer: { $in: ["Not applied", null, ""] } }  
            ]
        });

        console.log(`Found ${eligibleProducts.length} total eligible products`);

        for (const offer of activeOffers) {
            const category = await Category.findOne({ offerId: offer._id });
            if (!category) continue;

            const categoryProducts = eligibleProducts.filter(product =>
                product.categoryId.toString() === category._id.toString() &&
                product.productOffer !== "Applied"
            );

            for (const product of categoryProducts) {

                // Double-check before applying offer
                if (product.productOffer === "Applied") {
                    continue;
                }

                // Store original prices and apply new prices
                for (const variant of product.variants) {
                    // Store original price if not already stored
                    if (!variant.salePriceBeforeOffer) {
                        variant.salePriceBeforeOffer = variant.salePrice;
                    }

                    const maxDiscountPercentage = 70;
                    const maxDiscountValue = (maxDiscountPercentage / 100) * variant.regularPrice;
                    let newSalePrice = variant.regularPrice;

                    if (offer.offerType === "flat") {
                        const appliedDiscount = Math.min(offer.offerValue, maxDiscountValue);
                        newSalePrice = Math.max(variant.regularPrice - appliedDiscount, 0);
                    } else if (offer.offerType === "percentage") {
                        const appliedDiscount = Math.min(
                            variant.regularPrice * (offer.offerValue / 100),
                            maxDiscountValue
                        );
                        newSalePrice = Math.max(variant.regularPrice - appliedDiscount, 0);
                    }

                    variant.salePrice = Math.round(newSalePrice);
                }

                // Mark with category offer ONLY
                product.categoryOffer = "Applied";
                product.productOffer = "Not applied";

                await product.save();
            }
        }

        // Handle expired offers
        const expiredOffers = await Offer.find({
            isActive: true,
            endDate: { $lte: currentDate },
        });

        if (expiredOffers.length > 0) {
            await Offer.updateMany(
                { _id: { $in: expiredOffers.map((o) => o._id) } },
                { $set: { isActive: false, isDeleted: true } }
            );
        }

        for (const offer of expiredOffers) {
            const category = await Category.findOne({ offerId: offer._id });
            if (!category) continue;

            // Filter products based on categoryId for expired offers
            let products = eligibleProducts.filter((product) => product.categoryId.toString() === category._id.toString());

            for (const product of products) {
                for (const variant of product.variants) {
                    if (variant.salePriceBeforeOffer) {
                        variant.salePrice = variant.salePriceBeforeOffer;
                        variant.salePriceBeforeOffer = null;
                    }
                }

                await product.save();
            }
        }

    } catch (error) {
        console.error("Error in resetCategoryOffer function:", error);
    }
};
