import Offer from "../models/offer.model.js";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

export const resetCategoryOffer = async () => {
    try {
        const currentDate = new Date();

        // Get active offers
        const activeOffers = await Offer.find({
            isActive: false,
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

        for (const offer of activeOffers) {
            const category = await Category.findOne({ offerId: offer._id });
            if (!category) continue;

            // Filter products for this specific category
            const categoryProducts = eligibleProducts.filter(product =>
                product.categoryId.toString() === category._id.toString() &&
                product.productOffer !== "Applied"
            );


            for (const product of categoryProducts) {
                if (product.productOffer === "Applied") {
                    console.log(`- Skipping: Product already has an offer`);
                    continue;
                }
                for (const variant of product.variants) {
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
