export const notFoundHandler = (req, res) => {
    res.status(404).render('user/page-404', {
        statusCode: 404,
        message: 'Oops! This page has vanished, but our stunning cosmetics collection is still here for you.',
    });
};

export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Something went wrong';
    console.error("Error:", message);


    res.status(statusCode).render('user/page-404', {
        statusCode: statusCode,
        message: "Oops! Something went wrong on our end. We're working to fix it. Please try again later.",
    });
};