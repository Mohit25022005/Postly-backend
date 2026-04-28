module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const fields = {};

    result.error.issues.forEach((issue) => {
      const key = issue.path.join(".") || "body";
      fields[key] = issue.message;
    });

    return res.status(400).json({
      data: null,
      error: {
        message: "Validation failed",
        fields,
      },
    });
  }

  req.body = result.data;
  next();
};
