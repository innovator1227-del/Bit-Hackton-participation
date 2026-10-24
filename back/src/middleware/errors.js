function notFound(req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested endpoint was not found.",
    },
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON.",
      },
    });
  }
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: {
        code: "IMAGE_TOO_LARGE",
        message: "Image must be 5 MB or smaller.",
      },
    });
  }
  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: {
        code: "INVALID_IMAGE_FIELD",
        message: "Attach one image using the image field.",
      },
    });
  }
  if (error.status === 404) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  }
  if (error.name === "ZodError") {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the submitted fields.",
        details: error.issues.map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      },
    });
  }
  if (error.code === "ER_DUP_ENTRY" || error.code === 11000)
    return res.status(409).json({
      error: { code: "CONFLICT", message: "That record already exists." },
    });
  console.error(error);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
}

module.exports = { notFound, errorHandler };
