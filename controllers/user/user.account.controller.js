import jwt from "jsonwebtoken"
import User from "../../models/user.model.js"
import Category from "../../models/category.model.js";


export const renderMyAccountPage = async (req, res) => {
    try {
        const token = req.cookies.token;
        let user = null; 
        if (token) {
            const decoded = jwt.decode(token);
            user = decoded; 
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

        const { name, dateOfBirth, phoneNo } = req.body;
        const updatedData = { name, dateOfBirth, phoneNo };

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

        // Create a new token using your model
        const newToken = jwt.sign(
            { userId: updatedUser._id, name: updatedUser.name, profilePic: updatedUser.profilePic || null  },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' } // Token expiration
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


       
        // const products = await Product.find({ isDeleted: false });
        // const brands = await Brand.find({ isListed: true })
        const categories = await Category.find({ isListed: true })
        .populate({
            path: 'subcategories',
            match: { isListed: true },  
        });      
             
      return res.render("user/manage-address", {
        name: user ? user.name : "",
        user: user,
        categories

      })  
    } catch (error) {
        console.error("Error in rendering my account", error);
        return res.status(500).send("Error in my account")
    }
}