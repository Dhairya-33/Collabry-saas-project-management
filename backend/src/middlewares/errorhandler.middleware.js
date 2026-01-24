const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  if (!(err instanceof Error)) {
    statusCode = 500;
    message = "Unknown error occurred";
  }

  const response = {
    success: false,
    message,
    errors,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }
  console.log(response)
  res.status(statusCode).json(response);
};

export default errorHandler;
