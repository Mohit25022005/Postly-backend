const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("[AUTH] Raw header:", authHeader);

  // Robust: Check for "Bearer " prefix explicitly
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[AUTH] Missing or invalid Authorization header");
    return res.status(401).json({
      data: null,
      meta: null,
      error: { message: "Unauthorized" },
    });
  }

  const token = authHeader.slice(7); // "Bearer " = 7 chars
  console.log("[AUTH] Token extracted:", token ? `${token.substring(0, 20)}...` : "null");
  console.log("[AUTH] JWT_SECRET set:", !!process.env.JWT_SECRET, process.env.JWT_SECRET ? `(length: ${process.env.JWT_SECRET.length})` : "");

  if (!token) {
    console.log("[AUTH] No token found after Bearer prefix");
    return res.status(401).json({
      data: null,
      meta: null,
      error: { message: "Unauthorized" },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[AUTH] Token verified, user:", decoded.id || decoded.sub);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("[AUTH] Token verification failed:", err.message);
    res.status(401).json({
      data: null,
      meta: null,
      error: { message: "Invalid or expired token" },
    });
  }
};
