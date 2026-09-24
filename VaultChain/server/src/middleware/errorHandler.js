function errorHandler(error, req, res, next) {
  const statusCode = error.status || error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(error.duplicate ? { duplicate: error.duplicate } : {}),
    ...(error.details ? { details: error.details } : {}),
  });
}

module.exports = { errorHandler };