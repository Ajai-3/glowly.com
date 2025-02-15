

// ========================================================================================
// SHARE & EARN PAGE CONTROLLER
// ========================================================================================
// Renders the "Share & Earn" page where users can invite others, earn rewards, 
// and track their referral bonuses.
// ========================================================================================
export const shareAndEarn = async (req, res) => {
    try {
        const { user, brands, token, wallet, cartCount, categories } = req;
        return res.render("user/shareAndEarn", {
            user,
            name: user ? user.name : "",
            cartCount,
            wallet,
            brands,
            categories,
        });
    } catch (error) {
        console.error("Error rendering Share & Earn page:", error);
        res.status(500).send("Internal Server Error");
    }
};
