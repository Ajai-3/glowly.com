import jwt from "jsonwebtoken"
import User from "../../models/user.model.js"
import Address from "../../models/address.model.js";
import Category from "../../models/category.model.js";


export const renderMyAccountPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  
        
        if (!token) {
            return res.redirect('/home')
        }
       
        
        const activeUser = await User.findById({ _id: user.userId })
        //  console.log(activeUser)
        //  console.log(user)
       
        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
      return res.render("user/my-account", {
        name: user ? user.name : "",
        user: user,
        categories,
        activeUser

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
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  

        if (!token) {
            return res.redirect('/home')
        }
       
        const activeUser = await User.findById(user.userId)
        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
      const addresses = await Address.find({ user_id: user.userId });

      return res.render("user/manage-address", {
        name: user ? user.name : "",
        user: user,
        categories,
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
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
        }  

        
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
            alternative_phone_no,
            alternative_email
         } = req.body
        
        // console.log(req.body)

        const activeUser = await User.findById(user.userId);
        // console.log(existUser)
        if (!activeUser) {
            return res.status(404).send("User not found");
        }
        
        const addressCount = await Address.countDocuments({ user_id: user.userId });
        if (addressCount >= 3) {
            return res.render("user/manage-address", {
                name: user ? user.name : "",
                user: user,
                categories,
                activeUser,
                addresses: await Address.find({ user_id: user.userId }),
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
            address_type
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
            alternative_email
        });

        await newAddress.save();

        const addresses = await Address.find({ user_id: user.userId });

        return res.render("user/manage-address", {
            name: user ? user.name : "",
            user: user,
            categories,
            activeUser,
            addresses: addresses
    
          })  


    } catch (error) {
        console.error("Error in adding new address", error);
        return res.status(500).send("Error in adding new address");
    }
}