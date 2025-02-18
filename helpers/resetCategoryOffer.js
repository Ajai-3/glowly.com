import Offer from "../models/offer.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

export const resetCategoryOffer = async () => {
    try {
        console.log("resetCategoryOffer is called");
        const currentDate = new Date();

        // Get active offers
        const activeOffers = await Offer.find({
            isDeleted: false,
            startDate: { $lte: currentDate },
        });

        console.log(`Found ${activeOffers.length} active offers`);

        // Get ONLY products that don't have any product offers
        const eligibleProducts = await Product.find({
            isDeleted: false,
            $and: [
                { productOffer: { $in: ["Not applied", null, ""] } }, // Strict check for no product offers
                { categoryOffer: { $in: ["Not applied", null, ""] } }  // Also ensure no category offers
            ]
        });

        console.log(`Found ${eligibleProducts.length} total eligible products`);

        for (const offer of activeOffers) {
            const category = await Category.findOne({ offerId: offer._id });
            if (!category) continue;

            // Filter products for this specific category
            const categoryProducts = eligibleProducts.filter(product =>
                product.categoryId.toString() === category._id.toString() &&
                product.productOffer !== "Applied"
            );

            console.log(`Processing category ${category.name}:`);
            console.log(`- Found ${categoryProducts.length} eligible products in this category`);
            console.log(`- These products have no existing offers`);

            for (const product of categoryProducts) {
                console.log(`Processing product ${product._id}:`);
                console.log(`- Current productOffer status: ${product.productOffer}`);
                console.log(`- Current categoryOffer status: ${product.categoryOffer}`);

                // Double-check before applying offer
                if (product.productOffer === "Applied") {
                    console.log(`- Skipping: Product already has an offer`);
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
                product.productOffer = "Not applied"; // Ensure product offer remains not applied

                await product.save();
                console.log(`- Successfully applied category offer to product ${product._id}`);
            }
        }

        // Handle expired offers
        const expiredOffers = await Offer.find({
            isActive: true,
            endDate: { $lte: currentDate },
        });

        console.log(`Expiring ${expiredOffers.length} offers...`);

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

            console.log(`Resetting ${products.length} products from expired offer ${offer._id}`);

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
