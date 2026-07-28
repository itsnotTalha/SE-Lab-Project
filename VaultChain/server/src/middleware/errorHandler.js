function errorHandler(error, req, res, next) {
  const statusCode = error.status || error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
  });
}

module.exports = { errorHandler };