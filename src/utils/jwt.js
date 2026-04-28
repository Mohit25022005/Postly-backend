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
  const rawToken = crypto.randomBytes(40).toString("hex");

  const hash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return {
    rawToken,
    hash,
  };
};