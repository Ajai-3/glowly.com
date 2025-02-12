// ========================================================================================
// RENDER HELP PAGE
// ========================================================================================
// Renders the help page, providing users with FAQs, support contact information, and other assistance resources.
// ========================================================================================
export const helpPage = async (req, res) => {
  try {
    res.render("user/help", {
      user: req.user,
    });
  } catch (error) {
    console.error("Error loading help page:", error);
    return res.redirect("user/page-404");
  }
};
// ========================================================================================
// GET APP PAGE
// ========================================================================================
// Retrieves and renders the application page, fetching necessary data and displaying it
// to the user.
// ========================================================================================
export const getAppPage = async (req, res) => {
  try {
    res.render("user/get-app", {
      user: req.user,
      categories: req.categories,
      brands: req.brands,
      cartCount: req.cartCount,
    });
  } catch (error) {
    console.error("Error loading get app page:", error);
    return res.redirect("user/page-404");
  }
};
// ========================================================================================
// GET PRIVACY POLICY PAGE
// ========================================================================================
// Retrieves and renders the Privacy Policy page
// ========================================================================================
export const privacyPolicy = async (req, res) => {
  try {
    res.render("user/privacy", {
      user: req.user,
      categories: req.categories,
      brands: req.brands,
      cartCount: req.cartCount,
    });
  } catch (error) {
    console.error("Error loading get app page:", error);
    return res.redirect("user/page-404");
  }
};
// ========================================================================================
// GET TERMS AND CONDITIONS PAGE
// ========================================================================================
// Retrieves and renders the terms and conditions page
// ========================================================================================
export const termsAndCOnditions = async (req, res) => {
  try {
    res.render("user/terms&conditions", {
      user: req.user,
      categories: req.categories,
      brands: req.brands,
      cartCount: req.cartCount,
    });
  } catch (error) {
    console.error("Error loading get app page:", error);
    return res.redirect("user/page-404");
  }
};
