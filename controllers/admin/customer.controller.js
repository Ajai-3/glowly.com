import User from "../../models/user.model.js";


export const renderUsersPage = async (req, res) => {
    try {
        const perPage = 9; // Users per page
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const status = req.query.status || 'all';

        const query = { role: 'user' }; // Fetch only users

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { $expr: { $regexMatch: { input: { $toString: "$phone_no" }, regex: search, options: "i" } } }
            ];
        }

        // Status filter logic
        if (status === 'block') {
            query.status = 'blocked'; // Filter blocked users
        } else if (status === 'unblock') {
            query.status = 'active'; // Filter active users
        }


        // Count users for pagination - this is done with the query that includes filters
        const totalUsers = await User.countDocuments(query);

        // Fetch users with pagination - applying the filters to the query
        const users = await User.find(query)
            .sort({created_at: -1})
            .skip((page - 1) * perPage)
            .limit(perPage);

        const totalPages = Math.ceil(totalUsers / perPage);

        // Render page with the required data
        return res.render('admin/users', { 
            users, 
            currentPage: page, 
            totalPages, 
            perPage, 
            search, 
            status,
            // Optional: to pass the filters back to the view
            queryParams: `search=${search}&status=${status}` 
        });

    } catch (error) {
        console.error("Error rendering users page:", error);
        res.status(500).send("An error occurred while rendering the users page.");
    }
};



// Block User
export const blockUser = async (req, res) => {
    try {
        const userId = req.query.id;
        await User.updateOne({ _id: userId }, { $set: {status: "blocked" } })
        res.redirect('/admin/users')
    } catch (error) {
        console.error("Error in blocking:", error);
    res.status(500).send("An error occurred while updating the user status.");
    }
} 
// UnBlock User
export const unBlockUser = async (req, res) => {
    try {
        const userId = req.query.id;
        await User.updateOne({ _id: userId }, { $set: {status: "active" } })
        res.redirect('/admin/users')
    } catch (error) {
        console.error("Error in unblocking:", error);
    res.status(500).send("An error occurred while updating the user status.");
    }
} 