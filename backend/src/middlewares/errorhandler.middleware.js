const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(", ")}`;
  } else if (err.name === "ValidationError" && err.errors && !err.statusCode) {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = "Validation failed";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === "MulterError") {
    statusCode = 400;
  }

  const isProd = process.env.NODE_ENV === "production";
  if (statusCode >= 500) {
    console.error(err);
    if (isProd) {
      message = "Internal Server Error";
      errors = [];
    }
  }

  const response = { success: false, message, errors };
  if (!isProd) response.stack = err.stack;

  res.status(statusCode).json(response);
};

export default errorHandler;