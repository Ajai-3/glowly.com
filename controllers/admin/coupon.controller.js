import cron from "node-cron";
import Coupon from "../../models/coupon.model.js"


// Rendre Coupons Page
export const renderCouponsPage = async (req, res) => {
    const { page = 1, type = "all", isActive = "all" } = req.query; 
    const limit = 7;
    
    try {
        const totalCouponsQuery = {};
        if (type !== "all") totalCouponsQuery.type = type;
        if (isActive !== "all") totalCouponsQuery.isActive = isActive === "true";
        
        const totalCoupons = await Coupon.countDocuments(totalCouponsQuery);  

        const coupons = await Coupon.find(totalCouponsQuery)  
            .sort({ created_at: -1 }) 
            .skip((page - 1) * limit)
            .limit(limit); 
           
        const totalPages = Math.ceil(totalCoupons / limit); 
        const discountTypes = await Coupon.distinct('type');

        const msg = req.query.msg || null;

        return res.render("admin/coupons", {
            coupons,
            discountTypes,
            msg: null,
            currentPage: parseInt(page, 10),
            totalPages,
            selectedType: type,
            selectedStatus: isActive
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error rendering coupons page.");
    }
};

// Add Coupon 
export const addCoupon = async (req, res) => {
    try {
        const { code, discountType, value, limit, minPrice, maxPrice, startDate, expiryDate } = req.body;

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

        return res.status(201).json({
            success: true,
            message: 'Coupon added successfully!',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error saving the coupon.");
    }
};

cron.schedule('* * * * *', async () => {
    try {
        const couponsToActivate = await Coupon.find({
            startDate: { $lte: new Date() },
            isActive: false, 
            isDelete: false   
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
            isDelete: false  
        });

        if (expiredCoupons.length > 0) {
            for (const coupon of expiredCoupons) {
                coupon.isActive = false;  
                await coupon.save();
            }
        }
    } catch (error) {
        console.error('Error running cron job for coupon status update:', error);
    }
});


// Delete Coupon
export const removeCoupon = async (req, res) => {
    try {
        const { id } = req.body; 
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        coupon.isDelete = true;

        await coupon.save(); 
        return res.status(200).json({ success: true, message: "Coupon deleted successfully." }); 
    } catch (error) {
        console.error("Error in deleting coupon", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Restore Coupon
export const restoreCoupon = async (req, res) => {
    try {
        const { id } = req.body; 
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        coupon.isDelete = false;

        await coupon.save(); 
        return res.status(200).json({ success: true, message: "Coupon restored successfully." }); 
    } catch (error) {
        console.error("Error in restoring coupon", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Render Add Coupon Page
export const renderEditCouponPage = async (req, res) => {
    try {
        
        return res.render('admin/edit-coupon')
    } catch (error) {
        
    }
}
// Add Coupon Page
export const editCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find()

        return res.render("admin/edit-coupon", { coupons })
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error rendering add coupons page.");
    }
}
