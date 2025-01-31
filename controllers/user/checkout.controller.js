import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";dotenv.config();
import User from "../../models/user.model.js";
import Cart from "../../models/cart.model.js"; 
import Order from "../../models/order.model.js";
import razorpay from "../../config/razorpay.js";
import Wallet from "../../models/wallet.model.js";
import Coupon from "../../models/coupon.model.js";
import Address from "../../models/address.model.js";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import Transaction from "../../models/transaction.model.js";

export const renderCheckoutPage = async (req, res, next) => {
    try {
        const { user, cart, cartCount, token, categories } = req;
        if (!token) {
            return res.redirect('user/login'); 
        }
        // const token = req.cookies.token;
        

        // let user = null;
        // let cart = null;

        // try {
        //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        //     user = decoded;
        //     cart = await Cart.findOne({ user_id: user.userId });
        // } catch (error) {
        //     if (error.name === 'TokenExpiredError') {
        //         console.error('JWT expired at:', error.expiredAt);
        //         return res.redirect('/user/home');
        //     }
        //     throw error;
        // }

        
        // if (!cart) {
        //     console.log("No cart found for the user, creating a new one.");
        //     cart = new Cart({
        //         user_id: user.userId,
        //         products: [] 
        //     }); 
        // }
        // const cartCount = cart?.products?.length || 0;

        // const categories = await Category.find({ isListed: true })
        //     .populate({
        //         path: 'subcategories',
        //         match: { isListed: true },
        //     });

        const products = await Product.find({ isDeleted: false });
        const addresses = await Address.find({ user_id: user.userId, isActive: true  }).limit(3);
        // const userDetails = await User.findById(user.userId);

    
        const cartProducts = await Promise.all(
            cart.products
              .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
              .map(async (cartProduct) => {
                const productDetails = await Product.findById(cartProduct.product_id);
          
                if (productDetails) {
                  const variantDetails = productDetails.variants.find(
                    (variant) => variant._id.toString() === cartProduct.variant_id.toString()
                  );
          
                  if (variantDetails && variantDetails.stockQuantity > 0 && cartProduct.quantity <= variantDetails.stockQuantity) {
                    return {
                      ...cartProduct.toObject(),
                      product_details: productDetails,
                      variant: variantDetails
                    };
                  }
                }
                return null;
              })
          );
          
          const validCartProducts = cartProducts.filter(product => product !== null);

        if (validCartProducts.length === 0) {
            return res.redirect("/user/my-cart?message=Product+not+found&success=false");  
        }

        return res.render('user/checkout', {
            user: user,
            categories,
            addresses,
            userDetails: user,
            products,
            cartCount,
            cartProducts: validCartProducts,
        });
    } catch (error) {
        console.error("Error rendering checkout page:", error);
        next({ statusCode: 500, message: error.message });
    }
};



// Product Page Buy Now 
export const placeOrderWithBuyNow = async (req, res, next) => {
    try {
        let { user, cart, cartCount, token, categories } = req;
        const { quantity, productId, variantId } = req.query;
        

        // const token = req.cookies.token;
        if (!token) {
            return res.redirect('user/login'); 
        }
        // let user = null;
        // let cart = null;

        

        // try {
        //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        //     user = decoded;
        //     cart = await Cart.findOne({ user_id: user.userId });
        // } catch (error) {
        //     if (error.name === 'TokenExpiredError') {
        //         console.error('JWT expired at:', error.expiredAt);
        //         return res.redirect('/user/home');
        //     }
        //     throw error;
        // }

        

        // const cartCount = cart?.products?.length || 0;

        // const categories = await Category.find({ isListed: true })
        //     .populate({
        //         path: 'subcategories',
        //         match: { isListed: true },
        //     });



        if (!cart) {
            console.log("No cart found for the user, creating a new one.");
            cart = new Cart({
                user_id: user.userId,
                products: [] 
            }); 
        }

        if (!productId || !variantId || !quantity) {
            return res.status(400).json({
                success: false,
                message: "Product ID and quantity are required.",
            });
        }

        

        const products = await Product.find({ isDeleted: false });
        const addresses = await Address.find({ user_id: user.userId, 
            isActive: true }).limit(3);
        const userDetails = await User.findById(user.userId);

        const cartProduct = cart.products.find(product => product.product_id.toString() === productId);

        if (!cartProduct) {
            return res.redirect("/user/my-cart?message=Product+not+found&success=false");
        }

        const productDetails = await Product.findById(cartProduct.product_id);

        if (!productDetails) {
            return res.redirect("/user/my-cart?message=Product+not+found&success=false");
        }

        const variantDetails = productDetails.variants.find(variant => variant._id.toString() === variantId);

        if (!variantDetails || variantDetails.stockQuantity <= 0 || cartProduct.quantity > variantDetails.stockQuantity) {
            return res.redirect("/user/my-cart?message=Variant+not+available&success=false");
        }

        const cartProductsToSend = [{
            product_details: productDetails,
            variant: variantDetails,
            quantity: cartProduct.quantity
        }];

        return res.render('user/checkout', {
            user: user,
            categories,
            addresses,
            userDetails,
            products,
            cartCount,
            cartProducts: cartProductsToSend
        });

    } catch (error) {
        console.error("Error rendering checkout page:", error);
        next({ statusCode: 500, message: error.message });
    }
}






export const placeOrder = async (req, res) => {
    try {
        const { user, token } = req;
        const { address_id, cart, grandTotal, payment_method, coupon, payment_status } = req.body;

        if (!token) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        if (!address_id || !cart || !payment_method || typeof grandTotal !== 'number') {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const userData = await User.findById(user.userId);
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const address = await Address.findById(address_id);
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        const products = [];
        for (let cartItem of cart) {
            const product = await Product.findById(cartItem.product_id);
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found` });
            }

            const variant = product.variants.find(v => v._id.toString() === cartItem.variant_id);
            if (!variant || variant.stockQuantity < cartItem.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for variant` });
            }

            products.push({
                product_id: cartItem.product_id,
                variant_id: cartItem.variant_id,
                quantity: cartItem.quantity,
                amount_after_coupon: Math.round(cartItem.totalAmount - cartItem.productAfterCoupon),
                total_amount: cartItem.totalAmount,
                status: 'pending',
            });
        }

        const order = new Order({
            user_id: user.userId,
            address_id: address._id,
            products,
            total_order_amount: grandTotal,
            payment_method,
            coupon_applied: coupon || false,
            payment_status: payment_status || 'Payment pending',
        });

        if (payment_method === 'wallet') {
            // Wallet Payment Logic
            const wallet = await Wallet.findOne({ user_id: user.userId });
            if (!wallet || wallet.balance < grandTotal) {
                return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
            }

            wallet.balance -= grandTotal;
            await wallet.save();

            const transaction = new Transaction({
                wallet_id: wallet._id,
                user_id: user.userId,
                amount: grandTotal,
                type: 'Debited',
                description: "Order placed",
            });
            await transaction.save();

            order.payment_status = "Payment completed";

            await Promise.all([
                order.save(),
                updateCouponUsage(coupon, user.userId),
                processOrder(cart, user.userId)
              ]);

              
            // await order.save();
            // await updateCouponUsage(coupon, user.userId);
            // await processOrder(cart, user.userId);

            return res.status(201).json({ success: true, message: "Order placed successfully using wallet!", order });
        } else if (payment_method === 'razorpay') {
            
                const options = {
                    amount: grandTotal * 100, 
                    currency: "INR",
                    receipt: `receipt_${Date.now()}`,
                };

                const razorpayOrder = await razorpay.orders.create(options);
                order.payment_status = 'Payment failed';
                order.razorpay_order_id = razorpayOrder.id;

                await Promise.all([
                    order.save(),
                    updateCouponUsage(coupon, user.userId),
                  ]);
                  
                // await order.save();
                // await updateCouponUsage(coupon, user.userId);
                const purchasedProductIds = [];

                for (let cartItem of cart) {
                    const product = await Product.findById(cartItem.product_id);
                    if (!product) {
                        continue;
                    }

                    const variant = product.variants.find(v => v._id.toString() === cartItem.variant_id);
                    if (!variant || variant.stockQuantity < cartItem.quantity) {
                        continue;
                    }

                    purchasedProductIds.push({
                        product_id: cartItem.product_id,
                        variant_id: cartItem.variant_id,
                    });
                }

                await Cart.updateOne(
                    { user_id: user.userId },
                    { $pull: { products: { $or: purchasedProductIds } } }
                );

                return res.json({
                    order: razorpayOrder,
                    key: process.env.RAZORPAY_KEY_ID,
                });
            
        } else if (payment_method === 'cash') {

            await Promise.all([
                order.save(),
                updateCouponUsage(coupon, user.userId),
                processOrder(cart, user.userId)
              ]);
              

            // await order.save();
            // await updateCouponUsage(coupon, user.userId);
            // await processOrder(cart, user.userId);

            return res.status(201).json({ success: true, message: "Order placed successfully with cash on delivery!", order });
        } else {
            return res.status(400).json({ success: false, message: "Invalid payment method." });
        }
    } catch (error) {
        console.error("Error in place order:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};



// Payment Retry
export const paymentRetry = async (req, res, next) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required" });
      }
  
      // Find the order and populate products
      const order = await Order.findById(orderId).populate({
        path: 'products.product_id',
        populate: {
          path: 'variants'
        }
      });
  
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
  
      // Check if payment is already completed
      if (order.payment_status === 'Payment completed') {
        return res.status(400).json({ success: false, message: "Payment is already completed for this order" });
      }
  
      // Verify product availability and variants
      for (const item of order.products) {
        const product = item.product_id;
        
        // Check if product exists
        if (!product) {
          return res.status(400).json({ 
            success: false, 
            message: "One or more products in your order are no longer available" 
          });
        }
  
        // Check variant availability if product has variants
        if (product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v._id.toString() === item.variant_id.toString());
          if (!variant || variant.stock < item.quantity) {
            return res.status(400).json({ 
              success: false, 
              message: `${product.name} is out of stock or has insufficient quantity` 
            });
          }
        } else if (product.stock < item.quantity) {
          return res.status(400).json({ 
            success: false, 
            message: `${product.name} is out of stock or has insufficient quantity` 
          });
        }
      }
  
      // Create Razorpay order
      const instance = new razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET_KEY,
      });
  
      const options = {
        amount: order.total_order_amount * 100, 
        currency: "INR",
        receipt: orderId,
      };
  
      const razorpayOrder = await instance.orders.create(options);
  
      // Send the order details and key to client
      res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          orderId: order._id
        }
      });
  
    } catch (error) {
      console.error("Error in payment retry:", error);
      next({ statusCode: 500, message: error.message });
    }
  };
  


export const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid Razorpay signature." });
        }

        const order = await Order.findOne({ razorpay_order_id });
        if (order) {
            order.razorpay_payment_id = razorpay_payment_id;
            order.payment_status = 'Payment completed';

            await Promise.all([
                order.save(),
                updateCouponUsage(order.coupon, order.user_id),
                processOrder(order.products, order.user_id)
              ]);
              
            // await order.save();
            // await updateCouponUsage(order.coupon, order.user_id);
            // await processOrder(order.products, order.user_id);

            return res.status(200).json({ success: true, message: "Payment verified and order placed successfully!" });
        } else {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
    } catch (error) {
        console.error("Error in verifying Razorpay payment:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};




const processOrder = async (cart, userId) => {
    const purchasedProductIds = [];
    const updateProductPromises = [];

    for (let cartItem of cart) {
        const product = await Product.findById(cartItem.product_id);
        if (!product) {
            continue;
        }

        const variant = product.variants.find(v => v._id.toString() === cartItem.variant_id);
        if (!variant || variant.stockQuantity < cartItem.quantity) {
            continue;
        }

        variant.stockQuantity -= cartItem.quantity;
        updateProductPromises.push(product.save()); 

        purchasedProductIds.push({
            product_id: cartItem.product_id,
            variant_id: cartItem.variant_id,
        });
    }

    await Promise.all(updateProductPromises);

    await Cart.updateOne(
        { user_id: userId },
        { $pull: { products: { $or: purchasedProductIds } } }
    );
};

const updateCouponUsage = async (couponId, userId) => {
    const coupon = await Coupon.findOne({ 
        _id: couponId, 
        isDelete: false 
    });

    if (!coupon) {
        console.log("Coupon not found");
        return;
    }

    console.log("Coupon found:", coupon);

    const userCoupon = coupon.users.find(user => user.userId.toString() === userId.toString());
    console.log("User coupon found:", userCoupon);

    if (!userCoupon) {
        coupon.users.push({ userId: userId, usedCount: 1 });
        coupon.totalUsedCount++;
    } else {
        userCoupon.usedCount++;
        coupon.totalUsedCount++;
    }

    await coupon.save();
    console.log("Updated coupon:", coupon);
};





export const verifyCoupon = async (req, res) => {
    try {
        const { coupon, grandTotal } = req.body;
        let { user, cart, cartCount, token, categories } = req;

        // const token = req.cookies.token;
        // let user;

        if (!token) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

        // try {
        //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        //     user = decoded;
        // } catch (error) {
        //     console.error("Invalid token:", error);
        //     return res.status(401).json({ success: false, message: "Invalid token." });
        // }

        const getCoupon = await Coupon.findOne({ code: coupon, isDelete: false }) 

        if (getCoupon && getCoupon.isActive === false) {
            return res.status(404).json({ sucess: false, message: "This coupon has expired or is invalid." })
        }
        if (!getCoupon) {
            return res.status(404).json({ success: false, message: "This coupon has expired or is invalid." });
        }

        if (getCoupon && getCoupon.minPrice <= grandTotal && getCoupon.maxPrice >= grandTotal) {

            const userCoupon = getCoupon.users.find(user => user.userId.toString() === user.userId.toString());

            if (userCoupon && userCoupon.usedCount >= getCoupon.usageLimit) {
                return res.status(400).json({ success: false, message: "You have reached the usage limit for this coupon." });
            }

            return res.status(200).json({ 
                success: true, 
                message: "Coupon applied successfully.", 
                discountValue: getCoupon.discountValue,
                discountType: getCoupon.type,
                coupon_id: getCoupon._id
             });
        } else {
            return res.status(400).json({ success: false, message: "This coupon does not meet the requirements." });
        }

    } catch (error) {
        console.log("Error in verify coupon.", error)
    }
}






// Place Order
// export const placeOrder = async (req, res) => {
//     try {
//         let { user,  cartCount, token, categories } = req;
//         const { address_id, cart, grandTotal, payment_method, coupon } = req.body;
//         // const token = req.cookies.token;

//         if (!token) {
//             return res.status(401).json({ success: false, message: "User not authenticated." });
//         }

//         // let user;
//         // try {
//         //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//         //     user = decoded;
//         // } catch (error) {
//         //     console.error("Invalid token:", error);
//         //     return res.status(401).json({ success: false, message: "Invalid token." });
//         // }

//         if (!address_id || !cart || !payment_method || typeof grandTotal !== 'number') {
//             return res.status(400).json({ success: false, message: "Missing required fields." });
//         }

//         const userData = await User.findById(user.userId);
//         if (!userData) {
//             return res.status(404).json({ success: false, message: "User not found." });
//         }

//         const address = await Address.findById(address_id);
//         if (!address) {
//             return res.status(404).json({ success: false, message: "Address not found." });
//         }

//         const products = [];
//         for (let cartItem of cart) {
//             const product = await Product.findById(cartItem.product_id);
//             if (!product) {
//                 return res.status(404).json({ success: false, message: `Product not found` });
//             }

//             const variant = product.variants.find(v => v._id.toString() === cartItem.variant_id);
//             if (!variant || variant.stockQuantity < cartItem.quantity) {
//                 return res.status(400).json({ success: false, message: `Insufficient stock for variant` });
//             }

//             products.push({
//                 product_id: cartItem.product_id,
//                 variant_id: cartItem.variant_id,
//                 quantity: cartItem.quantity,
//                 amount_after_coupon: Math.round(cartItem.totalAmount - cartItem.productAfterCoupon),
//                 total_amount: cartItem.totalAmount,
//                 status: 'pending',
//             });
//         }

//         const order = new Order({
//             user_id: user.userId,
//             address_id: address._id,
//             products,
//             total_order_amount: grandTotal,
//             payment_method,
//             coupon_applied: coupon || false,
//         });


//         if (payment_method === 'wallet') {
//             const wallet = await Wallet.findOne({ user_id: user.userId });
//             if (!wallet || wallet.balance < grandTotal) {
//                 return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
//             }

//             wallet.balance -= grandTotal;
//             await wallet.save();

//             const transaction = new Transaction({
//                 wallet_id: wallet._id,
//                 user_id: user.userId,
//                 amount: grandTotal,
//                 type: 'debited',
//                 description :"order placed"
//             });
//             await transaction.save();

//             order.payment_status = "completed";
//             await order.save();

//             await updateCouponUsage(coupon, user.userId)
//             await processOrder(cart, user.userId);

//             return res.status(201).json({ success: true, message: "Order placed successfully using wallet!", order });
//         } else if (payment_method === 'razorpay') {
//             const options = {
//                 amount: grandTotal * 100,
//                 currency: "INR",
//                 receipt: `receipt_${Date.now()}`,
//             };
//             const orderData = await razorpay.orders.create(options);

//             order.payment_status = 'completed';
//             await order.save();
//             await updateCouponUsage(coupon, user.userId)
//             await processOrder(cart, user.userId);

//             return res.status(201).json({
//                 success: true,
//                 message: "Razorpay order created successfully!",
//                 key: process.env.RAZORPAY_KEY_ID, 
//                 order: orderData,
//             });
            
            
//         } else if (payment_method === 'cash') {
            
//             order.payment_status = 'pending';
//             await order.save();
//             await updateCouponUsage(coupon, user.userId)
//             await processOrder(cart, user.userId);

//             return res.status(201).json({ success: true, message: "Order placed successfully with cash on delivery!", order });
//         } else {
//             return res.status(400).json({ success: false, message: "Invalid payment method." });
//         }
//     } catch (error) {
//         console.error("Error in place order:", error);
//         return res.status(500).json({ success: false, message: "Internal server error." });
//     }
// };





































// export const verifyRazorPayOrderPayment = async (req, res) => {
//     try {
//         const { razorpay_order_id, razorpay_payment_id, razorpay_signature, address_id, cart, grandTotal, payment_method, coupon } = req.body;

//         console.log("Request Body:", req.body);

//         const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
//         hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
//         const generatedSignature = hmac.digest('hex');

//         if (generatedSignature === razorpay_signature) {
//             console.log("Signature verification successful");

//             const token = req.cookies.token;
//             if (!token) {
//                 console.log("No token found");
//                 return res.status(401).json({ success: false, message: "User not authenticated." });
//             }

//             let user;
//             try {
//                 const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//                 user = decoded;
//                 console.log("User decoded from token:", user);
//             } catch (error) {
//                 console.error("Invalid token:", error);
//                 return res.status(401).json({ success: false, message: "Invalid token." });
//             }

//             if (!address_id || !cart || !payment_method || typeof grandTotal !== 'number') {
//                 console.log("Missing required fields");
//                 return res.status(400).json({ success: false, message: "Missing required fields." });
//             }

//             const userData = await User.findById(user.userId);
//             if (!userData) {
//                 console.log("User not found");
//                 return res.status(404).json({ success: false, message: "User not found." });
//             }

//             const address = await Address.findById(address_id);
//             if (!address) {
//                 console.log("Address not found");
//                 return res.status(404).json({ success: false, message: "Address not found." });
//             }

//             const products = [];
//             for (let cartItem of cart) {
//                 const product = await Product.findById(cartItem.product_id);
//                 if (!product) {
//                     console.log(`Product not found: ${cartItem.product_id}`);
//                     return res.status(404).json({ success: false, message: `Product not found: ${cartItem.product_id}` });
//                 }

//                 const variant = product.variants.find(v => v._id.toString() === cartItem.variant_id);
//                 if (!variant || variant.stockQuantity < cartItem.quantity) {
//                     console.log(`Insufficient stock for variant: ${cartItem.variant_id}`);
//                     return res.status(400).json({ success: false, message: `Insufficient stock for variant: ${cartItem.variant_id}` });
//                 }

//                 // Deduct the purchased quantity from the stock
//                 variant.stockQuantity -= cartItem.quantity;
//                 await product.save();

//                 products.push({
//                     product_id: cartItem.product_id,
//                     variant_id: cartItem.variant_id,
//                     quantity: cartItem.quantity,
//                     total_amount: cartItem.totalAmount,
//                     status: 'pending',
//                 });
//             }

//             const order = new Order({
//                 user_id: user.userId,
//                 address_id: address._id,
//                 products,
//                 total_order_amount: grandTotal,
//                 payment_method,
//                 coupon_applied: coupon || false,
//             });

//             order.payment_status = 'completed';
//             await order.save();
//             await updateCouponUsage(coupon, user.userId);
//             await processOrder(cart, user.userId);

//             return res.status(200).json({
//                 success: true,
//                 message: "Payment verified and order processed successfully!",
//             });
//         } else {
//             console.log("Invalid payment signature");
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid payment signature.",
//             });
//         }
//     } catch (error) {
//         console.error("Error verifying Razorpay payment:", error);
//         return res.status(500).send("Error verifying the Razorpay payment.");
//     }
// };




















































