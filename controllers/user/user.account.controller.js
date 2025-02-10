import jwt from "jsonwebtoken"
import Cart from "../../models/cart.model.js"
import User from "../../models/user.model.js"
import Address from "../../models/address.model.js";
import Category from "../../models/category.model.js";


export const renderMyAccountPage = async (req, res, next) => {
    try {
        const { user, token, brands, cartCount, categories } = req;
        
        if (!token) {
            return res.redirect('/home')
        }
       
        
        const activeUser = await User.findById({ _id: user.userId })    
             
      return res.render("user/my-account", {
        name: user ? user.name : "",
        user: user,
        categories,
        brands,
        activeUser,
        cartCount
      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        next({ statusCode: 500, message: error.message });
    }
}

// Update Profile
export const handleProfileUpdate = async (req, res, next) => {
    try {
        const { user } = req; 

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
        next({ statusCode: 500, message: error.message });
    }
};



export const renderManageAddressPage = async (req, res, next) => {
    try {
        const { user, token, brands, cartCount, categories } = req;

        if (!token) {
            return res.redirect('/home')
        }     
             
        const addresses = await Address.find({ user_id: user.userId, isActive: true });

      return res.render("user/manage-address", {
        name: user ? user.name : "",
        user: user,
        brands,
        categories,
        cartCount,
        addresses: addresses,
        activeUser: user

      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        next({ statusCode: 500, message: error.message });
    }
}


// Add New Address
export const handleAddAddress = async (req, res) => {
    try {
        const { user, token, brands, cartCount, categories } = req;
        if (!token) {
            return res.redirect('/home')
        }

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
                cartCount,
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
            brands,
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
        const { user } = req;

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








export const editAddressPage = async (req, res) => {
    try {
        const { user, token, brands, cartCount, categories } = req;
        if (!token) {
            return res.redirect('/home')
        }
        const { id } = req.params;
        console.log(id);
        const address = await Address.findById(id);

        if (!address) {
            return res.status(404).send('Address not found');
        }

        return res.render("user/edit-address.ejs", { 
            cartCount, 
            categories,
            address,
            user,
            brands
        });
    } catch (error) {
        console.error("Error in edit address Page", error);
        return res.status(500).send('Internal Server Error');
    }
};











  // Update address
export const updateAddress = async (req, res) => {
    try {
        console.log(req.body)
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