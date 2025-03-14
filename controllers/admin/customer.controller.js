import User from "../../models/user.model.js";
import { StatusCodes } from "../../helpers/StatusCodes.js";

// ========================================================================================
// RENDER USERS PAGE
// ========================================================================================
// This function renders the "Users" page for admins, allowing them to view, search,
// and take actions on users within the system.
// ========================================================================================
export const renderUsersPage = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.admin.id, role: "admin" });
    const msg = req.query.msg
      ? { text: req.query.msg, type: req.query.type }
      : null;

    const perPage = 10;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const status = req.query.status || "all";

    const query = { role: "user" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$phone_no" },
              regex: search,
              options: "i",
            },
          },
        },
      ];
    }

    if (status === "block") {
      query.status = "blocked";
    } else if (status === "unblock") {
      query.status = "active";
    }

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalPages = Math.ceil(totalUsers / perPage);

    return res.render("admin/users", {
      users,
      currentPage: page,
      totalPages,
      perPage,
      search,
      status,
      msg,
      admin,
      queryParams: `search=${search}&status=${status}`,
    });
  } catch (error) {
    console.error("Error rendering users page:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("An error occurred while rendering the users page.");
  }
};

// ========================================================================================
// BLOCK USER
// ========================================================================================
// This function allows admins to block a user, preventing them from accessing the system
// by marking their account as blocked or inactive.
// ========================================================================================
export const blockUser = async (req, res) => {
  const userId = req.body.id;

  if (!userId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: "User ID is required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found." });
    }

    user.status = "blocked";
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User has been successfully blocked.",
    });
  } catch (error) {
    console.error("Error in blocking user:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while blocking the user.",
    });
  }
};

// ========================================================================================
// UNBLOCK USER
// ========================================================================================
// This function allows admins to unblock a previously blocked user, restoring their
// access to the system by marking their account as active again.
// ========================================================================================
export const unBlockUser = async (req, res) => {
  const userId = req.body.id;

  if (!userId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ success: false, message: "User ID is required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: "User not found." });
    }

    user.status = "active";
    await user.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "User has been successfully unblocked.",
    });
  } catch (error) {
    console.error("Error in unblocking user:", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "An error occurred while unblocking the user.",
    });
  }
};
