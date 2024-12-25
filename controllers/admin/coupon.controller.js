import Coupon from "../../models/coupon.model.js"


// Rendre Coupons Page
export const renderCouponsPage = async (req, res) => {
    const { page = 1, type = "all" } = req.query; 
    const limit = 4;
    
    try {
        const totalCouponsQuery = type === "all" ? {} : { type }; 
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
            selectedType: type || "",
            msg: msg ? { text: msg, type } : null
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error rendering coupons page.");
    }
};


// // Render Add Coupon Page
// export const renderAddCouponPage = async (req, res) => {
//     try {
        
//         return res.render('admin/add-coupon')
//     } catch (error) {
        
//     }
// }
// Add Coupon 
export const addCoupon = async (req, res) => {
    try {
        const { code, discountType, value, expiryDate, minPrice, maxPrice, limit } = req.body;

        const newCoupon = new Coupon({
            code,
            type: discountType,
            discountValue: value,
            expiryDate,
            minPrice,
            maxPrice,
            usageLimit: limit,
        });

        await newCoupon.save();
        return res.redirect("/admin/coupons?msg=Coupon Added Sussesful&type=success"); 
    } catch (error) {
        console.error(error);
        return res.status(500).send("Error saving the coupon.");
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
