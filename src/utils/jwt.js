const jwt = require("jsonwebtoken");
const crypto = require("crypto");

exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

exports.generateRefreshToken = () => {
  return crypto.randomBytes(40).toString("hex");
};