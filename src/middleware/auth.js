const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      data: null,
      meta: null,
      error: { message: "Unauthorized" },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      data: null,
      meta: null,
      error: { message: "Invalid or expired token" },
    });
  }
};
