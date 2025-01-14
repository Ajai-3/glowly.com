import User from "../../models/user.model.js";


export const renderUsersPage = async (req, res) => {
    try {
        const msg = req.query.msg ? { text: req.query.msg, type: req.query.type } : null;

        const perPage = 9; 
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || 'all';

        const query = { role: 'user' };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { $expr: { $regexMatch: { input: { $toString: "$phone_no" }, regex: search, options: "i" } } }
            ];
        }

        if (status === 'block') {
            query.status = 'blocked'; 
        } else if (status === 'unblock') {
            query.status = 'active'; 
        }

        const totalUsers = await User.countDocuments(query);

        const users = await User.find(query)
            .sort({created_at: -1})
            .skip((page - 1) * perPage)
            .limit(perPage);

        const totalPages = Math.ceil(totalUsers / perPage);

        return res.render('admin/users', { 
            users, 
            currentPage: page, 
            totalPages, 
            perPage, 
            search, 
            status,
            msg,
            queryParams: `search=${search}&status=${status}` 
        });

    } catch (error) {
        console.error("Error rendering users page:", error);
        res.status(500).send("An error occurred while rendering the users page.");
    }
};



// Block User
export const blockUser = async (req, res) => {
    const userId = req.body.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        user.status = "blocked";
        await user.save();

        return res.status(200).json({
            success: true,
            message: "User has been successfully blocked.",
        });
    } catch (error) {
        console.error("Error in blocking user:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while blocking the user.",
        });
    }
};


// Unblock User
export const unBlockUser = async (req, res) => {
    const userId = req.body.id;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        user.status = "active";
        await user.save();

        return res.status(200).json({
            success: true,
            message: "User has been successfully unblocked.",
        });
    } catch (error) {
        console.error("Error in unblocking user:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while unblocking the user.",
        });
    }
};





export const checkUserStatus = async (req, res) => {
    const userId = req.userId; 

    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        const user = await User.findById(userId);  
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ status: user.status });
    } catch (error) {
        console.error('Error checking user status:', error);
        res.status(500).json({ message: 'Error checking user status' });
    }
};
