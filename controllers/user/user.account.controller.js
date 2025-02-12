import jwt from "jsonwebtoken";
import User from "../../models/user.model.js";
import Address from "../../models/address.model.js";

// ========================================================================================
// RENDER MY ACCOUNT PAGE
// ========================================================================================
// Renders the user's account page, displaying personal details, order history, and
// account settings.
// ========================================================================================
export const renderMyAccountPage = async (req, res) => {
  try {
    const { user, token, brands, cartCount, categories } = req;

    if (!token) {
      return res.redirect("/home");
    }

    const activeUser = await User.findById({ _id: user.userId });

    return res.render("user/my-account", {
      name: user ? user.name : "",
      user: user,
      categories,
      brands,
      activeUser,
      cartCount,
    });
  } catch (error) {
    console.error("Error in rendering my account", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// HANDLE PROFILE UPDATE
// ========================================================================================
// Processes the update of the user's profile, including updating personal details like
// name, email, and date of birth.
// ========================================================================================
export const handleProfileUpdate = async (req, res) => {
  try {
    const { user } = req;

    const { name, dateOfBirth, phone_no } = req.body;
    const updatedData = { name, dateOfBirth, phone_no };

    if (req.file) {
      updatedData.profilePic = `/uploads/profile-pics/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(user.userId, updatedData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).send("User not found");
    }

    const newToken = jwt.sign(
      {
        userId: updatedUser._id,
        name: updatedUser.name,
        profilePic: updatedUser.profilePic || null,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.cookie("token", newToken, { httpOnly: true, secure: true });

    res.redirect("/my-account");
  } catch (error) {
    console.log("Error in update profile", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// RENDER MANAGE ADDRESS PAGE
// ========================================================================================
// Renders the page where users can view, add, update, or delete their shipping addresses.
// ========================================================================================
export const renderManageAddressPage = async (req, res) => {
  try {
    const { user, token, brands, cartCount, categories } = req;

    if (!token) {
      return res.redirect("/home");
    }

    const addresses = await Address.find({
      user_id: user.userId,
      isActive: true,
    });

    return res.render("user/manage-address", {
      name: user ? user.name : "",
      user: user,
      brands,
      categories,
      cartCount,
      addresses: addresses,
      activeUser: user,
    });
  } catch (error) {
    console.error("Error in rendering my account", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// HANDLE ADD ADDRESS
// ========================================================================================
// Processes the addition of a new shipping address for the user, saving it to their account.
// ========================================================================================
export const handleAddAddress = async (req, res) => {
  try {
    const { user, token, brands, cartCount, categories } = req;
    if (!token) {
      return res.redirect("/home");
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
      alternative_phone_no,
      alternative_email,
    } = req.body;


    const activeUser = await User.findById(user.userId);
    if (!activeUser) {
      return res.status(404).send("User not found");
    }

    const addressCount = await Address.countDocuments({
      user_id: user.userId,
      isActive: true,
    });
    if (addressCount >= 3) {
      return res.render("user/manage-address", {
        name: user ? user.name : "",
        user: user,
        categories,
        activeUser,
        cartCount,
        addresses: await Address.find({ user_id: user.userId, isActive: true }),
        error: "You have reached the maximum number of active addresses.",
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
      isActive: true,
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
      isActive: true,
    });

    await newAddress.save();

    const addresses = await Address.find({
      user_id: user.userId,
      isActive: true,
    });

    return res.render("user/manage-address", {
      name: user ? user.name : "",
      user: user,
      categories,
      brands,
      activeUser,
      cartCount,
      addresses: addresses,
    });
  } catch (error) {
    console.error("Error in adding new address", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
//  ADDRESS REMOVED
// ========================================================================================
// The functionality for adding a new shipping address has been removed.
// ========================================================================================
export const removeAddress = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized access. Please log in." });
    }

    const addressId = req.params.addressId;

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({ message: "Address deactivated successfully" });
  } catch (error) {
    console.error("Error in removing address:", error);
    res.status(500).json({ message: "Error deactivating address", error });
  }
};

// ========================================================================================
// RENDER EDIT ADDRESS PAGE
// ========================================================================================
// Processes the editing of an existing shipping address for the user on the address page.
// ========================================================================================
export const editAddressPage = async (req, res) => {
  try {
    const { user, token, brands, cartCount, categories } = req;
    if (!token) {
      return res.redirect("/home");
    }
    const { id } = req.params;

    const address = await Address.findById(id);

    if (!address) {
      return res.status(404).send("Address not found");
    }

    return res.render("user/edit-address.ejs", {
      cartCount,
      categories,
      address,
      user,
      brands,
    });
  } catch (error) {
    console.error("Error in edit address Page", error);
    return res.redirect("user/page-404");
  }
};

// ========================================================================================
// UPDATE ADDRESS
// ========================================================================================
// Processes the update of an existing shipping address for the user.
// ========================================================================================
export const updateAddress = async (req, res) => {
  try {
    const { city, district, state, country, address, pin_code } = req.body;
    const { addressId } = req.params;

    const existingAddress = await Address.findOne({
      user_id: req.user.userId,
      city,
      district,
      state,
      country,
      address,
      pin_code,
      _id: { $ne: addressId }, 
    });

    if (existingAddress) {
      return res.status(400).json({ message: "This address already exists" });
    }

    const updatedAddress = await Address.findByIdAndUpdate(addressId, req.body, {
      new: true,
    });

    if (!updatedAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({ message: "Address updated successfully" });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Server error" });
  }
};
