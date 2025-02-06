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

        const products = await Product.find({ isDeleted: false });
        const addresses = await Address.find({ user_id: user.userId, isActive: true }).limit(3);

        const cartProducts = await Promise.all(
        cart.products
            .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
            .map(async (cartProduct) => {
            const productDetails = await Product.findById(cartProduct.product_id);
            
            if (productDetails) {
                const variantDetails = productDetails.variants.find(
                (variant) => variant._id.toString() === cartProduct.variant_id.toString() && !variant.isDeleted
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
        
        if (!token) {
            return res.redirect('user/login'); 
        }


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
            payment_status: payment_method === 'razorpay' ? 'Payment failed' : (payment_status || 'Payment completed'),
        });

        if (payment_method === 'wallet') {
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


            return res.status(201).json({ success: true, message: "Order placed successfully using wallet!", order });
        } else if (payment_method === 'razorpay') {
            
                const options = {
                    amount: grandTotal * 100, 
                    currency: "INR",
                    receipt: `receipt_${Date.now()}`,
                };

                const razorpayOrder = await razorpay.orders.create(options);
                order.razorpay_order_id = razorpayOrder.id;

                await Promise.all([
                    order.save(),
                    updateCouponUsage(coupon, user.userId),
                  ]);
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

            order.payment_status = 'Payment pending COD';
            await Promise.all([
                order.save(),
                updateCouponUsage(coupon, user.userId),
                processOrder(cart, user.userId)
              ]);

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
  
      const order = await Order.findById(orderId).populate({
        path: 'products.product_id',
        populate: {
          path: 'variants'
        }
      });
  
      if (!order) {
        console.log("[PaymentRetry] Order not found:", orderId);
        return res.status(404).json({ success: false, message: "Order not found" });
      }


      if (order.payment_status === 'Payment completed') {
        return res.status(400).json({ success: false, message: "Payment is already completed for this order" });
      }

      if (!['Payment failed', 'Payment pending COD'].includes(order.payment_status)) {
        return res.status(400).json({ 
          success: false, 
          message: "Payment retry is only available for failed or pending payments" 
        });
      }
  
      let unavailableProducts = [];
      for (const item of order.products) {
        const product = item.product_id;
        
        if (!product) {
          unavailableProducts.push('Unknown Product');
          continue;
        }
  
        if (product.variants && product.variants.length > 0) {
          const variant = product.variants.find(v => v._id.toString() === item.variant_id.toString());
          if (!variant || variant.stock < item.quantity) {
            unavailableProducts.push(product.name);
          }
        } else if (product.stock < item.quantity) {
          unavailableProducts.push(product.name);
        }
      }

      if (unavailableProducts.length > 0) {
        console.log("[PaymentRetry] Products unavailable:", unavailableProducts);
        return res.status(400).json({ 
          success: false, 
          message: `The following products are out of stock: ${unavailableProducts.join(', ')}` 
        });
      }
  
      // Create Razorpay order using the configured instance
      const amount = Math.round(order.total_order_amount * 100); 
      console.log("[PaymentRetry] Creating Razorpay order with amount:", amount);

      const options = {
        amount,
        currency: "INR",
        receipt: orderId.toString(),
        notes: {
          order_id: orderId.toString(),
          retry: "true"
        }
      };

      const razorpayOrder = await razorpay.orders.create(options);
      console.log("[PaymentRetry] Razorpay order created:", razorpayOrder.id);

      // Only update the Razorpay order ID, keep the payment status as is
      await Order.findByIdAndUpdate(orderId, {
        razorpay_order_id: razorpayOrder.id
      });
  
      // Send the order details and key to client
      res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID,
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          orderId: order._id,
          receipt: options.receipt
        }
      });
  
    } catch (error) {
      console.error("[PaymentRetry] Error:", error);
      if (error.code === 'BAD_REQUEST_ERROR') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid request to payment gateway" 
        });
      }
      next({ statusCode: 500, message: "Failed to process payment retry. Please try again." });
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

        if (!token) {
            return res.status(401).json({ success: false, message: "User not authenticated." });
        }

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


