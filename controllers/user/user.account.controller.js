import jwt from "jsonwebtoken"
import Cart from "../../models/cart.model.js"
import User from "../../models/user.model.js"
import Address from "../../models/address.model.js";
import Category from "../../models/category.model.js";


export const renderMyAccountPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        let cart;
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
            cart = await Cart.findOne({ user_id: user.userId })
        }  
        
        if (!token) {
            return res.redirect('/home')
        }
       
        
        const activeUser = await User.findById({ _id: user.userId })
        //  console.log(activeUser)
        //  console.log(user)
       
        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const cartCount = cart?.products?.length || 0;
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
      return res.render("user/my-account", {
        name: user ? user.name : "",
        user: user,
        categories,
        activeUser,
        cartCount
      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        return res.status(500).send("Error in my account")
    }
}

// Update Profile
export const handleProfileUpdate = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  

        const { name, dateOfBirth, phone_no } = req.body;
        const updatedData = { name, dateOfBirth, phone_no };

        if (req.file) {
            updatedData.profilePic = `/uploads/profile-pics/${req.file.filename}`;
        }

        const updatedUser = await User.findByIdAndUpdate(
            user.userId,
            updatedData,
            { new: true }
        );
        // console.log(req.body)
        // console.log(updatedUser)

        if (!updatedUser) {
            return res.status(404).send("User not found");
        }

        const newToken = jwt.sign(
            { userId: updatedUser._id, name: updatedUser.name, profilePic: updatedUser.profilePic || null  },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' } 
        );

        // Set the new token as a cookie
        res.cookie('token', newToken, { httpOnly: true, secure: true });

        res.redirect('/my-account');
    } catch (error) {
        console.log("Error in update profile", error);
        return res.status(500).send("Error in update profile");
    }
};


// export const removeProfilePicture = async (req, res) => {
//     try {
//         const token = req.cookies.token;
//         let user = null; 
//         if (token) {
//             const decoded = jwt.decode(token);
//             user = decoded; 
//         }  
//         const userId = user.userId
//         const activeUser = await User.findById(userId); 

//         if (!activeUser || !activeUser.profilePic) {
//             return res.status(400).send("No profile picture to remove.");
//         }


//         activeUser.profilePic = null;
//         await activeUser.save();

//         res.status(200).send("Profile picture removed successfully.");
//     } catch (error) {
//         console.error("Error removing profile picture from the database:", error);
//         res.status(500).send("Error removing profile picture.");
//     }
// };



export const renderManageAddressPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        let cart;
        
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
            cart = await Cart.findOne({ user_id: user.userId })
        }  

        if (!token) {
            return res.redirect('/home')
        }
       
        const activeUser = await User.findById(user.userId)

        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const cartCount = cart?.products?.length || 0;
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
        const addresses = await Address.find({ user_id: user.userId, isActive: true });

      return res.render("user/manage-address", {
        name: user ? user.name : "",
        user: user,
        categories,
        cartCount,
        addresses: addresses,
        activeUser

      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        return res.status(500).send("Error in my account")
    }
}


// Add New Address
export const handleAddAddress = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null;
        let cart = null;
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded;
            cart = await Cart.findOne({ user_id: user.userId })
        }

        // const userPhoneNo = await User.findById(user.userId)

        const cartCount = cart?.products?.length || 0;

        const categories = await Category.find({ isListed: true })
            .populate({
                path: 'subcategories',
                match: { isListed: true },
            });

        const {
            city,
            district,
            state,
            country,
            address,
            pin_code,
            address_type,
            land_mark,
            phone_no,
            alternative_phone_no,
            alternative_email
        } = req.body;

        const activeUser = await User.findById(user.userId);
        if (!activeUser) {
            return res.status(404).send("User not found");
        }

        const addressCount = await Address.countDocuments({ user_id: user.userId, isActive: true });
        if (addressCount >= 4) {
            return res.render("user/manage-address", {
                name: user ? user.name : "",
                user: user,
                categories,
                activeUser,
                addresses: await Address.find({ user_id: user.userId, isActive: true }),
                error: "You have reached the maximum number of active addresses."
            });
        }

        const existingAddress = await Address.findOne({
            user_id: user.userId,
            city,
            district,
            state,
            country,
            address,
            pin_code,
            address_type,
            isActive: true
        });

        if (existingAddress) {
            return res.redirect("/manage-address");
        }

        const newAddress = new Address({
            user_id: user.userId,
            city,
            district,
            state,
            country,
            address,
            pin_code,
            address_type,
            land_mark,
            alternative_phone_no,
            alternative_email,
            isActive: true
        });

        await newAddress.save();

        const addresses = await Address.find({ user_id: user.userId, isActive: true });

        return res.render("user/manage-address", {
            name: user ? user.name : "",
            user: user,
            categories,
            activeUser,
            cartCount,
            addresses: addresses
        });

    } catch (error) {
        console.error("Error in adding new address", error);
        return res.status(500).send("Error in adding new address");
    }
};



// Remove Address
export const removeAddress = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null;
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded;
        }

        if (!user) {
            return res.status(401).json({ message: "Unauthorized access. Please log in." });
        }

        const addressId = req.params.addressId;

        const updatedAddress = await Address.findByIdAndUpdate(
            addressId,
            { $set: { isActive: false } },
            { new: true }
        );

        if (!updatedAddress) {
            return res.status(404).json({ message: 'Address not found' });
        }

        res.status(200).json({ message: 'Address deactivated successfully' });
        
    } catch (error) {
        console.error("Error in removing address:", error);
        res.status(500).json({ message: 'Error deactivating address', error });
    }
};



















export const getAddress = async (req, res) => {
    try {

      const address = await Address.findById(req.params.addressId);
      console.log(address)
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }
      res.status(200).json(address);
    } catch (error) {
      console.error('Error fetching address:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Update address
export const updateAddress = async (req, res) => {
    try {
      const updatedAddress = await Address.findByIdAndUpdate(
        req.params.addressId,
        req.body,
        { new: true }
      );
  
      if (!updatedAddress) {
        return res.status(404).json({ message: 'Address not found' });
      }
  
      res.status(200).json({ message: 'Address updated successfully' });
    } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };