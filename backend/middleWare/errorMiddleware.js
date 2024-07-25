const errorHandler = (err, req, res, next) => {
    // If the response status code is not already set, default to 500
    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode);

    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : null
    });
};

module.exports = errorHandler;
